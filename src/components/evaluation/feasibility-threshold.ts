import {
  compatibleGlobalFeasibility,
  compatibleWithdrawal,
} from "../../lib/model/analytical/compatible-policy";
import type { RiskWithdrawalResult } from "./RiskWithdrawalChart";

/** A usable threshold in euros, or a reason the boundary cannot be applied. */
export type FeasibilityThreshold =
  { value: string; amount: number } | { message: string };

/**
 * Find the impoverishment level at ζ = 1 while preserving whichever policy
 * input is selected. For target risk, the CE withdrawal is recomputed as the
 * threshold changes; for custom withdrawal it stays fixed. The result is nudged
 * slightly to the feasible side to account for input and floating-point
 * precision, then checked using the same diagnostic as the interface.
 */
export function findFeasibilityThreshold(
  ce: RiskWithdrawalResult,
): FeasibilityThreshold {
  if ("message" in ce) return { message: ce.message };

  const { model, data } = ce;
  const direction = model.market.mertonDirection;
  if (
    direction.some((component) => component < 0) ||
    !direction.some((component) => component > 0)
  )
    return {
      message:
        "The Merton vector must be non-negative with at least one positive component.",
    };

  const rate = model.market.realRiskFreeRate;
  const delta = model.mortality.p;
  const epsilon = -Math.expm1(-rate * model.mortality.tau);
  const multiplier =
    direction.reduce((sum, component) => sum + component, 0) / (delta - 1);

  // The safe-boundary width is ε(C − r·x_imp)/r. Substitution into ζ = 1
  // yields these expressions for the two different fixed-input modes.
  const candidate = data.custom
    ? (multiplier * (epsilon / rate) * data.selectedWithdrawal) /
    (1 + multiplier * epsilon)
    : (multiplier * data.initialCapital) /
    (multiplier - Math.expm1(Math.log(data.selectedRisk) / delta));

  if (!Number.isFinite(candidate))
    return {
      message: "The required impoverishment level could not be calculated.",
    };

  if (candidate < 1 || candidate >= data.initialCapital)
    return {
      message: `The required impoverishment level must be at least €1 and less than your starting capital. (Required level: €${candidate.toLocaleString("en-US", { maximumFractionDigits: 2 })}.)`,
    };

  // The tiny upward adjustment prevents rounding from placing ζ above 1.
  const value = (candidate * (1 + 1e-12)).toFixed(8);
  const amount = Number(value);
  if (
    !/^\d+(?:\.\d+)?$/.test(value) ||
    amount < 1 ||
    amount >= data.initialCapital
  )
    return {
      message:
        "The boundary cannot be represented within the supported investor inputs.",
    };

  try {
    const updatedModel = { ...model, impoverishmentLevel: amount };
    const withdrawal = data.custom
      ? data.selectedWithdrawal
      : compatibleWithdrawal(
        updatedModel,
        data.initialCapital,
        data.selectedRisk,
      );
    const result = compatibleGlobalFeasibility(updatedModel, withdrawal);

    if (
      result.reason !== "feasible" ||
      Math.abs(result.relativeBandwidthExcess - 1) > 1e-8
    )
      return {
        message:
          "The boundary could not be verified at the supported numerical precision.",
      };

    return { value, amount };
  } catch {
    return {
      message: "The boundary cannot be calculated for the current assumptions.",
    };
  }
}
