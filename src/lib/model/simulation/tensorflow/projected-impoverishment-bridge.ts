import * as tf from "@tensorflow/tfjs";
import {
  detectBridgeHit,
  type BridgeDraws,
  type BridgeHitResult,
} from "./bridge-hit";

/** One projected Euler step and its frozen diffusion variance in wealth coordinates. */
export interface ProjectedImpoverishmentStep {
  currentWealth: tf.Tensor1D;
  proposedWealth: tf.Tensor1D;
  active: tf.Tensor1D;
  impoverishmentLevel: number;
  /** Frozen X² πᵀΣπ in euros squared per year. */
  varianceRate: tf.Tensor1D;
  timeStepYears: number;
  draws: BridgeDraws;
}

/**
 * Approximate a projected-policy first passage using a linear wealth bridge
 * with the step-start diffusion frozen. Only active paths may report a hit.
 * The returned tensors belong to the caller; all inputs remain caller-owned.
 */
export function detectProjectedImpoverishment(
  input: ProjectedImpoverishmentStep,
): BridgeHitResult {
  return tf.tidy(() => {
    const bridge = detectBridgeHit({
      distanceStart: input.currentWealth.sub(
        input.impoverishmentLevel,
      ) as tf.Tensor1D,
      distanceEnd: input.proposedWealth.sub(
        input.impoverishmentLevel,
      ) as tf.Tensor1D,
      stepVariance: input.varianceRate.mul(input.timeStepYears) as tf.Tensor1D,
      draws: input.draws,
    });

    return {
      hit: bridge.hit.logicalAnd(input.active) as tf.Tensor1D,
      fraction: bridge.fraction,
    };
  });
}
