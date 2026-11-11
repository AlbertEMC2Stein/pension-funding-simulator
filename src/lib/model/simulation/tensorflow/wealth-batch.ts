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
  model: CompatiblePolicyInputs;
  annualWithdrawal: number;
  initialWealth: readonly number[];
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
  const { model, annualWithdrawal, initialWealth, times, increments } = input;
  const { realRiskFreeRate: r, mertonDirection } = model.market;
  const { p: delta } = model.mortality;
  const threshold = model.impoverishmentLevel;
  const count = initialWealth.length;
  const assets = mertonDirection.length;

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
        const active = firstHit.equal(-1);
        const risky = wealth.less(prepared.currentBoundary);
        const z = tf.tensor2d(stepIncrements as number[], [count, assets]);
        const noise = z.matMul(direction).reshape([count]);
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
        const riskyWealth = tf.scalar(prepared.nextBoundary).sub(gap);
        const safeWealth = wealth.add(
          wealth
            .mul(r)
            .sub(annualWithdrawal)
            .mul(prepared.riskFreeAnnuityFactor),
        );
        const nextWealth = tf.where(
          active,
          tf.where(risky, riskyWealth, safeWealth),
          wealth,
        ) as tf.Tensor1D;
        const nextHit = tf.where(
          active.logicalAnd(nextWealth.lessEqual(threshold)),
          tf.fill([count], step + 1, "int32"),
          firstHit,
        ) as tf.Tensor1D;
        return { wealth: nextWealth, firstHit: nextHit };
      });
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
  const model = {
    market,
    mortality: mortality.ce.parameters,
    impoverishmentLevel: options.investor.impoverishmentLevel,
  };
  const withdrawal = snapshot.resolvedAnnualWithdrawal;
  const times = generateTimeGrid(
    numerical.horizonYears,
    options.numerical.timeStep,
  );
  const factor = factorPreparedCovariance(market.covariance);
  const stream = createRandomStream(numerical.seed);
  return simulateTensorWealthBatch({
    model,
    annualWithdrawal: withdrawal,
    initialWealth: Array(numerical.batchSize).fill(
      options.investor.initialCapital,
    ),
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
