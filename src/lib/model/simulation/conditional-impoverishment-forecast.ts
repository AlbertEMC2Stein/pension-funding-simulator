import {
  prepareCompactifiedExponentialSurvival,
  prepareGompertzMakehamSurvival,
} from "../../mortality/mortality-models";
import type {
  ImpoverishmentForecastInput,
  ImpoverishmentForecastPoint,
} from "./impoverishment-forecast";

/** Conditional curve or the reason no conditional estimate can be reported. */
export type ConditionalForecastResult =
  | {
      available: true;
      /** Years after retirement at which the update is conditioned. */
      conditioningTime: number;
      horizonYears: number;
      /** Number of financial paths without a hit at the conditioning time. */
      eligiblePaths: number;
      /** Right-continuous event-time knots, including both interval endpoints. */
      points: ImpoverishmentForecastPoint[];
    }
  | {
      available: false;
      reason: "outside-horizon" | "no-eligible-paths" | "no-mortality-survival";
    };

/** A run's sorted financial hits, prepared for repeated age-slider updates. */
export interface PreparedConditionalForecast {
  /**
   * Evaluate remaining risk after the selected time without another simulation
   * or sorting the hit times again. The caller supplies years after retirement.
   */
  atTime(conditioningTime: number): ConditionalForecastResult;
}

/** Find the index after the final sorted hit at or before the conditioning time. */
function firstLaterHit(hits: readonly number[], time: number): number {
  let lower = 0;
  let upper = hits.length;

  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (hits[middle] <= time) lower = middle + 1;
    else upper = middle;
  }

  return lower;
}

/**
 * Prepare repeated conditional risk forecasts from one policy's completed run.
 * For a selected time a, the estimate conditions on being alive and not yet
 * impoverished at a. Under the model's mortality/financial independence, each
 * later hit t contributes S(t) / (S(a) * eligiblePaths). No-hit paths remain
 * in the denominator through the run horizon. A hit at a is excluded from the
 * conditioning group. Financial wealth itself is not observed or recalibrated.
 *
 * Hits are sorted once; calling atTime again does not simulate or sort again.
 * Input values come from a validated run. The result covers only the simulated
 * horizon and inherits its Monte Carlo, time-step and bridge errors. Float32
 * event times are capped for plotting at the horizon, while survival is
 * evaluated at the stored time, as in the unconditional forecast.
 */
export function prepareConditionalImpoverishmentForecast(
  input: ImpoverishmentForecastInput,
): PreparedConditionalForecast {
  const { firstHitTimes, mortality, horizonYears } = input;
  const survival =
    mortality.model === "gm"
      ? prepareGompertzMakehamSurvival(mortality.parameters)
      : prepareCompactifiedExponentialSurvival(mortality.parameters);
  const pathCount = firstHitTimes.length;
  const hits: number[] = [];

  for (let index = 0; index < pathCount; index += 1) {
    if (firstHitTimes[index] >= 0) hits.push(firstHitTimes[index]);
  }

  hits.sort((a, b) => a - b);

  /** Compute the curve on [conditioningTime, horizon] from the prepared hits. */
  function atTime(conditioningTime: number): ConditionalForecastResult {
    if (
      !Number.isFinite(conditioningTime) ||
      conditioningTime < 0 ||
      conditioningTime >= horizonYears
    )
      return { available: false, reason: "outside-horizon" };

    const first = firstLaterHit(hits, conditioningTime);
    const eligiblePaths = pathCount - first;

    if (eligiblePaths === 0)
      return { available: false, reason: "no-eligible-paths" };

    const survivalAtCondition = survival(conditioningTime);

    if (survivalAtCondition === 0)
      return { available: false, reason: "no-mortality-survival" };

    const points: ImpoverishmentForecastPoint[] = [
      { timeYears: conditioningTime, cumulativeRisk: 0 },
    ];
    let cumulativeRisk = 0;
    let index = first;

    while (index < hits.length) {
      const time = hits[index];
      let count = 0;

      while (index < hits.length && hits[index] === time) {
        count += 1;
        index += 1;
      }

      cumulativeRisk +=
        (count / eligiblePaths) * (survival(time) / survivalAtCondition);
      const plottedTime = Math.min(time, horizonYears);
      const previous = points[points.length - 1];

      if (plottedTime === previous.timeYears)
        previous.cumulativeRisk = cumulativeRisk;
      else points.push({ timeYears: plottedTime, cumulativeRisk });
    }

    if (points[points.length - 1].timeYears < horizonYears)
      points.push({ timeYears: horizonYears, cumulativeRisk });

    return {
      available: true,
      conditioningTime,
      horizonYears,
      eligiblePaths,
      points,
    };
  }

  return { atTime };
}
