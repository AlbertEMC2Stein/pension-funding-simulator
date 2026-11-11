import * as tf from "@tensorflow/tfjs";

/** Externally supplied pathwise random draws for a single bridge boundary. */
export interface BridgeDraws {
  /** Independent exponential thresholds −ln(U), with U in (0, 1]. */
  hitThreshold: tf.Tensor1D;
  /** Standard normals used to sample the conditional first-hit time. */
  timeNormal: tf.Tensor1D;
  /** Uniforms in [0, 1) used by the inverse-Gaussian sampler. */
  timeUniform: tf.Tensor1D;
}

/** Pathwise inputs in one common coordinate system, one element per path. */
export interface BridgeHitInput {
  /** Signed start and end distances, positive on the initial side of the boundary. */
  distanceStart: tf.Tensor1D;
  distanceEnd: tf.Tensor1D;
  /** Non-negative variance accumulated over the whole observed interval. */
  stepVariance: tf.Tensor1D;
  /** Draws are generated and owned by the caller, not this primitive. */
  draws: BridgeDraws;
}

/** Pathwise boundary-crossing results; the caller owns and disposes both tensors. */
export interface BridgeHitResult {
  /** Boolean tensor indicating first entry during the observed interval. */
  hit: tf.Tensor1D;
  /** Fraction of the interval at first entry, or 1 for a non-hit. */
  fraction: tf.Tensor1D;
}

/**
 * Detect and time first entries against one linearly interpolated boundary.
 * Endpoint distances and accumulated variance must be expressed in the same
 * coordinate system. For endpoints on the starting side, crossing probability
 * is exp(−2*d0*d1/variance); a nonpositive end distance implies a hit.
 * Conditional hit fractions use the inverse-Gaussian bridge law and its Lévy
 * limit when the end distance is zero. Zero-variance crossings use linear
 * interpolation. A path starting on or beyond the boundary hits at time zero.
 *
 * This trusted internal primitive assumes equal-shaped, finite Float32 tensors,
 * non-negative variance and valid draws; the surrounding run boundary owns
 * validation. It performs no policy-specific transformations or random number
 * generation. Initialize the TensorFlow backend before calling. Inputs remain
 * caller-owned; dispose both returned tensors. Intermediate tensors are scoped
 * by tidy. Float32 precision limits apply, including at extreme parameter scales.
 * The result is exact for the supplied linear-boundary bridge, not necessarily
 * for the original wealth process or a curved boundary.
 */
export function detectBridgeHit(input: BridgeHitInput): BridgeHitResult {
  return tf.tidy(() => {
    const {
      distanceStart: start,
      distanceEnd: end,
      stepVariance: variance,
      draws,
    } = input;
    const startsBeyond = start.lessEqual(0);
    const endBeyond = end.lessEqual(0);
    const stochastic = start.greater(0).logicalAnd(variance.greater(0));

    // Substitute benign values in inactive lanes: tf.where selects results
    // after evaluating both branches, so masking must precede division.
    const safeStart = tf.where(stochastic, start, tf.onesLike(start));
    const safeVariance = tf.where(stochastic, variance, tf.onesLike(variance));
    const crossesBetween = safeStart
      .mul(end)
      .mul(2)
      .div(safeVariance)
      .less(draws.hitThreshold);
    const hit = startsBeyond
      .logicalOr(endBeyond)
      .logicalOr(stochastic.logicalAnd(crossesBetween)) as tf.Tensor1D;

    // Draw V = fraction/(1−fraction) from its conditional inverse-Gaussian
    // distribution. When the end distance is zero its limit is Lévy.
    const ordinary = stochastic.logicalAnd(end.notEqual(0));
    const absoluteEnd = tf.where(ordinary, end.abs(), tf.onesLike(end));
    const mu = safeStart.div(absoluteEnd);
    const shape = safeStart.square().div(safeVariance);
    const normalSquared = draws.timeNormal.square();
    const a = mu.mul(normalSquared).div(shape.mul(2));
    const small = mu.div(
      tf
        .scalar(1)
        .add(a)
        .add(a.sqrt().mul(a.add(2).sqrt())),
    );
    const chooseSmall = draws.timeUniform.lessEqual(mu.div(mu.add(small)));
    const smallFraction = small.div(small.add(1));
    const largeFraction = mu.div(mu.add(small.div(mu)));
    const inverseGaussianFraction = tf.where(
      chooseSmall,
      smallFraction,
      largeFraction,
    );
    const levyFraction = shape.div(shape.add(normalSquared));
    const stochasticFraction = tf.where(
      end.equal(0),
      levyFraction,
      inverseGaussianFraction,
    );

    // With no diffusion, crossing time is the endpoint-linear interpolation.
    const deterministicHit = hit
      .logicalAnd(start.greater(0))
      .logicalAnd(variance.equal(0));
    const linearStart = tf.where(deterministicHit, start, tf.onesLike(start));
    const linearEnd = tf.where(deterministicHit, end, tf.zerosLike(end));
    const linearFraction = linearStart.div(linearStart.sub(linearEnd));
    const hitFraction = tf.where(
      stochastic,
      stochasticFraction,
      linearFraction,
    );
    const fraction = tf
      .where(
        startsBeyond,
        tf.zerosLike(start),
        tf.where(hit, hitFraction, tf.onesLike(start)),
      )
      .clipByValue(0, 1) as tf.Tensor1D;

    return { hit, fraction };
  });
}
