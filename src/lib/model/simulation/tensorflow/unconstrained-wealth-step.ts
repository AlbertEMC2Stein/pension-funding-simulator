import * as tf from "@tensorflow/tfjs";
import type { PreparedWealthStep } from "../prepared-grid";

/** Inputs for one unconstrained CE wealth step; all tensors remain caller-owned. */
export interface UnconstrainedWealthStepInput {
  /** Current wealth and active-path mask, both with shape [paths]. */
  wealth: tf.Tensor1D;
  active: tf.Tensor1D;
  /** Asset-ordered return increments, already scaled to covariance Σ dt. */
  increments: tf.Tensor2D;
  /** Merton direction as a column tensor with shape [assets, 1]. */
  mertonDirection: tf.Tensor2D;
  realRiskFreeRate: number;
  annualWithdrawal: number;
  /** Compatible CE parameter delta. */
  delta: number;
  /** Boundaries and exact update coefficients prepared for this grid interval. */
  step: PreparedWealthStep;
}

/**
 * Advance unconstrained CE wealth by one grid interval. The risky region uses
 * the exact geometric safe-gap update; the safe region follows the exact
 * risk-free withdrawal equation. Previously stopped paths remain unchanged.
 * First-passage detection is separate. The caller owns the returned tensor;
 * all inputs remain caller-owned, and temporary tensors are scoped internally.
 */
export function advanceUnconstrainedWealthStep(
  input: UnconstrainedWealthStepInput,
): tf.Tensor1D {
  return tf.tidy(() => {
    const {
      wealth,
      active,
      increments,
      mertonDirection,
      realRiskFreeRate,
      annualWithdrawal,
      delta,
      step,
    } = input;
    const risky = wealth.less(step.currentBoundary);
    const noise = increments.matMul(mertonDirection).reshape(wealth.shape);

    // In the risky region the safe gap Y = x_safe - X is geometric:
    // ln(Y_next / Y) = logGapDriftTimesStep - mᵀΔZ / (delta - 1).
    const gap = tf
      .scalar(step.currentBoundary)
      .sub(wealth)
      .mul(
        tf.exp(tf.scalar(step.logGapDriftTimesStep).sub(noise.div(delta - 1))),
      );
    const riskyWealth = tf.scalar(step.nextBoundary).sub(gap);

    // Solve the risk-free ODE exactly for paths at or above the safe boundary.
    const safeWealth = wealth.add(
      wealth
        .mul(realRiskFreeRate)
        .sub(annualWithdrawal)
        .mul(step.riskFreeAnnuityFactor),
    );

    return tf.where(
      active,
      tf.where(risky, riskyWealth, safeWealth),
      wealth,
    ) as tf.Tensor1D;
  });
}
