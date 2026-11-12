import {
  prepareGompertzMakehamSurvival,
  type GompertzMakehamParameters,
} from "../../mortality/mortality-models";
import { safeBoundaryValue } from "../analytical/safe-boundary";
import type { CompatiblePolicyInputs } from "../analytical/compatible-policy";

/** One grid interval's borrowing boundary and GM-survival integral. */
export interface PreparedBorrowingInterval {
  boundaryStart: number;
  boundaryEnd: number;
  /** Integral of GM survival over the entire interval, in years. */
  survivalIntegral: number;
}

/**
 * Prepare the moving borrowing boundary and cumulative GM survival once per
 * run. The returned interval increments represent the cumulative integral
 * without subtracting nearly equal cumulative values. Simpson quadrature
 * integrates each grid interval; within an interval
 * the cumulative integral is linearly interpolated at crossing times. A null
 * result means the sum of the Merton direction is non-positive, so the
 * unconstrained policy cannot borrow in its risky region.
 */
export function prepareBorrowingOccupation(input: {
  market: CompatiblePolicyInputs["market"];
  mortality: CompatiblePolicyInputs["mortality"];
  gm: GompertzMakehamParameters;
  annualWithdrawal: number;
  impoverishmentLevel: number;
  times: readonly number[];
}): PreparedBorrowingInterval[] | null {
  const sum = input.market.mertonDirection.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;

  const survival = prepareGompertzMakehamSurvival(input.gm);
  const scale = sum / (sum + input.mortality.p - 1);
  const boundaries = input.times.map(
    (time) =>
      scale *
      safeBoundaryValue({
        realRiskFreeRate: input.market.realRiskFreeRate,
        annualWithdrawal: input.annualWithdrawal,
        impoverishmentLevel: input.impoverishmentLevel,
        mortalityEndpoint: input.mortality.tau,
        time,
      }),
  );
  const survivalValues = input.times.map(survival);

  return input.times.slice(1).map((end, index) => {
    const start = input.times[index];
    const integral =
      ((end - start) *
        (survivalValues[index] +
          4 * survival((start + end) / 2) +
          survivalValues[index + 1])) /
      6;
    return {
      boundaryStart: boundaries[index],
      boundaryEnd: boundaries[index + 1],
      survivalIntegral: integral,
    };
  });
}
