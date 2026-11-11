import type { CompatiblePolicyInputs } from "../analytical/compatible-policy";
import { safeBoundary } from "../analytical/safe-boundary";
import type { PreparedWealthStep } from "./prepared-grid";

/** One grid observation; time is in years and wealth is in real euros. */
export interface WealthState {
  time: number;
  wealth: number;
}

/** Model, withdrawal, current state and asset-ordered market increment for one reference wealth step. */
export interface WealthStepInput {
  model: CompatiblePolicyInputs;
  annualWithdrawal: number;
  current: WealthState;
  endTime: number;
  /** Asset-ordered increments with covariance Σ Δt, already scaled by √Δt. */
  marketIncrement: readonly number[];
}

/**
 * Advance a trusted solvent state using coefficients prepared once for the run.
 * Checks only the computed wealth for numerical failure; input validation is
 * the responsibility of the enclosing boundary.
 */
export function advancePreparedWealth(
  model: CompatiblePolicyInputs,
  annualWithdrawal: number,
  current: WealthState,
  endTime: number,
  marketIncrement: readonly number[],
  step: PreparedWealthStep,
): WealthState {
  const { realRiskFreeRate: r, mertonDirection } = model.market;
  const delta = model.mortality.p;
  let wealth: number;

  if (current.wealth >= step.currentBoundary) {
    wealth =
      current.wealth +
      (current.wealth * r - annualWithdrawal) * step.riskFreeAnnuityFactor;
  } else {
    const noise = mertonDirection.reduce(
      (sum, value, i) => sum + value * marketIncrement[i],
      0,
    );
    const gap =
      (step.currentBoundary - current.wealth) *
      Math.exp(step.logGapDriftTimesStep - noise / (delta - 1));
    wealth = step.nextBoundary - gap;
  }
  if (!Number.isFinite(wealth))
    throw new RangeError("Wealth step produced a non-finite result.");

  return { time: endTime, wealth };
}

/**
 * Advance one solvent path under the unprojected CE policy. A risky path uses
 * the exact geometric safe-gap transition; a safe path uses the risk-free ODE.
 * A below-threshold endpoint is an observation, not a continuous hit time.
 */
export function advanceUnconstrainedWealth(
  input: WealthStepInput,
): WealthState {
  const { model, annualWithdrawal, current, endTime, marketIncrement } = input;
  const { realRiskFreeRate: r, rho, mertonDirection } = model.market;
  const { tau, p: delta } = model.mortality;

  if (
    !Number.isFinite(current.wealth) ||
    current.wealth <= model.impoverishmentLevel
  )
    throw new RangeError(
      "Current wealth must be finite and above the impoverishment level.",
    );
  if (!Number.isFinite(endTime) || endTime <= current.time || endTime > tau)
    throw new RangeError(
      "End time must be after the current time and no later than the endpoint.",
    );
  if (
    marketIncrement.length !== mertonDirection.length ||
    marketIncrement.some((x) => !Number.isFinite(x))
  )
    throw new RangeError(
      "Market increments must be finite and match the asset order.",
    );

  const boundaryInput = {
    realRiskFreeRate: r,
    annualWithdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    mortalityEndpoint: tau,
  };
  const xSafe = safeBoundary({ ...boundaryInput, time: current.time });
  const dt = endTime - current.time;
  const nextBoundary = safeBoundary({ ...boundaryInput, time: endTime });

  return advancePreparedWealth(
    model,
    annualWithdrawal,
    current,
    endTime,
    marketIncrement,
    {
      currentBoundary: xSafe,
      nextBoundary,
      timeStepYears: dt,
      riskFreeAnnuityFactor: Math.expm1(r * dt) / r,
      logGapDriftTimesStep:
        (r - (2 * rho) / (delta - 1) - rho / (delta - 1) ** 2) * dt,
    },
  );
}
