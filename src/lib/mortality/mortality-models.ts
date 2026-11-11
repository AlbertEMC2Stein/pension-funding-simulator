/** Parameters for the Gompertz–Makeham hazard lambda + alpha * exp(beta * t). */
export interface GompertzMakehamParameters {
  alpha: number;
  beta: number;
  lambda: number;
}

/** Generic compactified-exponential parameters; the compatible model selects these later. */
export interface CompactifiedExponentialParameters {
  lambda: number;
  p: number;
  kappa: number;
  tau: number;
}

/** Reject a non-finite or negative model parameter with its field name. */
function nonnegativeFinite(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${name} must be finite and non-negative.`);
}

/** Reject a non-finite or non-positive model parameter with its field name. */
function positiveFinite(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be finite and positive.`);
}

/** Check the parameter domain required by the Gompertz–Makeham survival law. */
function validateGompertzMakeham(params: GompertzMakehamParameters) {
  positiveFinite(params.alpha, "alpha");
  positiveFinite(params.beta, "beta");
  nonnegativeFinite(params.lambda, "lambda");
}

/** Integrated GM hazard. Large positive hazards can safely overflow to Infinity. */
function cumulativeHazard(
  t: number,
  { alpha, beta, lambda }: GompertzMakehamParameters,
): number {
  if (t === 0) return 0;
  const z = beta * t;
  let gompertz: number;
  if (z < 50) {
    // expm1(z)/z tends to one, avoiding alpha/beta overflow for small beta.
    gompertz = alpha * t * (z === 0 ? 1 : Math.expm1(z) / z);
  } else {
    // Evaluate the exponential contribution in log space to avoid overflow
    // when exp(z) is huge but its product with alpha/beta remains finite.
    const logTerm =
      Math.log(alpha) - Math.log(beta) + z + Math.log1p(-Math.exp(-z));
    gompertz = Math.exp(logTerm);
  }
  return (lambda === 0 ? 0 : lambda * t) + gompertz;
}

/** GM survival at a finite non-negative remaining lifetime t, in years. */
export function gompertzMakehamSurvival(
  t: number,
  params: GompertzMakehamParameters,
): number {
  nonnegativeFinite(t, "t");
  validateGompertzMakeham(params);
  return Math.exp(-cumulativeHazard(t, params));
}

/**
 * Generic CE survival. Returns zero at and beyond its finite endpoint tau.
 * Uses the same parameterization as the research survival function; no
 * compatibility with a market or optimal-policy theorem is implied here.
 */
export function compactifiedExponentialSurvival(
  t: number,
  params: CompactifiedExponentialParameters,
): number {
  nonnegativeFinite(t, "t");
  nonnegativeFinite(params.lambda, "lambda");
  positiveFinite(params.p, "p");
  positiveFinite(params.kappa, "kappa");
  positiveFinite(params.tau, "tau");
  if (t === 0) return 1;
  if (t >= params.tau) return 0;
  const endpointProduct = params.kappa * params.tau;
  const denominator = -Math.expm1(-endpointProduct);
  if (denominator === 0)
    throw new RangeError(
      "CE parameters are outside the supported numerical range.",
    );
  const numerator = -Math.expm1(-params.kappa * (params.tau - t));
  if (numerator === 0)
    throw new RangeError(
      "CE parameters are outside the supported numerical range.",
    );
  // The ratio is near one close to t=0; log1p avoids subtracting two logs.
  const difference =
    (Math.exp(-params.kappa * (params.tau - t)) *
      -Math.expm1(-params.kappa * t)) /
    denominator;
  const logRatio =
    difference < 0.5
      ? Math.log1p(-difference)
      : Math.log(numerator) - Math.log(denominator);
  const eta = Math.exp(
    Math.log(params.p) +
    Math.log(params.kappa) -
    endpointProduct -
    Math.log(denominator),
  );
  if (!Number.isFinite(eta))
    throw new RangeError(
      "CE parameters are outside the supported numerical range.",
    );
  const logSurvival = (eta - params.lambda) * t + params.p * logRatio;
  if (Number.isNaN(logSurvival) || logSurvival > 1e-10)
    throw new RangeError("CE parameters produced an invalid survival value.");
  return Math.exp(Math.min(logSurvival, 0));
}

/** log(1 + exp(x)) without overflowing for large x. */
function softplus(x: number): number {
  return x > 0 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x));
}

/**
 * Remaining-lifetime CDF quantile. Probability 0 gives 0 and 1 gives Infinity.
 * A bracketed monotone solve avoids a Lambert-W dependency; the pure
 * Gompertz and pure Makeham quantiles provide an upper bound.
 */
export function gompertzMakehamQuantile(
  probability: number,
  params: GompertzMakehamParameters,
): number {
  validateGompertzMakeham(params);
  if (!Number.isFinite(probability) || probability < 0 || probability > 1)
    throw new RangeError("Probability must be finite and between 0 and 1.");
  if (probability === 0) return 0;
  if (probability === 1) return Infinity;
  const target = -Math.log1p(-probability);
  const gompertzBound =
    softplus(
      Math.log(params.beta) + Math.log(target) - Math.log(params.alpha),
    ) / params.beta;
  let upper =
    params.lambda === 0
      ? gompertzBound
      : Math.min(gompertzBound, target / params.lambda);
  if (!Number.isFinite(upper) || upper <= 0)
    throw new RangeError(
      "GM quantile is outside the supported numerical range.",
    );
  // Correct possible rounding of an analytical upper bound before bisection.
  if (cumulativeHazard(upper, params) < target) {
    upper *= 1 + 8 * Number.EPSILON;
    if (!Number.isFinite(upper) || cumulativeHazard(upper, params) < target)
      throw new RangeError("Could not bracket the GM quantile.");
  }
  let lower = 0;
  for (let i = 0; i < 200; i += 1) {
    const midpoint = lower + (upper - lower) / 2;
    if (midpoint === lower || midpoint === upper) break;
    if (cumulativeHazard(midpoint, params) < target) lower = midpoint;
    else upper = midpoint;
  }
  return lower + (upper - lower) / 2;
}
