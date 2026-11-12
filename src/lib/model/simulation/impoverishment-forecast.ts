import {
  prepareCompactifiedExponentialSurvival,
  prepareGompertzMakehamSurvival,
  type CompactifiedExponentialParameters,
  type GompertzMakehamParameters,
} from "../../mortality/mortality-models";

/** Mortality law used to weight financial first-hit times. */
export type ForecastMortality =
  | { model: "gm"; parameters: GompertzMakehamParameters }
  | { model: "ce"; parameters: CompactifiedExponentialParameters };

/** Inputs captured from one policy's completed, validated simulation run. */
export interface ImpoverishmentForecastInput {
  /** First-hit years after retirement; -1 denotes no hit by the run horizon. */
  firstHitTimes: ArrayLike<number>;
  /** Last simulated time in years after retirement. */
  horizonYears: number;
  mortality: ForecastMortality;
}

/** One point on the right-continuous forecast cumulative risk curve. */
export interface ImpoverishmentForecastPoint {
  /** Years after retirement, between zero and the run horizon. */
  timeYears: number;
  /** Estimated probability of impoverishment by this time and before death. */
  cumulativeRisk: number;
}

/** Forecast curve and its horizon; the curve is not normalized to reach one. */
export interface ImpoverishmentForecast {
  horizonYears: number;
  pathCount: number;
  /** Event-time knots, including time zero and the run horizon. */
  points: ImpoverishmentForecastPoint[];
}

/**
 * Estimate the forecast cumulative probability of financial impoverishment
 * before death, assessed at retirement. Assuming mortality is independent of
 * financial paths, a hit at time t contributes survival(t) / pathCount to
 * the cumulative curve at t and thereafter; a no-hit path contributes zero.
 *
 * The right-continuous empirical curve is evaluated at distinct hit times and
 * at both endpoints. Times are years after retirement, not attained ages.
 * First-hit times and horizon come from a validated completed run; the -1
 * sentinel is not an event. Float32 hit times can round slightly past the
 * horizon, so their plotted time is capped at the horizon while survival is
 * evaluated at the stored time, consistently with the risk estimator.
 *
 * Results describe events through the simulated horizon only. They inherit
 * Monte Carlo, time-step and bridge errors; no confidence band is produced.
 * Neither the source hit-time array nor the mortality parameters are mutated.
 */
export function calculateImpoverishmentForecast(
  input: ImpoverishmentForecastInput,
): ImpoverishmentForecast {
  const { firstHitTimes, horizonYears, mortality } = input;
  const survival =
    mortality.model === "gm"
      ? prepareGompertzMakehamSurvival(mortality.parameters)
      : prepareCompactifiedExponentialSurvival(mortality.parameters);
  const pathCount = firstHitTimes.length;
  const hits: number[] = [];

  for (let i = 0; i < pathCount; i += 1) {
    if (firstHitTimes[i] >= 0) hits.push(firstHitTimes[i]);
  }

  hits.sort((a, b) => a - b);
  const points: ImpoverishmentForecastPoint[] = [
    { timeYears: 0, cumulativeRisk: 0 },
  ];
  let cumulativeRisk = 0;
  let index = 0;

  while (index < hits.length) {
    const time = hits[index];
    let count = 0;

    while (index < hits.length && hits[index] === time) {
      count += 1;
      index += 1;
    }

    cumulativeRisk += (count * survival(time)) / pathCount;
    const plottedTime = Math.min(time, horizonYears);
    const previous = points[points.length - 1];

    if (plottedTime === previous.timeYears)
      previous.cumulativeRisk = cumulativeRisk;
    else points.push({ timeYears: plottedTime, cumulativeRisk });
  }

  if (points[points.length - 1].timeYears < horizonYears)
    points.push({ timeYears: horizonYears, cumulativeRisk });

  return { horizonYears, pathCount, points };
}
