import * as tf from "@tensorflow/tfjs";
import type { PreparedBorrowingInterval } from "../borrowing-occupation";
import { advanceBorrowingOccupation } from "./borrowing-occupation-step";
import type { CompatiblePolicyInputs } from "../../analytical/compatible-policy";
import { assertRunSnapshot, type RunSnapshot } from "../run-configuration";
import { generateTimeGrid } from "../time-grid";
import { prepareWealthGrid } from "../prepared-grid";
import type { RandomStream } from "../random";
import { detectCeImpoverishment } from "./ce-impoverishment-bridge";
import { advanceUnconstrainedWealthStep } from "./unconstrained-wealth-step";
import { createTensorBridgeDraws } from "./bridge-random";
import type { BridgeDraws, BridgeHitResult } from "./bridge-hit";
import type { ProjectionCurve } from "../../analytical/projection-curve";
import {
  advanceProjectedWealthStep,
  createTensorProjectedPolicy,
  disposeTensorProjectedPolicy,
} from "./projected-wealth-step";
import { detectProjectedImpoverishment } from "./projected-impoverishment-bridge";

/** Deterministic grid experiment; each step supplies asset noise for all paths. */
export interface TensorWealthBatchInput {
  /** Calibrated market and compatible mortality parameters shared by the batch. */
  market: CompatiblePolicyInputs["market"];
  mortality: CompatiblePolicyInputs["mortality"];
  annualWithdrawal: number;
  /** Initial capital and impoverishment level, in real euros. */
  investor: {
    impoverishmentLevel: number;
    initialCapital: number;
  };
  /** Number of paths in this batch, all sharing the investor's starting capital. */
  pathCount: number;
  /** Years after retirement, including the initial time. */
  times: readonly number[];
  /**
   * Asset-ordered increments with shape [paths, assets]. Arrays are flattened
   * in path-major order. A callback may instead create a Tensor2D for each
   * step; tensors created inside that callback are disposed with the step.
   */
  increments:
    | readonly (readonly number[])[]
    | ((
        step: number,
        timeStepYears: number,
      ) => readonly number[] | tf.Tensor2D);
  /** When supplied, run the projected policy alongside the unconstrained one. */
  projected?: {
    curve: ProjectionCurve;
    excessReturn: readonly number[];
    covariance: readonly (readonly number[])[];
  };
  /** Prepared GM occupation inputs shared across batches, when borrowing is possible. */
  borrowingOccupation?: readonly PreparedBorrowingInterval[];
  /** Create independent auxiliary bridge draws inside each step's tensor scope. */
  bridgeDraws: (step: number) => BridgeDraws;
}

/** Final stopped wealth and approximate first-passage observations for one batch. */
export interface TensorWealthBatchResult {
  /** Final wealth in real euros, stopped at the impoverishment level after a hit. */
  finalWealth: Float32Array;
  /** -1 means no hit; otherwise the grid index at the end of the hit interval. */
  firstHitStep: Int32Array;
  /** Approximate years after retirement, or -1 when no hit occurred. */
  firstHitTime: Float32Array;
  /** GM-weighted borrowing time for each unconstrained path, in years. */
  borrowingOccupation?: Float32Array;
  /** The matched projected-policy observations, present for paired runs. */
  projected?: {
    finalWealth: Float32Array;
    firstHitStep: Int32Array;
    firstHitTime: Float32Array;
  };
}

/** Wealth and first-hit observations for one policy's paths. */
interface TensorPathState {
  wealth: tf.Tensor1D;
  firstHit: tf.Tensor1D;
  firstHitTime: tf.Tensor1D;
}

/**
 * Apply newly detected hits to a policy's proposed wealth and first-hit state.
 * This runs inside the enclosing step's tidy scope; the caller retains the
 * returned tensors and disposes the previous state after the step completes.
 */
