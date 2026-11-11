import type { CalibratedMarket } from "../../market/calibrate-market";
import type { CompactifiedExponentialParameters } from "../../mortality/mortality-models";
import { safeBoundary } from "./safe-boundary";

/** The compatible CE law and the market it was fitted against. */
export interface CompatiblePolicyInputs {
  market: Pick<
    CalibratedMarket,
    "realRiskFreeRate" | "rho" | "mertonDirection"
  >;
  mortality: CompactifiedExponentialParameters;
  /** Impoverishment level in real euros. */
  impoverishmentLevel: number;
}

/** Check the theorem's market-dependent compatibility conditions before use. */
function validateModel({
  market,
  mortality,
  impoverishmentLevel,
}: CompatiblePolicyInputs): void {
  const { realRiskFreeRate: r, rho, mertonDirection } = market;
  const { tau, p: delta, kappa, lambda } = mortality;
  if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(rho) || rho <= 0)
    throw new RangeError("A positive real rate and rho are required.");
  if (!Number.isFinite(impoverishmentLevel) || impoverishmentLevel <= 0)
    throw new RangeError(
      "The impoverishment level must be finite and positive.",
    );
  if (
    !mertonDirection.length ||
    mertonDirection.some((v) => !Number.isFinite(v)) ||
    mertonDirection.every((v) => v === 0)
  )
    throw new RangeError(
      "The Merton direction must be nonempty, finite and nonzero when rho is positive.",
    );
  if (
    !Number.isFinite(tau) ||
    tau <= 0 ||
    !Number.isFinite(delta) ||
    delta <= 1 ||
    !Number.isFinite(kappa) ||
    !Number.isFinite(lambda) ||
    lambda <= 0
  )
    throw new RangeError("Invalid compatible mortality parameters.");
  const b0 = r / -Math.expm1(-r * tau);
  if (!Number.isFinite(b0) || !(delta > 1 + rho / b0))
    throw new RangeError(
      "The CE elasticity does not satisfy the compatibility condition.",
    );
  const expectedLambda = delta * (b0 - rho / (delta - 1));
  /** Compare compatible mortality parameters using a relative tolerance to account for floating-point rounding. */
  const close = (a: number, b: number) =>
    Math.abs(a - b) <=
    1e-10 * Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE);
  if (
    !Number.isFinite(expectedLambda) ||
    !close(kappa, r) ||
    !close(lambda, expectedLambda)
  )
    throw new RangeError(
      "The mortality fit is not compatible with this market.",
    );
}

/** Require finite initial wealth strictly above the impoverishment threshold. */
function validateWealth(initialCapital: number, threshold: number): void {
  if (!Number.isFinite(initialCapital) || initialCapital <= threshold)
    throw new RangeError(
      "Initial capital must exceed the impoverishment level.",
    );
}

/**
 * Calculate the sustainable real annual withdrawal for a target lifetime
 * impoverishment probability under the unconstrained compatible CE model.
 * Requires capital above the threshold and a target strictly between 0 and 1;
 * rejects market/mortality combinations outside the compatibility conditions.
 */
export function compatibleWithdrawal(
  model: CompatiblePolicyInputs,
  initialCapital: number,
  targetRisk: number,
): number {
  validateModel(model);
  validateWealth(initialCapital, model.impoverishmentLevel);
  if (!Number.isFinite(targetRisk) || targetRisk <= 0 || targetRisk >= 1)
    throw new RangeError("Target risk must be strictly between zero and one.");
  const { realRiskFreeRate: r } = model.market;
  const { tau, p: delta } = model.mortality;
  const epsilon = -Math.expm1(-r * tau);
  const oneMinusRoot = -Math.expm1(Math.log(targetRisk) / delta);
  const result =
    r * model.impoverishmentLevel +
    (r / epsilon) *
      ((initialCapital - model.impoverishmentLevel) / oneMinusRoot);
  if (!Number.isFinite(result) || result <= r * model.impoverishmentLevel)
    throw new RangeError(
      "Withdrawal is outside the supported numerical range.",
    );
  return result;
}

/**
 * Calculate CE-model impoverishment probability at retirement for a fixed
 * annual withdrawal under the unconstrained policy. Returns zero when initial
 * capital is at or above the safe boundary; this is not estimated GM risk.
 */
