import { compatibleRequiredCapital } from "../../lib/model/analytical/compatible-policy";
import { safeBoundary } from "../../lib/model/analytical/safe-boundary";
import type { RiskWithdrawalResult } from "./RiskWithdrawalChart";

/** Capital for one risk variation; null means the target is outside the analytical domain. */
export interface CapitalVariation {
  label: string;
  risk: number;
  capital: number | null;
  difference: number | null;
}

/** Available unconstrained comparison or the reason it cannot be calculated. */
export type CapitalComparison =
  | { message: string }
  | {
      safeCapital: number;
      initialCapital: number;
      /** Fixed real annual withdrawal used for every comparison, in euros. */
      annualWithdrawal: number;
      zeroRisk: boolean;
      rows: CapitalVariation[];
    };

/**
 * Hold the current withdrawal fixed and compare capital at 95%, 100%, and
 * 105% of its selected CE risk. At zero risk, compare the risk-free minimum
 * against 1% and 5% instead: starting capital can exceed that minimum. The
 * results do not describe a projected policy.
 */
export function calculateCapitalComparison(
  ce: RiskWithdrawalResult,
  projected: boolean,
): CapitalComparison {
  if (projected)
    return {
      message:
        "This comparison is available for the unconstrained policy only. Turn off projection to calculate it.",
    };
  if ("message" in ce) return { message: ce.message };

  const { data, model } = ce;
  if (
    data.selectedWithdrawal <=
    model.market.realRiskFreeRate * model.impoverishmentLevel
  )
    return {
      message:
        "This capital comparison is not yet supported when withdrawal is at or below the interest on the impoverishment level.",
    };

  try {
    const safeCapital = safeBoundary({
      realRiskFreeRate: model.market.realRiskFreeRate,
      annualWithdrawal: data.selectedWithdrawal,
      impoverishmentLevel: model.impoverishmentLevel,
      mortalityEndpoint: model.mortality.tau,
      time: 0,
    });
    const zeroRisk = data.selectedRisk === 0;
    const variations = zeroRisk
      ? [
          { label: "No risk-taking", risk: 0 },
          { label: "Comparison", risk: 0.01 },
          { label: "Comparison", risk: 0.05 },
        ]
      : [
          { label: "0.95 α · 5% lower", risk: 0.95 * data.selectedRisk },
          { label: "α · selected risk", risk: data.selectedRisk },
          { label: "1.05 α · 5% higher", risk: 1.05 * data.selectedRisk },
        ];
    const rows = variations.map(({ label, risk }, index) => {
      let capital: number | null = null;

      if (zeroRisk && index === 0) capital = safeCapital;
      else if (!zeroRisk && index === 1) capital = data.initialCapital;
      else if (risk > 0 && risk < 1) {
        try {
          capital = compatibleRequiredCapital(
            model,
            data.selectedWithdrawal,
            risk,
          );
        } catch {
          /* A numerically unsupported variation remains unavailable. */
        }
      }

      return {
        label,
        risk,
        capital,
        difference: capital === null ? null : capital - data.initialCapital,
      };
    });

    return {
      safeCapital,
      initialCapital: data.initialCapital,
      annualWithdrawal: data.selectedWithdrawal,
      zeroRisk,
      rows,
    };
  } catch {
    return {
      message:
        "The capital comparison is unavailable for this withdrawal and model.",
    };
  }
}
