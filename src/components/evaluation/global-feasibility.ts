import { calibrateMarket } from "../../lib/market/calibrate-market";
import type { MarketCalibrationDraft } from "../../lib/market/market-calibration";
import { buildMarketOptions } from "../../lib/options/simulation-options";
import { compatibleGlobalFeasibility } from "../../lib/model/analytical/compatible-policy";
import type { RiskWithdrawalResult } from "./RiskWithdrawalChart";

/** Applicability and result of the unconstrained CE simplex diagnostic. */
export type FeasibilityResult =
  | { status: "unavailable"; message: string }
  | { status: "negative-merton"; message: string }
  | { status: "feasible" | "borrowing"; message: string; zeta: number };

/**
 * Evaluate global simplex feasibility using the same CE model and resolved
 * withdrawal as the chart. A missing or stale CE fit keeps the diagnostic
 * unavailable. The analytical function verifies its own model assumptions.
 */
export function evaluateGlobalFeasibility(
  ce: RiskWithdrawalResult,
): FeasibilityResult {
  if ("message" in ce) return { status: "unavailable", message: ce.message };

  try {
    const result = compatibleGlobalFeasibility(
      ce.model,
      ce.data.selectedWithdrawal,
    );

    if (result.reason === "negative-merton-component")
      return {
        status: "negative-merton",
        message:
          "A Merton-vector component is negative. The unconstrained strategy requires short selling whenever wealth is below the safe boundary, so it is not globally simplex-feasible.",
      };

    return result.feasible
      ? {
          status: "feasible",
          zeta: result.relativeBandwidthExcess,
          message:
            "The unconstrained CE strategy is globally long-only and does not borrow in its risky region.",
        }
      : {
          status: "borrowing",
          zeta: result.relativeBandwidthExcess,
          message:
            "The unconstrained CE strategy can require borrowing in part of its risky region.",
        };
  } catch {
    return {
      status: "unavailable",
      message:
        "Global feasibility is unavailable for these inputs and this withdrawal.",
    };
  }
}

/**
 * Detect short selling from the current market, even when changing that market
 * has made the CE mortality fit stale. Invalid market drafts cannot establish
 * a Merton direction and leave the existing diagnostic unchanged.
 */
export function feasibilityForCurrentMarket(
  marketDraft: MarketCalibrationDraft,
  feasibility: FeasibilityResult,
): FeasibilityResult {
  const input = buildMarketOptions(marketDraft);
  if (!input.ok) return feasibility;

  const calibrated = calibrateMarket(input.market);
  if (!calibrated.ok || calibrated.market.paperAssumptions.nonnegativeMerton)
    return feasibility;

  return {
    status: "negative-merton",
    message:
      "A Merton-vector component is negative. The unconstrained strategy requires short selling whenever wealth is below the safe boundary, so it is not globally simplex-feasible.",
  };
}
