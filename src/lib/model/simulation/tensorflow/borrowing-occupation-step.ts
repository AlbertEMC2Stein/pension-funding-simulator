import * as tf from "@tensorflow/tfjs";
import type { PreparedBorrowingInterval } from "../borrowing-occupation";
import type { BridgeHitResult } from "./bridge-hit";

/** Inputs to a single endpoint-interpolated occupation update. */
export interface BorrowingOccupationUpdate {
  wealth: tf.Tensor1D;
  proposedWealth: tf.Tensor1D;
  active: tf.Tensor1D;
  crossing: BridgeHitResult;
  impoverishmentLevel: number;
  accumulated: tf.Tensor1D;
  step: PreparedBorrowingInterval;
}

/**
 * Add survival-weighted time below the borrowing boundary over one observed
 * step. A bridge-detected impoverishment truncates the interval and supplies
 * its observed endpoint. Wealth and boundary gaps are linearly interpolated;
 * excursions whose endpoints are both outside the region are not detected.
 * The caller owns the returned tensor and all inputs.
 */
export function advanceBorrowingOccupation(
  input: BorrowingOccupationUpdate,
): tf.Tensor1D {
  return tf.tidy(() => {
    const {
      wealth,
      proposedWealth,
      active,
      crossing,
      impoverishmentLevel,
      accumulated,
      step,
    } = input;
    const fraction = tf.where(
      crossing.hit,
      crossing.fraction,
      tf.onesLike(wealth),
    );
    const endpoint = tf.where(
      crossing.hit,
      tf.fill(wealth.shape, impoverishmentLevel),
      proposedWealth,
    );
    const startGap = wealth.sub(step.boundaryStart);
    const endBoundary = fraction
      .mul(step.boundaryEnd - step.boundaryStart)
      .add(step.boundaryStart);
    const endGap = endpoint.sub(endBoundary);
    const startsBorrowing = startGap.less(0);
    const endsBorrowing = endGap.less(0);

    // The chord crosses at |gapStart| / (|gapStart| + |gapEnd|).
    const startMagnitude = startGap.abs();
    const denominator = startMagnitude.add(endGap.abs());
    const crossingFraction = startMagnitude.div(tf.maximum(denominator, 1e-30));
    const borrowedFraction = tf.where(
      startsBorrowing,
      tf.where(endsBorrowing, tf.onesLike(wealth), crossingFraction),
      tf.where(
        endsBorrowing,
        tf.onesLike(wealth).sub(crossingFraction),
        tf.zerosLike(wealth),
      ),
    );
    const contribution = fraction
      .mul(borrowedFraction)
      .mul(step.survivalIntegral);

    return accumulated.add(
      tf.where(active, contribution, tf.zerosLike(wealth)),
    ) as tf.Tensor1D;
  });
}
