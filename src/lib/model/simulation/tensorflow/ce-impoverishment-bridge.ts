import * as tf from "@tensorflow/tfjs";
import {
  detectBridgeHit,
  type BridgeDraws,
  type BridgeHitResult,
} from "./bridge-hit";

/** CE wealth endpoints and precomputed step parameters for bridge detection. */
export interface CeImpoverishmentStep {
  currentWealth: tf.Tensor1D;
  proposedWealth: tf.Tensor1D;
  /** True for paths that have not previously hit the impoverishment level. */
  active: tf.Tensor1D;
  impoverishmentLevel: number;
  currentSafeBoundary: number;
  nextSafeBoundary: number;
  timeStepYears: number;
  /** Variance rate of the logarithmic safe-gap process. */
  logGapVarianceRate: number;
  draws: BridgeDraws;
}

/**
 * Convert one unconstrained CE wealth step to a single-boundary bridge.
 * Risky paths use logarithmic safe-gap distances when both coordinates are
 * defined; the moving log boundary is approximated by its endpoint chord.
 * At the CE endpoint or other nonpositive gaps, use frozen wealth variance.
 * Risk-free paths use zero variance. Only active paths can report a hit.
 * Inputs are trusted and caller-owned; the caller disposes both returned tensors.
 */
export function detectCeImpoverishment(
  input: CeImpoverishmentStep,
): BridgeHitResult {
  return tf.tidy(() => {
    const {
      currentWealth,
      proposedWealth,
      active,
      impoverishmentLevel,
      currentSafeBoundary,
      nextSafeBoundary,
      timeStepYears,
      logGapVarianceRate,
      draws,
    } = input;
    const startGap = tf.scalar(currentSafeBoundary).sub(currentWealth);
    const endGap = tf.scalar(nextSafeBoundary).sub(proposedWealth);
    const risky = active.logicalAnd(startGap.greater(0));
    const useLog = risky
      .logicalAnd(endGap.greater(0))
      .logicalAnd(
        tf.scalar(
          Math.fround(nextSafeBoundary) > Math.fround(impoverishmentLevel),
          "bool",
        ),
      );

    // Select safe operands before logarithms: TensorFlow evaluates both sides
    // of where, including inactive and risk-free paths.
    const startDistance = currentWealth.sub(impoverishmentLevel);
    const endDistance = proposedWealth.sub(impoverishmentLevel);
    const safeStartGap = tf.where(useLog, startGap, tf.onesLike(startGap));
    const safeEndGap = tf.where(useLog, endGap, tf.onesLike(endGap));
    const logStart = tf.log1p(
      tf
        .where(useLog, startDistance, tf.zerosLike(startDistance))
        .div(safeStartGap),
    );
    const logEnd = tf.log1p(
      tf.where(useLog, endDistance, tf.zerosLike(endDistance)).div(safeEndGap),
    );
    const distanceStart = tf.where(
      useLog,
      logStart,
      startDistance,
    ) as tf.Tensor1D;
    const distanceEnd = tf.where(useLog, logEnd, endDistance) as tf.Tensor1D;

    // Frozen wealth diffusion has variance gap² times log-gap variance;
    // deterministic risk-free paths have zero variance.
    const frozenVariance = tf.where(
      risky,
      startGap.square().mul(logGapVarianceRate),
      tf.zerosLike(startGap),
    );
    const stepVariance = tf
      .where(
        useLog,
        tf.fill(currentWealth.shape, logGapVarianceRate),
        frozenVariance,
      )
      .mul(timeStepYears) as tf.Tensor1D;
    const bridge = detectBridgeHit({
      distanceStart,
      distanceEnd,
      stepVariance,
      draws,
    });

    return {
      hit: bridge.hit.logicalAnd(active) as tf.Tensor1D,
      fraction: bridge.fraction,
    };
  });
}
