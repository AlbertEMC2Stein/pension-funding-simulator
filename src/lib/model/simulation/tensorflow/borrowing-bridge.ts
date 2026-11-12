import * as tf from "@tensorflow/tfjs";
import {
  detectBridgeHit,
  type BridgeDraws,
  type BridgeHitResult,
} from "./bridge-hit";

/** Inputs for first borrowing over one observed, possibly truncated CE step. */
export interface BorrowingBridgeInput {
  currentWealth: tf.Tensor1D;
  proposedWealth: tf.Tensor1D;
  /** Paths still solvent and without an earlier borrowing entry. */
  pending: tf.Tensor1D;
  impoverishmentHit: BridgeHitResult;
  impoverishmentLevel: number;
  currentSafeBoundary: number;
  nextSafeBoundary: number;
  /** x_borrow(t) / x_safe(t), fixed for this policy. */
  boundaryScale: number;
  realRiskFreeRate: number;
  timeStepYears: number;
  logGapVarianceRate: number;
  /** Independent of the impoverishment bridge draws. */
  draws: BridgeDraws;
}

/**
 * Approximate first borrowing using the observed wealth interval. A sampled
 * impoverishment stops the interval at its sampled time and threshold. In the
 * risky region, log(x_safe - X) is Brownian and its borrowing boundary is
 * interpolated between observed endpoints. If log coordinates are undefined,
 * use a frozen wealth variance; safe paths have zero diffusion.
 *
 * This is a single-boundary approximation: it does not condition on avoiding
 * impoverishment or sample a first-passage bridge. Fractions returned are
 * relative to the observed interval, not the full time step. Inputs and outputs
 * are caller-owned; temporaries are released by the enclosing tidy scope.
 */
export function detectFirstBorrowing(
  input: BorrowingBridgeInput,
): BridgeHitResult {
  return tf.tidy(() => {
    const {
      currentWealth,
      proposedWealth,
      pending,
      impoverishmentHit,
      impoverishmentLevel,
      currentSafeBoundary,
      nextSafeBoundary,
      boundaryScale,
      realRiskFreeRate,
      timeStepYears,
      logGapVarianceRate,
      draws,
    } = input;
    const observedFraction = tf.where(
      impoverishmentHit.hit,
      impoverishmentHit.fraction,
      tf.onesLike(currentWealth),
    );
    const observedWealth = tf.where(
      impoverishmentHit.hit,
      tf.fill(currentWealth.shape, impoverishmentLevel),
      proposedWealth,
    );

    // The safe boundary solves dB/dt = rB - C, so its value at the sampled
    // stop follows from the two prepared endpoint values without another fit.
    const rateTime = realRiskFreeRate * timeStepYears;
    const weight = tf
      .expm1(observedFraction.mul(rateTime))
      .div(Math.expm1(rateTime));
    const observedSafe = weight
      .mul(nextSafeBoundary - currentSafeBoundary)
      .add(currentSafeBoundary);
    const boundaryStart = currentSafeBoundary * boundaryScale;
    const observedBoundary = observedSafe.mul(boundaryScale);
    const startGap = tf.scalar(currentSafeBoundary).sub(currentWealth);
    const endGap = observedSafe.sub(observedWealth);
    const startLevel = currentSafeBoundary - boundaryStart;
    const endLevel = observedSafe.sub(observedBoundary);
    const risky = startGap.greater(0);
    const useLog = risky
      .logicalAnd(endGap.greater(0))
      .logicalAnd(endLevel.greater(0))
      .logicalAnd(tf.scalar(startLevel > 0, "bool"));

    // Benign operands prevent invalid logarithms in lanes not using log gaps.
    const safeStartGap = tf.where(useLog, startGap, tf.onesLike(startGap));
    const safeEndGap = tf.where(useLog, endGap, tf.onesLike(endGap));
    const startDistance = tf.where(
      useLog,
      tf.log(
        tf
          .where(
            useLog,
            tf.fill(currentWealth.shape, startLevel),
            tf.onesLike(startGap),
          )
          .div(safeStartGap),
      ),
      currentWealth.sub(boundaryStart),
    ) as tf.Tensor1D;
    const endDistance = tf.where(
      useLog,
      tf.log(tf.where(useLog, endLevel, tf.onesLike(endLevel)).div(safeEndGap)),
      observedWealth.sub(observedBoundary),
    ) as tf.Tensor1D;
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
      .mul(observedFraction)
      .mul(timeStepYears) as tf.Tensor1D;
    const crossing = detectBridgeHit({
      distanceStart: startDistance,
      distanceEnd: endDistance,
      stepVariance,
      draws,
    });

    return {
      hit: crossing.hit.logicalAnd(pending) as tf.Tensor1D,
      fraction: crossing.fraction,
    };
  });
}