export function compatibleRisk(
  model: CompatiblePolicyInputs,
  initialCapital: number,
  annualWithdrawal: number,
): number {
  validateModel(model);
  validateWealth(initialCapital, model.impoverishmentLevel);
  const boundary = safeBoundary({
    realRiskFreeRate: model.market.realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    time: 0,
    mortalityEndpoint: model.mortality.tau,
  });
  if (boundary <= model.impoverishmentLevel)
    throw new RangeError(
      "The risky-region width is outside the supported numerical range.",
    );
  if (initialCapital >= boundary) return 0;
  return (
    ((boundary - initialCapital) / (boundary - model.impoverishmentLevel)) **
    model.mortality.p
  );
}

/** Minimum initial capital achieving the CE target risk for a fixed withdrawal. */
export function compatibleRequiredCapital(
  model: CompatiblePolicyInputs,
  annualWithdrawal: number,
  targetRisk: number,
): number {
  validateModel(model);
  if (!Number.isFinite(targetRisk) || targetRisk <= 0 || targetRisk >= 1)
    throw new RangeError("Target risk must be strictly between zero and one.");
  const boundary = safeBoundary({
    realRiskFreeRate: model.market.realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    time: 0,
    mortalityEndpoint: model.mortality.tau,
  });
  const oneMinusRoot = -Math.expm1(Math.log(targetRisk) / model.mortality.p);
  const result =
    model.impoverishmentLevel +
    oneMinusRoot * (boundary - model.impoverishmentLevel);
  if (!Number.isFinite(result) || result <= model.impoverishmentLevel)
    throw new RangeError(
      "Required capital is outside the supported numerical range.",
    );
  return result;
}

/**
 * Calculate unconstrained risky-asset fractions at a time and wealth state in
 * the calibrated asset order. The compatible feedback is zero outside the
 * risky region. Time must be strictly before the finite mortality endpoint.
 */
export function compatiblePortfolio(
  model: CompatiblePolicyInputs,
  annualWithdrawal: number,
  time: number,
  wealth: number,
): number[] {
  validateModel(model);
  if (!Number.isFinite(wealth) || wealth < 0)
    throw new RangeError("Wealth must be finite and non-negative.");
  if (!Number.isFinite(time) || time < 0 || time >= model.mortality.tau)
    throw new RangeError("Time must be before the mortality endpoint.");
  const boundary = safeBoundary({
    realRiskFreeRate: model.market.realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    time,
    mortalityEndpoint: model.mortality.tau,
  });
  if (boundary <= model.impoverishmentLevel)
    throw new RangeError(
      "The risky-region width is outside the supported numerical range.",
    );
  if (wealth <= model.impoverishmentLevel || wealth >= boundary)
    return model.market.mertonDirection.map(() => 0);
  const scale = (boundary - wealth) / wealth / (model.mortality.p - 1);
  const fractions = model.market.mertonDirection.map((value) => scale * value);
  if (fractions.some((value) => !Number.isFinite(value)))
    throw new RangeError("Portfolio is outside the supported numerical range.");
  return fractions;
}

/** Result of the global simplex test; negative Merton components are reported separately from borrowing. */
export type GlobalFeasibility =
  | {
      feasible: false;
      reason: "negative-merton-component";
      relativeBandwidthExcess: null;
    }
  | {
      feasible: boolean;
      reason: "feasible" | "borrowing";
      relativeBandwidthExcess: number;
    };

/**
 * Test whether the unconstrained compatible CE policy is simplex-valued over
 * its entire risky region. Reports negative Merton components separately;
 * otherwise returns the relative bandwidth excess and whether borrowing is
 * possible somewhere in the region. This is not a borrowing probability.
 */
export function compatibleGlobalFeasibility(
  model: CompatiblePolicyInputs,
  annualWithdrawal: number,
): GlobalFeasibility {
  validateModel(model);
  const boundary = safeBoundary({
    realRiskFreeRate: model.market.realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    time: 0,
    mortalityEndpoint: model.mortality.tau,
  });
  if (boundary <= model.impoverishmentLevel)
    throw new RangeError(
      "The risky-region width is outside the supported numerical range.",
    );
  if (model.market.mertonDirection.some((value) => value < 0))
    return {
      feasible: false,
      reason: "negative-merton-component",
      relativeBandwidthExcess: null,
    };
  const sum = model.market.mertonDirection.reduce((a, b) => a + b, 0);
  const zeta =
    (sum *
      ((boundary - model.impoverishmentLevel) / model.impoverishmentLevel)) /
    (model.mortality.p - 1);
  if (!Number.isFinite(zeta))
    throw new RangeError(
      "Feasibility diagnostic is outside the supported numerical range.",
    );
  return {
    feasible: zeta <= 1,
    reason: zeta <= 1 ? "feasible" : "borrowing",
    relativeBandwidthExcess: zeta,
  };
}
