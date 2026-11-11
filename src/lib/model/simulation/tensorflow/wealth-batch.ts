import * as tf from "@tensorflow/tfjs";
import type { CompatiblePolicyInputs } from "../../analytical/compatible-policy";
import { assertRunSnapshot, type RunSnapshot } from "../run-configuration";
import { generateTimeGrid } from "../wealth-path";
import { prepareWealthGrid } from "../prepared-grid";
import type { RandomStream } from "../random";

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
  } = input;
  const { initialCapital, impoverishmentLevel: threshold } = investor;
  const { realRiskFreeRate: r, mertonDirection } = market;
  const { p: delta } = mortality;
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
  const direction = tf.tensor2d([...mertonDirection], [assets, 1]);

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

        // `active` excludes paths that have already reached the impoverishment
        // level on the grid; `risky` selects x < x_safe(t) for each path.
        const active = firstHit.equal(-1);
        const risky = wealth.less(prepared.currentBoundary);

        // z has shape [paths, assets] and covariance Sigma * dt. Multiplying
        // by the Merton direction m gives m^T Delta Z for every path. The
        // increments already include volatility and sqrt(dt) scaling.
        const z =
          stepIncrements instanceof tf.Tensor
            ? stepIncrements
            : tf.tensor2d(stepIncrements as number[], [count, assets]);
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
 * Simulate one grid-only batch from a validated snapshot, consuming the supplied
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
): Promise<TensorWealthBatchResult> {
  assertRunSnapshot(snapshot);
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
    });
  } finally {
    factor.dispose();
  }
}
