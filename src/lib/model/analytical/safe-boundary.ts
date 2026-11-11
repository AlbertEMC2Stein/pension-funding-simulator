/** Inputs to the paper's risk-free safe-wealth boundary. */
export interface SafeBoundaryInputs {
  /** Continuously compounded real risk-free rate, per year. */
  realRiskFreeRate: number;
  /** Constant real withdrawal in euros per year. */
  annualWithdrawal: number;
  /** Impoverishment threshold in euros. */
  impoverishmentLevel: number;
  /** Years after retirement; at a finite endpoint, the limiting value is returned. */
  time: number;
  /** Endpoint of remaining lifetime in years after retirement, or Infinity. */
  mortalityEndpoint: number;
}

/**
 * Risk-free capital required to fund the specified withdrawal until the
 * mortality endpoint without crossing the impoverishment threshold.
 *
 * Implements the safe-level lemma in the manuscript's model section. Its
 * standing regime is r > 0, x_imp > 0 and C > r * x_imp. The result depends
 * on the endpoint of the mortality distribution, not on an expected lifetime
 * or a cohort table's last observed age. Infinity represents unbounded support.
 *
 * The finite-horizon expression uses expm1 to retain precision when r or the
 * remaining duration is small. At the finite endpoint it returns the continuous
 * limit x_imp, matching the research implementation; times beyond it are invalid.
 */
export function safeBoundary({
  realRiskFreeRate: rate,
  annualWithdrawal: withdrawal,
  impoverishmentLevel: threshold,
  time,
  mortalityEndpoint: endpoint,
}: SafeBoundaryInputs): number {
  if (!Number.isFinite(rate) || rate <= 0)
    throw new RangeError(
      "The real risk-free rate must be finite and positive.",
    );
  if (!Number.isFinite(threshold) || threshold <= 0)
    throw new RangeError(
      "The impoverishment level must be finite and positive.",
    );
  if (!Number.isFinite(withdrawal) || withdrawal <= 0)
    throw new RangeError("Annual withdrawal must be finite and positive.");
  if (!(withdrawal > rate * threshold))
    throw new RangeError(
      "Annual withdrawal must exceed interest at the impoverishment level.",
    );
  if (!Number.isFinite(time) || time < 0)
    throw new RangeError("Time must be finite and non-negative.");
  if (!(endpoint === Infinity || (Number.isFinite(endpoint) && endpoint > 0)))
    throw new RangeError(
      "The mortality endpoint must be positive or Infinity.",
    );
  if (time > endpoint)
    throw new RangeError("Time cannot be past the mortality endpoint.");

  const result = safeBoundaryValue({
    realRiskFreeRate: rate,
    annualWithdrawal: withdrawal,
    impoverishmentLevel: threshold,
    time,
    mortalityEndpoint: endpoint,
  });
  if (!Number.isFinite(result))
    throw new RangeError(
      "The safe boundary exceeds the supported numerical range.",
    );
  return result;
}

/** Compute a safe boundary from inputs already checked by a trusted caller. */
export function safeBoundaryValue({
  realRiskFreeRate: rate,
  annualWithdrawal: withdrawal,
  impoverishmentLevel: threshold,
  time,
  mortalityEndpoint: endpoint,
}: SafeBoundaryInputs): number {
  if (endpoint === Infinity) return withdrawal / rate;
  const remaining = endpoint - time;
  const exponent = rate * remaining;
  const discount = Math.exp(-exponent);
  // When the product underflows to zero, the annuity factor tends to remaining.
  const annuity = exponent === 0 ? remaining : -Math.expm1(-exponent) / rate;
  return threshold * discount + withdrawal * annuity;
}
