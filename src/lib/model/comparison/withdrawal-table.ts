import { calibrateMarket } from "../../market/calibrate-market";
import { mortalityFitKeys } from "../../mortality/fit-status";
import {
  buildMarketOptions,
  parseAmount,
  type SimulationDraft,
} from "../../options/simulation-options";
import type { CeFit } from "../../mortality/mortality-fitting";
import {
  compatibleRisk,
  compatibleWithdrawal,
  type CompatiblePolicyInputs,
} from "../analytical/compatible-policy";
import { safeWithdrawal } from "../analytical/safe-withdrawal";

/** Shared, current CE model and investor amounts for the analytical table. */
export type WithdrawalTableContext =
  | {
      available: true;
      model: CompatiblePolicyInputs;
      initialCapital: number;
      safeAnnualWithdrawal: number;
    }
  | { available: false; message: string };

/** A row's requested input and its result or a user-facing validation error. */
export type WithdrawalTableResult =
  | { ok: true; annualWithdrawal: number; ceRisk: number }
  | { ok: false; message: string };

/**
 * Prepare the shared CE model independently of Evaluation's selected withdrawal.
 * Validate the market, fit provenance and capital once, and validate CE
 * compatibility at the safe withdrawal. Each row can then vary its own input.
 */
export function prepareWithdrawalTable(
  draft: SimulationDraft,
  fits: { ce: { key: string; fit: CeFit } | null },
): WithdrawalTableContext {
  const input = buildMarketOptions(draft.market);
  if (!input.ok)
    return {
      available: false,
      message: "Check the market inputs before calculating this table.",
    };

  const calibrated = calibrateMarket(input.market);
  if (!calibrated.ok) return { available: false, message: calibrated.error };
  if (!calibrated.market.paperAssumptions.positiveRho)
    return {
      available: false,
      message: "The CE model requires a positive market risk premium (rho).",
    };

  const key = mortalityFitKeys({
    ...draft.investor,
    market: calibrated.market,
  }).ce;
  if (!fits.ce)
    return {
      available: false,
      message:
        "Fit the mortality models under Investor & mortality to calculate this table.",
    };
  if (fits.ce.key !== key)
    return {
      available: false,
      message: "The CE mortality fit needs updating for the current inputs.",
    };
  if (!fits.ce.fit.converged)
    return {
      available: false,
      message:
        "The CE mortality fit did not converge. Review the fit before calculating this table.",
    };

  const initialCapital = parseAmount(draft.investor.initialCapital);
  const impoverishmentLevel = parseAmount(draft.investor.impoverishmentLevel);
  if (
    initialCapital === null ||
    impoverishmentLevel === null ||
    impoverishmentLevel < 1 ||
    initialCapital <= impoverishmentLevel
  )
    return {
      available: false,
      message:
        "Enter valid starting capital and an impoverishment level below it.",
    };

  const model: CompatiblePolicyInputs = {
    market: calibrated.market,
    mortality: fits.ce.fit.parameters,
    impoverishmentLevel,
  };

  try {
    const safeAnnualWithdrawal = safeWithdrawal({
      realRiskFreeRate: model.market.realRiskFreeRate,
      initialCapital,
      impoverishmentLevel,
      mortalityEndpoint: model.mortality.tau,
    });
    // This validates CE compatibility even for zero-risk and safe rows.
    compatibleRisk(model, initialCapital, safeAnnualWithdrawal);

    return { available: true, model, initialCapital, safeAnnualWithdrawal };
  } catch (error) {
    return {
      available: false,
      message:
        error instanceof Error
          ? error.message
          : "The CE model is unavailable for these inputs.",
    };
  }
}

/**
 * Resolve one input using the unconstrained CE model. Zero target risk selects
 * the maximum risk-free withdrawal. Any non-negative withdrawal at or below
 * that limit has zero CE risk. Above it, use the model's analytical risk.
 */
export function calculateWithdrawalRow(
  context: Extract<WithdrawalTableContext, { available: true }>,
  type: "Target risk" | "Withdrawal",
  value: string,
): WithdrawalTableResult {
  if (type === "Target risk") {
    if (!/^\d+(?:\.\d+)?$/.test(value.trim()))
      return {
        ok: false,
        message: "Enter a target risk from 0% to less than 100%.",
      };
    const percent = Number(value.trim());
    if (!Number.isFinite(percent) || percent < 0 || percent >= 100)
      return {
        ok: false,
        message: "Enter a target risk from 0% to less than 100%.",
      };

    try {
      const ceRisk = percent / 100;
      const annualWithdrawal =
        ceRisk === 0
          ? context.safeAnnualWithdrawal
          : compatibleWithdrawal(context.model, context.initialCapital, ceRisk);
      return { ok: true, annualWithdrawal, ceRisk };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not calculate this row.",
      };
    }
  }

  const annualWithdrawal = parseAmount(value);
  if (annualWithdrawal === null || annualWithdrawal < 0)
    return {
      ok: false,
      message: "Enter a non-negative annual withdrawal in euros.",
    };

  try {
    const ceRisk =
      annualWithdrawal <= context.safeAnnualWithdrawal
        ? 0
        : compatibleRisk(
            context.model,
            context.initialCapital,
            annualWithdrawal,
          );
    if (!Number.isFinite(ceRisk) || ceRisk >= 1)
      return {
        ok: false,
        message: "The CE risk is outside the supported numerical range.",
      };

    return { ok: true, annualWithdrawal, ceRisk };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not calculate this row.",
    };
  }
}
