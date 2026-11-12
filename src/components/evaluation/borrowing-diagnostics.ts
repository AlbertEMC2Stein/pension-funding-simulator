import { safeBoundaryValue } from "../../lib/model/analytical/safe-boundary";
import type { FeasibilityResult } from "./global-feasibility";
import type { RiskWithdrawalResult } from "./RiskWithdrawalChart";

/** Analytical borrowing properties of the current unconstrained CE policy. */
export type BorrowingDiagnostics =
  | { available: false }
  | {
      available: true;
      /** Whether the starting portfolio's risk-free holding is negative. */
      borrowingAtRetirement: boolean;
      /** Last possible time after retirement; null when borrowing is impossible. */
      lastPossibleTimeYears: number | null;
    };

/**
 * Use the moving borrowing boundary and relative bandwidth multiplier to
 * determine initial borrowing and the last possible time it can occur. These
 * are properties of the current CE policy, not outcomes of a simulation. The
 * feasibility result and chart must describe the same current inputs; the
 * caller supplies the already-checked diagnostic and fresh CE relationship.
 */
export function calculateBorrowingDiagnostics(
  ce: RiskWithdrawalResult,
  feasibility: FeasibilityResult,
): BorrowingDiagnostics {
  if ("message" in ce || !("zeta" in feasibility)) return { available: false };

  const { model, data } = ce;
  const zeta = feasibility.zeta;
  const r = model.market.realRiskFreeRate;
  const endpoint = model.mortality.tau;
  const sum = model.market.mertonDirection.reduce(
    (total, value) => total + value,
    0,
  );
  const safe = safeBoundaryValue({
    realRiskFreeRate: r,
    annualWithdrawal: data.selectedWithdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    mortalityEndpoint: endpoint,
    time: 0,
  });
  const boundary = (sum / (sum + model.mortality.p - 1)) * safe;
  const borrowingAtRetirement = data.initialCapital < boundary;

  if (zeta <= 1)
    return {
      available: true,
      borrowingAtRetirement,
      lastPossibleTimeYears: null,
    };

  // log1p avoids cancellation when ζ is close to one. The alternate form
  // avoids overflowing expm1 when the rate-times-endpoint product is large.
  const exponent = r * endpoint;
  const cutoff =
    exponent < 700
      ? Math.log1p(((zeta - 1) / zeta) * Math.expm1(exponent)) / r
      : endpoint + Math.log1p(Math.expm1(-exponent) / zeta) / r;

  return Number.isFinite(cutoff)
    ? {
        available: true,
        borrowingAtRetirement,
        lastPossibleTimeYears: Math.min(endpoint, Math.max(0, cutoff)),
      }
    : { available: false };
}
