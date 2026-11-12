import * as tf from "@tensorflow/tfjs";
import type { ProjectionCurve } from "../../analytical/projection-curve";

/** GPU-resident projection curve and market coefficients, in calibrated asset order. */
export interface TensorProjectedPolicy {
  scales: tf.Tensor1D;
  allocations: tf.Tensor2D;
  excessReturn: tf.Tensor1D;
  covariance: tf.Tensor2D;
  /** Number of stored knots; callers dispose all four tensors after the batch. */
  knotCount: number;
}

/** Inputs for one projected Euler wealth step; all tensors remain caller-owned. */
export interface ProjectedWealthStepInput {
  policy: TensorProjectedPolicy;
  /** Wealth and active-path mask, both of shape [paths]. */
  wealth: tf.Tensor1D;
  active: tf.Tensor1D;
  /** Return-noise increments with shape [paths, assets] and covariance Σ dt. */
  increments: tf.Tensor2D;
  currentSafeBoundary: number;
  impoverishmentLevel: number;
  realRiskFreeRate: number;
  annualWithdrawal: number;
  delta: number;
  timeStepYears: number;
  /** Exact risk-free annuity factor (exp(r dt) - 1) / r. */
  riskFreeAnnuityFactor: number;
}

/** Proposed wealth and frozen variance rate for the later bridge calculation. */
export interface ProjectedWealthStepResult {
  wealth: tf.Tensor1D;
  /** X² πᵀΣπ, in euros squared per year, or zero outside the risky region. */
  varianceRate: tf.Tensor1D;
}

/**
 * Upload the prepared curve and calibrated market coefficients once per batch.
 * Inputs come from the same validated market and are trusted. The caller owns
 * the tensors and must dispose them when the batch finishes.
 */
export function createTensorProjectedPolicy(
  curve: ProjectionCurve,
  excessReturn: readonly number[],
  covariance: readonly (readonly number[])[],
): TensorProjectedPolicy {
  const knotCount = curve.knots.length;
  const assets = excessReturn.length;

  return {
    scales: tf.tensor1d(curve.knots.map((knot) => knot.scale)),
    allocations: tf.tensor2d(
      curve.knots.map((knot) => [...knot.allocation]),
      [knotCount, assets],
    ),
    excessReturn: tf.tensor1d([...excessReturn]),
    covariance: tf.tensor2d(
      covariance.map((row) => [...row]),
      [assets, assets],
    ),
    knotCount,
  };
}

/** Release the tensors created by createTensorProjectedPolicy after a batch. */
export function disposeTensorProjectedPolicy(
  policy: TensorProjectedPolicy,
): void {
  policy.scales.dispose();
  policy.allocations.dispose();
  policy.excessReturn.dispose();
  policy.covariance.dispose();
}

/**
 * Advance one batch with the projected CE feedback using Euler–Maruyama in
 * the risky region and the exact risk-free update in the safe region.
 * First-passage detection is deliberately separate: this returns the frozen
 * diffusion variance rate used by the projected bridge adapter.
 * Previously stopped paths remain unchanged. Tensors in the result belong to
 * the caller; temporary tensors are disposed before this function returns.
 */
export function advanceProjectedWealthStep(
  input: ProjectedWealthStepInput,
): ProjectedWealthStepResult {
  return tf.tidy(() => {
    const {
      policy,
      wealth,
      active,
      increments,
      currentSafeBoundary,
      impoverishmentLevel,
      realRiskFreeRate,
      annualWithdrawal,
      delta,
      timeStepYears,
      riskFreeAnnuityFactor,
    } = input;
    const risky = active
      .logicalAnd(wealth.greater(impoverishmentLevel))
      .logicalAnd(wealth.less(currentSafeBoundary));
    const safeWealth = tf.where(risky, wealth, tf.onesLike(wealth));
    const scale = tf
      .scalar(currentSafeBoundary)
      .sub(safeWealth)
      .div(safeWealth)
      .div(delta - 1);
    const boundedScale = tf.minimum(
      tf.maximum(scale, policy.scales.slice([0], [1])),
      policy.scales.slice([policy.knotCount - 1], [1]),
    );

    // Search in Float32 on the active backend. Right insertion skips any knots
    // that become identical after conversion from the double-precision curve.
    const upper = tf.minimum(
      tf
        .searchSorted(policy.scales, boundedScale, "right")
        .reshape(wealth.shape),
      tf.scalar(policy.knotCount - 1, "int32"),
    );
    const lower = tf.maximum(
      upper.sub(tf.scalar(1, "int32")),
      tf.scalar(0, "int32"),
    );
    const leftScale = tf.gather(policy.scales, lower);
    const rightScale = tf.gather(policy.scales, upper);
    const width = rightScale.sub(leftScale);
    const weight = boundedScale
      .sub(leftScale)
      .div(tf.where(width.greater(0), width, tf.onesLike(width)))
      .expandDims(1);
    const left = tf.gather(policy.allocations, lower);
    const right = tf.gather(policy.allocations, upper);
    const allocation = tf.where(
      risky.expandDims(1),
      left.add(right.sub(left).mul(weight)),
      tf.zerosLike(left),
    );

    // Euler drift uses excess returns because the risk-free return applies to
    // all wealth. The supplied increments already include covariance and dt.
    const excessDrift = allocation.mul(policy.excessReturn).sum(1);
    const marketNoise = allocation.mul(increments).sum(1);
    const riskyWealth = wealth
      .add(
        wealth
          .mul(realRiskFreeRate)
          .sub(annualWithdrawal)
          .add(wealth.mul(excessDrift))
          .mul(timeStepYears),
      )
      .add(wealth.mul(marketNoise));
    const safeUpdate = wealth.add(
      wealth
        .mul(realRiskFreeRate)
        .sub(annualWithdrawal)
        .mul(riskFreeAnnuityFactor),
    );
    const proposed = tf.where(
      active,
      tf.where(risky, riskyWealth, safeUpdate),
      wealth,
    ) as tf.Tensor1D;

    // Frozen X² πᵀΣπ is used by a bridge in wealth coordinates, not by the
    // unconstrained CE log-gap bridge.
    const varianceRate = allocation
      .matMul(policy.covariance)
      .mul(allocation)
      .sum(1)
      .mul(wealth.square()) as tf.Tensor1D;

    return { wealth: proposed, varianceRate };
  });
}
