import * as tf from "@tensorflow/tfjs";
import type { CompatiblePolicyInputs } from "../../analytical/compatible-policy";
import { safeBoundary } from "../../analytical/safe-boundary";

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
 * Batched counterpart of advanceUnconstrainedWealth. This intentionally accepts
 * supplied increments so it can be checked against the double-precision scalar
 * reference. It records grid hits only and performs no bridge detection.
 * Initialize a TensorFlow.js backend before calling. The caller owns the plain
 * returned arrays; this function disposes all tensors it creates.
 */
export async function simulateTensorWealthBatch(
  input: TensorWealthBatchInput,
): Promise<TensorWealthBatchResult> {
  const { model, annualWithdrawal, initialWealth, times, increments } = input;
  const { realRiskFreeRate: r, rho, mertonDirection } = model.market;
  const { tau, p: delta } = model.mortality;
  const threshold = model.impoverishmentLevel;
  const count = initialWealth.length;
  const assets = mertonDirection.length;

  // Validate the batch layout before allocating device memory.
  if (
    !count ||
    !assets ||
    initialWealth.some((x) => !Number.isFinite(x) || x <= threshold)
  )
    throw new RangeError(
      "Initial wealth must be finite and above the impoverishment level.",
    );
  if (
    times.length < 1 ||
    (typeof increments !== "function" &&
      increments.length !== times.length - 1) ||
    times.some(
      (t, i) =>
        !Number.isFinite(t) || t < 0 || t > tau || (i > 0 && t <= times[i - 1]),
    )
  )
    throw new RangeError(
      "Provide an increasing time grid within the mortality endpoint.",
    );
  if (
    typeof increments !== "function" &&
    increments.some(
      (values) =>
        values.length !== count * assets ||
        values.some((v) => !Number.isFinite(v)),
    )
  )
    throw new RangeError(
      "Each increment must contain one finite value per path and asset.",
    );
  /** Evaluate the model safe boundary at a grid time using the shared market and withdrawal. */
  const boundary = (time: number) =>
    safeBoundary({
      realRiskFreeRate: r,
      annualWithdrawal,
      impoverishmentLevel: threshold,
      time,
      mortalityEndpoint: tau,
    });

  // Tensor state survives between steps; tidy releases each step's temporaries.
  let wealth: tf.Tensor1D = tf.tensor1d(initialWealth as number[], "float32");
  let firstHit: tf.Tensor1D = tf.fill([count], -1, "int32");
  try {
    for (let step = 0; step < times.length - 1; step += 1) {
      const dt = times[step + 1] - times[step];
      const stepIncrements =
        typeof increments === "function"
          ? increments(step, dt)
          : increments[step];
      if (
        stepIncrements.length !== count * assets ||
        stepIncrements.some((value) => !Number.isFinite(value))
      )
        throw new RangeError(
          "Each increment must contain one finite value per path and asset.",
        );
      const currentBoundary = boundary(times[step]);
      const nextBoundary = boundary(times[step + 1]);
      const logDrift = r - (2 * rho) / (delta - 1) - rho / (delta - 1) ** 2;
      const next = tf.tidy(() => {
        const active = firstHit.equal(-1);
        const risky = wealth.less(currentBoundary);
        const z = tf.tensor2d(stepIncrements as number[], [count, assets]);
        const direction = tf.tensor2d(mertonDirection, [assets, 1]);
        const noise = z.matMul(direction).reshape([count]);
        const gap = tf
          .scalar(currentBoundary)
          .sub(wealth)
          .mul(tf.exp(tf.scalar(logDrift * dt).sub(noise.div(delta - 1))));
        const riskyWealth = tf.scalar(nextBoundary).sub(gap);
        const safeWealth = wealth.add(
          wealth
            .mul(r)
            .sub(annualWithdrawal)
            .mul(Math.expm1(r * dt) / r),
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
  }
}
