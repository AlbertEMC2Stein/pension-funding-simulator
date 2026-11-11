import * as tf from "@tensorflow/tfjs";
import type { CompatiblePolicyInputs } from "../../analytical/compatible-policy";
import { assertRunSnapshot, type RunSnapshot } from "../run-configuration";
import { generateTimeGrid } from "../wealth-path";
import { prepareWealthGrid } from "../prepared-grid";
import {
  correlatePreparedIncrement,
  factorPreparedCovariance,
} from "../matrix";
import { createRandomStream } from "../random";

/** Deterministic grid experiment; each step supplies asset noise for all paths. */
export interface TensorWealthBatchInput {
  /** Calibrated market and compatible mortality parameters shared by the batch. */
  market: CompatiblePolicyInputs["market"];
  mortality: CompatiblePolicyInputs["mortality"];
  annualWithdrawal: number;
  /** Investor threshold and the initial real wealth of each path, in euros. */
  investor: {
    impoverishmentLevel: number;
    initialWealth: readonly number[];
  };
  /** Years after retirement, including the initial time. */
  times: readonly number[];
  /**
   * Asset-ordered increments for each step, stored path-major with shape
   * [number of paths, number of assets]. A callback avoids retaining all steps.
   */
  increments:
    | readonly (readonly number[])[]
    | ((step: number, timeStepYears: number) => readonly number[]);
}

/** Final Float32 grid states and the first observed grid-hit indices for one supplied-increment batch. */
export interface TensorWealthBatchResult {
  /** Final grid wealth in real euros, retained at the observed hit if stopped. */
  finalWealth: Float32Array;
  /** -1 means no observed hit; otherwise this is the first hit's grid index. */
  firstGridHit: Int32Array;
}

/**
 * Internal batched counterpart of advanceUnconstrainedWealth. This accepts
 * supplied increments so it can be checked against the double-precision scalar
 * reference. It records grid hits only and performs no bridge detection.
 * This low-level test harness trusts its inputs; production callers must use
 * simulateTensorSnapshotBatch. Initialize a backend before calling. The caller
 * owns the returned arrays; this function disposes all tensors it creates.
 */
export async function simulateTensorWealthBatch(
  input: TensorWealthBatchInput,
): Promise<TensorWealthBatchResult> {
  const { market, mortality, investor, annualWithdrawal, times, increments } =
    input;
  const { initialWealth, impoverishmentLevel: threshold } = investor;
  const { realRiskFreeRate: r, mertonDirection } = market;
  const { p: delta } = mortality;
  const count = initialWealth.length;
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
  let wealth: tf.Tensor1D = tf.tensor1d(initialWealth as number[], "float32");
  let firstHit: tf.Tensor1D = tf.fill([count], -1, "int32");
  const direction = tf.tensor2d([...mertonDirection], [assets, 1]);

  try {
    for (let step = 0; step < times.length - 1; step += 1) {
      const dt = times[step + 1] - times[step];
      const stepIncrements =
        typeof increments === "function"
          ? increments(step, dt)
          : increments[step];
      const prepared = steps[step];

      const next = tf.tidy(() => {
        // `active` excludes paths that have already reached the impoverishment
        // level on the grid; `risky` selects x < x_safe(t) for each path.
        const active = firstHit.equal(-1);
        const risky = wealth.less(prepared.currentBoundary);

        // z has shape [paths, assets] and covariance Sigma * dt. Multiplying
        // by the Merton direction m gives m^T Delta Z for every path. The
        // increments already include volatility and sqrt(dt) scaling.
        const z = tf.tensor2d(stepIncrements as number[], [count, assets]);
        const noise = z.matMul(direction).reshape([count]);

        // In the risky region, Y = x_safe - X follows a geometric diffusion.
        // Its exact log-gap increment is
        //   ln(Y_next / Y) = [r - 2*rho/(delta-1) - rho/(delta-1)^2] * dt
        //                    - m^T Delta Z/(delta-1).
        // `logGapDriftTimesStep` contains the bracketed drift times dt.
        const gap = tf
          .scalar(prepared.currentBoundary)
          .sub(wealth)
          .mul(
            tf.exp(
              tf
                .scalar(prepared.logGapDriftTimesStep)
                .sub(noise.div(delta - 1)),
            ),
          );

        // Convert the updated gap back to wealth at the next safe boundary.
        const riskyWealth = tf.scalar(prepared.nextBoundary).sub(gap);

        // At or above the safe boundary, the risky allocation is zero. Solve
        // dX/dt = r*X - C exactly using (exp(r*dt) - 1)/r from the prepared step.
        const safeWealth = wealth.add(
          wealth
            .mul(r)
            .sub(annualWithdrawal)
            .mul(prepared.riskFreeAnnuityFactor),
        );

        // Choose the appropriate update and freeze paths with a prior grid hit.
        const nextWealth = tf.where(
          active,
          tf.where(risky, riskyWealth, safeWealth),
          wealth,
        ) as tf.Tensor1D;

        // Record only the first observed grid point with X <= x_imp. This is
        // not a continuous-time first-passage or Brownian-bridge calculation.
        const nextHit = tf.where(
          active.logicalAnd(nextWealth.lessEqual(threshold)),
          tf.fill([count], step + 1, "int32"),
          firstHit,
        ) as tf.Tensor1D;

        return { wealth: nextWealth, firstHit: nextHit };
      });

      // Retain only the new states; all intermediate tensors were released by tidy.
      wealth.dispose();
      firstHit.dispose();
      wealth = next.wealth;
      firstHit = next.firstHit;
    }

    // Read back once after the batch; the returned arrays are caller-owned.
    const [wealthData, hitData] = await Promise.all([
      wealth.data(),
      firstHit.data(),
    ]);

    if (Array.from(wealthData).some((value) => !Number.isFinite(value)))
      throw new RangeError("Tensor simulation produced a non-finite result.");

    return {
      finalWealth: Float32Array.from(wealthData),
      firstGridHit: Int32Array.from(hitData),
    };
  } finally {
    wealth.dispose();
    firstHit.dispose();
    direction.dispose();
  }
}

/**
 * Simulate one trusted snapshot batch using internal seeded market increments.
 * This is an initial grid-only prototype; separate calls restart the seed and
 * therefore must not yet be combined as independent batches of a larger run.
 */
export async function simulateTensorSnapshotBatch(
  snapshot: RunSnapshot,
): Promise<TensorWealthBatchResult> {
  assertRunSnapshot(snapshot);
  const { market, options, mortality, numerical } = snapshot;
  const withdrawal = snapshot.resolvedAnnualWithdrawal;
  const times = generateTimeGrid(
    numerical.horizonYears,
    options.numerical.timeStep,
  );

  // Factor Sigma = L L^T once. Every step draws independent standard normals
  // and transforms them to Delta Z = L * xi * sqrt(dt) for each path.
  const factor = factorPreparedCovariance(market.covariance);
  const stream = createRandomStream(numerical.seed);

  return simulateTensorWealthBatch({
    market,
    mortality: mortality.ce.parameters,
    annualWithdrawal: withdrawal,
    investor: {
      impoverishmentLevel: options.investor.impoverishmentLevel,
      initialWealth: Array(numerical.batchSize).fill(
        options.investor.initialCapital,
      ),
    },
    times,
    increments: (_step, dt) => {
      const batch: number[] = [];

      for (let path = 0; path < numerical.batchSize; path += 1) {
        const normals = Array.from({ length: factor.length }, () =>
          stream.nextStandardNormal(),
        );
        batch.push(...correlatePreparedIncrement(factor, normals, dt));
      }

      return batch;
    },
  });
}
