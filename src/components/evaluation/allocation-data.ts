import {
  compatiblePortfolio,
  type CompatiblePolicyInputs,
} from "../../lib/model/analytical/compatible-policy";
import { safeBoundary } from "../../lib/model/analytical/safe-boundary";

/** Unconstrained CE portfolio fractions over the risky wealth interval. */
export interface AllocationData {
  impoverishmentLevel: number;
  safeLevel: number;
  wealth: number[];
  /** Risky fractions ordered like the calibrated market's assets. */
  riskyFractions: number[][];
  /** Risk-free fraction, which can be negative if the policy borrows. */
  riskFreeFractions: number[];
}

/** Last selectable time, one calendar day before the CE endpoint when possible. */
export function allocationTimeLimit(endpoint: number): number {
  return Math.max(0, endpoint - 1 / 365.25);
}

/**
 * Sample the CE feedback for a fixed time and withdrawal. The first sample
 * approaches the impoverishment boundary from above: the portfolio stops at
 * the boundary itself. The mortality endpoint is excluded because the risky
 * interval collapses there and the feedback is undefined.
 */
export function makeAllocationData(
  model: CompatiblePolicyInputs,
  annualWithdrawal: number,
  time: number,
): AllocationData {
  const safeLevel = safeBoundary({
    realRiskFreeRate: model.market.realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    mortalityEndpoint: model.mortality.tau,
    time,
  });
  const width = safeLevel - model.impoverishmentLevel;

  if (time >= model.mortality.tau || width <= 0)
    throw new RangeError(
      "At the CE endpoint the risky interval collapses and the allocation is undefined.",
    );

  const wealth = Array.from(
    { length: 101 },
    (_, index) =>
      model.impoverishmentLevel +
      width * (index === 0 ? 0.000001 : index / 100),
  );
  const allocations = wealth.map((amount) =>
    compatiblePortfolio(model, annualWithdrawal, time, amount),
  );
  const riskyFractions = model.market.mertonDirection.map((_, index) =>
    allocations.map((fractions) => fractions[index]),
  );
  const riskFreeFractions = allocations.map(
    (fractions) => 1 - fractions.reduce((sum, fraction) => sum + fraction, 0),
  );

  return {
    impoverishmentLevel: model.impoverishmentLevel,
    safeLevel,
    wealth,
    riskyFractions,
    riskFreeFractions,
  };
}
