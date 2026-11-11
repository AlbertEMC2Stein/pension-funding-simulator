import type { CompatiblePolicyInputs } from "../analytical/compatible-policy";
import { safeBoundaryValue } from "../analytical/safe-boundary";

/** Market and safe-boundary quantities shared by every path at one time step. */
export interface PreparedWealthStep {
  currentBoundary: number;
  nextBoundary: number;
  timeStepYears: number;
  riskFreeAnnuityFactor: number;
  logGapDriftTimesStep: number;
}

/**
 * Prepare the grid-dependent coefficients once for a validated model and time
 * grid. The calling run boundary establishes validity. Non-finite coefficients
 * signal a numerical failure and must not be fed into a simulation.
 */
export function prepareWealthGrid(
  model: CompatiblePolicyInputs,
  annualWithdrawal: number,
  times: readonly number[],
): PreparedWealthStep[] {
  const r = model.market.realRiskFreeRate;
  const { p: delta, tau } = model.mortality;
  const logDrift =
    r -
    (2 * model.market.rho) / (delta - 1) -
    model.market.rho / (delta - 1) ** 2;
  const boundaries = times.map((time) =>
    safeBoundaryValue({
      realRiskFreeRate: r,
      annualWithdrawal,
      impoverishmentLevel: model.impoverishmentLevel,
      mortalityEndpoint: tau,
      time,
    }),
  );

  if (boundaries.some((value) => !Number.isFinite(value)))
    throw new RangeError(
      "Prepared safe boundaries exceed the supported numerical range.",
    );

  return times.slice(1).map((time, index) => {
    const dt = time - times[index];
    const annuity = Math.expm1(r * dt) / r;
    const drift = logDrift * dt;

    if (!Number.isFinite(annuity) || !Number.isFinite(drift))
      throw new RangeError(
        "Prepared wealth coefficients exceed the supported numerical range.",
      );

    return {
      currentBoundary: boundaries[index],
      nextBoundary: boundaries[index + 1],
      timeStepYears: dt,
      riskFreeAnnuityFactor: annuity,
      logGapDriftTimesStep: drift,
    };
  });
}
