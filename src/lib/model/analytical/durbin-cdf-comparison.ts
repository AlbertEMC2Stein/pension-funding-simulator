import {
  prepareCompactifiedExponentialSurvival,
  type CompactifiedExponentialParameters,
} from "../../mortality/mortality-models";
import type { DurbinApproximation } from "./durbin-approximation";

/** Empirical sup distance or a reason the CE conditional comparison is unavailable. */
export type DurbinCdfComparison =
  | { available: true; supDistance: number; weightedHits: number }
  | {
      available: false;
      reason: "truncated-horizon" | "no-weighted-hits" | "no-durbin-mass";
    };

/**
 * Compare the survival-weighted empirical CE CDF conditional on impoverishment
 * before death with the corresponding normalized first-term Durbin CDF.
 * The sample's full CE horizon is required: censoring earlier would change the
 * conditional law. The empirical curve jumps at observed hit times, so evaluate
 * the continuous Durbin CDF against both limits of every distinct jump; the
 * result is the sup distance from the empirical step curve, up to quadrature.
 *
 * Financial hit times come from a validated run; -1 indicates no hit. Mortality
 * is integrated out by CE survival weights, as in the risk estimator. The
 * result includes sampling, bridge, time-step and numerical integration error;
 * it is not a certified bound and may exceed the theoretical TV bound.
 */
export function compareDurbinConditionalCdf(input: {
  firstHitTimes: ArrayLike<number>;
  ce: CompactifiedExponentialParameters;
  horizonYears: number;
  approximation: DurbinApproximation;
}): DurbinCdfComparison {
  const { firstHitTimes, ce, horizonYears, approximation } = input;

  if (horizonYears < ce.tau)
    return { available: false, reason: "truncated-horizon" };
  if (!(approximation.ceWeightedMass > 0))
    return { available: false, reason: "no-durbin-mass" };

  const survival = prepareCompactifiedExponentialSurvival(ce);
  const hits: number[] = [];
  let totalWeight = 0;

  for (let i = 0; i < firstHitTimes.length; i += 1) {
    const time = firstHitTimes[i];
    if (time < 0) continue;
    const weight = survival(time);
    if (weight === 0) continue;
    hits.push(time);
    totalWeight += weight;
  }

  if (!(totalWeight > 0))
    return { available: false, reason: "no-weighted-hits" };

  hits.sort((a, b) => a - b);
  let cumulative = 0;
  let distance = 0;
  let index = 0;

  while (index < hits.length) {
    const time = hits[index];
    const theoretical = approximation.ceConditionalCdf(time);
    if (theoretical === null)
      return { available: false, reason: "no-durbin-mass" };

    distance = Math.max(
      distance,
      Math.abs(cumulative / totalWeight - theoretical),
    );
    const weight = survival(time);

    while (index < hits.length && hits[index] === time) {
      cumulative += weight;
      index += 1;
    }

    distance = Math.max(
      distance,
      Math.abs(cumulative / totalWeight - theoretical),
    );
  }

  return { available: true, supDistance: distance, weightedHits: hits.length };
}
