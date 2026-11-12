import type { ImpoverishmentForecastPoint } from "../../lib/model/simulation/impoverishment-forecast";

/**
 * Return the probability after a given time and through the simulated horizon.
 * The input is a nonempty, right-continuous cumulative curve for one fixed
 * forecast or conditioning perspective. A hit at the selected time is already
 * in the cumulative value and therefore excluded from the remaining risk.
 */
export function remainingRiskAt(
  points: readonly ImpoverishmentForecastPoint[],
  time: number,
): number {
  let lower = 0;
  let upper = points.length;

  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (points[middle].timeYears <= time) lower = middle + 1;
    else upper = middle;
  }

  const cumulative = lower === 0 ? 0 : points[lower - 1].cumulativeRisk;
  const total = points[points.length - 1].cumulativeRisk;

  return Math.max(0, total - cumulative);
}

/** Convert cumulative event-time knots into remaining-risk values without changing their times. */
export function remainingRiskCurve(
  points: readonly ImpoverishmentForecastPoint[],
): ImpoverishmentForecastPoint[] {
  const total = points[points.length - 1].cumulativeRisk;

  return points.map((point) => ({
    timeYears: point.timeYears,
    cumulativeRisk: Math.max(0, total - point.cumulativeRisk),
  }));
}
