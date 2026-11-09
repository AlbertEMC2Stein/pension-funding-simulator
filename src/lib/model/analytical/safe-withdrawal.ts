/** Inputs to the risk-free withdrawal calculation; amounts are real euros. */
export interface SafeWithdrawalInputs {
  realRiskFreeRate: number;
  initialCapital: number;
  impoverishmentLevel: number;
  /** Remaining-lifetime support endpoint, in years, or Infinity. */
  mortalityEndpoint: number;
}

/** Maximum constant annual withdrawal financed risk-free until the endpoint. */
export function safeWithdrawal({
  realRiskFreeRate: rate,
  initialCapital,
  impoverishmentLevel: threshold,
  mortalityEndpoint: endpoint,
}: SafeWithdrawalInputs): number {
  if (!Number.isFinite(rate) || rate <= 0)
    throw new RangeError(
      "The real risk-free rate must be finite and positive.",
    );
  if (!Number.isFinite(threshold) || threshold <= 0)
    throw new RangeError(
      "The impoverishment level must be finite and positive.",
    );
  if (!Number.isFinite(initialCapital) || initialCapital <= threshold)
    throw new RangeError(
      "Initial capital must exceed the impoverishment level.",
    );
  if (!(endpoint === Infinity || (Number.isFinite(endpoint) && endpoint > 0)))
    throw new RangeError(
      "The mortality endpoint must be positive or Infinity.",
    );
  if (endpoint === Infinity) {
    const result = rate * initialCapital;
    if (!Number.isFinite(result) || result <= rate * threshold)
      throw new RangeError(
        "The safe withdrawal is outside the supported numerical range.",
      );
    return result;
  }
  const exponent = rate * endpoint;
  const annuity = exponent === 0 ? endpoint : -Math.expm1(-exponent) / rate;
  const result = rate * threshold + (initialCapital - threshold) / annuity;
  if (!Number.isFinite(result) || result <= rate * threshold)
    throw new RangeError(
      "The safe withdrawal is outside the supported numerical range.",
    );
  return result;
}