function recordFirstHits(
  proposedWealth: tf.Tensor1D,
  firstHit: tf.Tensor1D,
  firstHitTime: tf.Tensor1D,
  crossing: BridgeHitResult,
  threshold: number,
  endIndex: number,
  startTime: number,
  timeStepYears: number,
): TensorPathState {
  return {
    wealth: tf.where(
      crossing.hit,
      tf.fill(proposedWealth.shape, threshold),
      proposedWealth,
    ) as tf.Tensor1D,
    firstHit: tf.where(
      crossing.hit,
      tf.fill(firstHit.shape, endIndex, "int32"),
      firstHit,
    ) as tf.Tensor1D,
    firstHitTime: tf.where(
      crossing.hit,
      crossing.fraction.mul(timeStepYears).add(startTime),
      firstHitTime,
    ) as tf.Tensor1D,
  };
}

/**
 * Internal batched counterpart of advanceUnconstrainedWealth. This accepts
 * supplied increments so it can be checked against the double-precision scalar
 * reference. A local bridge approximates within-step first-passage times.
 * This low-level test harness trusts its inputs; production callers must use
 * simulateTensorBatch. Initialize a backend before calling. The caller
 * owns the returned arrays; this function disposes all tensors it creates.
 */
export async function simulateTensorWealthBatch(
  input: TensorWealthBatchInput,
): Promise<TensorWealthBatchResult> {
  const {
    market,
    mortality,
    investor,
    annualWithdrawal,
    pathCount,
    times,
    increments,
    bridgeDraws,
    projected,
    borrowingOccupation,
  } = input;
  const { initialCapital, impoverishmentLevel: threshold } = investor;
  const { realRiskFreeRate: r, mertonDirection } = market;
  const { p: delta } = mortality;
  const logGapVarianceRate = (2 * market.rho) / (delta - 1) ** 2;
  const count = pathCount;
  const assets = mertonDirection.length;

  // The analytical model uses the same investor threshold, not another copy.
  const model: CompatiblePolicyInputs = {
    market,
    mortality,
    impoverishmentLevel: threshold,
  };

  // The safe boundary x_safe(t) and log-gap drift are shared by every path.
  // Prepare them once per grid time, rather than recalculating them per path.
  const steps = prepareWealthGrid(model, annualWithdrawal, times);

  // Tensor state survives between steps; tidy releases each step's temporaries.
  let wealth: tf.Tensor1D = tf.fill([count], initialCapital, "float32");
  let firstHit: tf.Tensor1D = tf.fill([count], -1, "int32");
  let firstHitTime: tf.Tensor1D = tf.fill([count], -1, "float32");
  let occupation = tf.zeros([count]) as tf.Tensor1D;
  const direction = tf.tensor2d([...mertonDirection], [assets, 1]);
  const projectedPolicy = projected
    ? createTensorProjectedPolicy(
        projected.curve,
        projected.excessReturn,
        projected.covariance,
      )
    : null;
  let projectedWealth = projected
    ? (tf.fill([count], initialCapital, "float32") as tf.Tensor1D)
    : null;
  let projectedHit = projected
    ? (tf.fill([count], -1, "int32") as tf.Tensor1D)
    : null;
  let projectedHitTime = projected
    ? (tf.fill([count], -1, "float32") as tf.Tensor1D)
    : null;

  try {
    for (let step = 0; step < times.length - 1; step += 1) {
      const dt = times[step + 1] - times[step];
      const prepared = steps[step];

      const next = tf.tidy(() => {
        // Invoke the source inside tidy so step-local tensors it creates are
        // released together with the other intermediate tensors.
        const stepIncrements =
          typeof increments === "function"
            ? increments(step, dt)
            : increments[step];

        // Both policies see the same asset-ordered market increments.
        const z =
          stepIncrements instanceof tf.Tensor
            ? stepIncrements
            : tf.tensor2d(stepIncrements as number[], [count, assets]);
        const draws = bridgeDraws(step);

        // Advance and detect impoverishment for the unconstrained policy.
        const active = firstHit.equal(-1) as tf.Tensor1D;
        const proposedWealth = advanceUnconstrainedWealthStep({
          wealth,
          active,
          increments: z,
          mertonDirection: direction,
          realRiskFreeRate: r,
          annualWithdrawal,
          delta,
          step: prepared,
        });
        // Apply the CE-specific coordinate adapter to the proposed step. The
        // policy-independent primitive detects and times the first crossing.
        const crossing = detectCeImpoverishment({
          currentWealth: wealth,
          proposedWealth,
          active,
          impoverishmentLevel: threshold,
          currentSafeBoundary: prepared.currentBoundary,
          nextSafeBoundary: prepared.nextBoundary,
          timeStepYears: dt,
          logGapVarianceRate,
          draws,
        });
        const nextOccupation = borrowingOccupation
          ? advanceBorrowingOccupation({
              wealth,
              proposedWealth,
              active,
              crossing,
              impoverishmentLevel: threshold,
              accumulated: occupation,
              step: borrowingOccupation[step],
            })
          : occupation.clone();
        const unconstrained = recordFirstHits(
          proposedWealth,
          firstHit,
          firstHitTime,
          crossing,
          threshold,
          step + 1,
          times[step],
          dt,
        );

        if (
          projectedPolicy &&
          projectedWealth &&
          projectedHit &&
          projectedHitTime
        ) {
          const projectedActive = projectedHit.equal(-1) as tf.Tensor1D;
          const projectedStep = advanceProjectedWealthStep({
            policy: projectedPolicy,
            wealth: projectedWealth,
            active: projectedActive,
            increments: z,
            currentSafeBoundary: prepared.currentBoundary,
            impoverishmentLevel: threshold,
            realRiskFreeRate: r,
            annualWithdrawal,
            delta,
            timeStepYears: dt,
            riskFreeAnnuityFactor: prepared.riskFreeAnnuityFactor,
          });
          const projectedCrossing = detectProjectedImpoverishment({
            currentWealth: projectedWealth,
            proposedWealth: projectedStep.wealth,
            active: projectedActive,
            impoverishmentLevel: threshold,
            varianceRate: projectedStep.varianceRate,
            timeStepYears: dt,
            draws,
          });

          const updatedProjected = recordFirstHits(
            projectedStep.wealth,
            projectedHit,
            projectedHitTime,
            projectedCrossing,
            threshold,
            step + 1,
            times[step],
            dt,
          );

          return {
            ...unconstrained,
            occupation: nextOccupation,
            projectedWealth: updatedProjected.wealth,
            projectedHit: updatedProjected.firstHit,
            projectedHitTime: updatedProjected.firstHitTime,
          };
        }

        return { ...unconstrained, occupation: nextOccupation };
      });

      // Retain only the new states; all intermediate tensors were released by tidy.
      wealth.dispose();
      firstHit.dispose();
      firstHitTime.dispose();
      occupation?.dispose();
      occupation = next.occupation;
      wealth = next.wealth;
      firstHit = next.firstHit;
      firstHitTime = next.firstHitTime;

      if (
        "projectedWealth" in next &&
        next.projectedWealth &&
        next.projectedHit &&
        next.projectedHitTime
      ) {
        projectedWealth?.dispose();
        projectedHit?.dispose();
        projectedHitTime?.dispose();
        projectedWealth = next.projectedWealth;
        projectedHit = next.projectedHit;
        projectedHitTime = next.projectedHitTime;
      }
    }

    // Read back once after the batch; the returned arrays are caller-owned.
    const [wealthData, hitData, hitTimeData] = await Promise.all([
      wealth.data(),
      firstHit.data(),
      firstHitTime.data(),
    ]);

    if (
      Array.from(wealthData).some((value) => !Number.isFinite(value)) ||
      Array.from(hitTimeData).some((value) => !Number.isFinite(value))
    )
      throw new RangeError("Tensor simulation produced a non-finite result.");

    const occupationData = borrowingOccupation
      ? await occupation.data()
      : undefined;

    let projectedResult: TensorWealthBatchResult["projected"];

    if (projectedWealth && projectedHit && projectedHitTime) {
      const [projectedWealthData, projectedHitData, projectedTimeData] =
        await Promise.all([
          projectedWealth.data(),
          projectedHit.data(),
          projectedHitTime.data(),
        ]);

      if (
        Array.from(projectedWealthData).some(
          (value) => !Number.isFinite(value),
        ) ||
        Array.from(projectedTimeData).some((value) => !Number.isFinite(value))
      )
        throw new RangeError(
          "Projected tensor simulation produced a non-finite result.",
        );

      projectedResult = {
        finalWealth: Float32Array.from(projectedWealthData),
        firstHitStep: Int32Array.from(projectedHitData),
        firstHitTime: Float32Array.from(projectedTimeData),
      };
    }

    return {
      projected: projectedResult,
      borrowingOccupation: occupationData
        ? Float32Array.from(occupationData)
        : undefined,
      finalWealth: Float32Array.from(wealthData),
      firstHitStep: Int32Array.from(hitData),
      firstHitTime: Float32Array.from(hitTimeData),
    };
  } finally {
    wealth.dispose();
    occupation?.dispose();
    firstHit.dispose();
    firstHitTime.dispose();
    direction.dispose();
    projectedWealth?.dispose();
    projectedHit?.dispose();
    projectedHitTime?.dispose();
    if (projectedPolicy) disposeTensorProjectedPolicy(projectedPolicy);
  }
}

/**
 * Simulate one bridge-corrected batch from a validated snapshot, consuming the supplied
 * random stream in time-major, path-major, asset-major order. The run coordinator
 * owns the stream and must initialize it once from the snapshot seed; this
 * function never resets it. `pathCount` is the actual size of this batch, which
 * can be smaller than the configured batch size for the final batch. As an
 * internal entry point it trusts the coordinator to supply a valid count and
 * stream. Initialize a TensorFlow backend before calling.
 *
 * Reproducibility currently requires the same seed, batch sizes and call order;
 * changing batch size can assign different draws to individual paths.
 */
export async function simulateTensorBatch(
  snapshot: RunSnapshot,
  pathCount: number,
  stream: RandomStream,
  projectionCurve?: ProjectionCurve,
  borrowingOccupation?: readonly PreparedBorrowingInterval[],
): Promise<TensorWealthBatchResult> {
  assertRunSnapshot(snapshot);
  if (snapshot.options.policy.projected !== Boolean(projectionCurve))
    throw new RangeError(
      "The prepared projection must match the selected policy.",
    );

  const { market, options, mortality, numerical } = snapshot;
  const withdrawal = snapshot.resolvedAnnualWithdrawal;
  const times = generateTimeGrid(
    numerical.horizonYears,
    options.numerical.timeStep,
  );

  // Keep the factor on the selected backend for the entire batch. Each row of
  // independent normals xi is transformed as xi * L^T * sqrt(dt).
  const assets = market.covarianceFactor.length;
  const factor = tf.tensor2d(
    market.covarianceFactor.map((row) => [...row]),
    [assets, assets],
  );

  try {
    return await simulateTensorWealthBatch({
      market,
      mortality: mortality.ce.parameters,
      annualWithdrawal: withdrawal,
      investor: {
        impoverishmentLevel: options.investor.impoverishmentLevel,
        initialCapital: options.investor.initialCapital,
      },
      pathCount,
      times,
      borrowingOccupation,
      projected: projectionCurve
        ? {
            curve: projectionCurve,
            excessReturn: market.excessReturn,
            covariance: market.covariance,
          }
        : undefined,
      increments: (_step, dt) => {
        // The existing seeded stream runs on the CPU. Upload one flat buffer
        // per step, then correlate all paths on the TensorFlow backend.
        const normals = new Float32Array(pathCount * assets);

        for (let i = 0; i < normals.length; i += 1)
          normals[i] = stream.nextStandardNormal();

        return tf
          .tensor2d(normals, [pathCount, assets])
          .matMul(factor, false, true)
          .mul(Math.sqrt(dt)) as tf.Tensor2D;
      },
      bridgeDraws: () => createTensorBridgeDraws(pathCount, stream),
    });
  } finally {
    factor.dispose();
  }
}
