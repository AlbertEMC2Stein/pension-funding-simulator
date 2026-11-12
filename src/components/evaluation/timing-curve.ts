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

/**
 * Reduce a cumulative curve to at most approximately 1,000 risk-sized steps
 * for display. Retained points use their exact event times and values. Between
 * retained points the vertical error is less than one thousandth of the total
 * displayed risk; the first and last points are always kept. The full curve
 * remains authoritative for numerical results.
 */
export function simplifyRemainingRiskCurve(
  points: readonly ImpoverishmentForecastPoint[],
): ImpoverishmentForecastPoint[] {
  const total = points[points.length - 1].cumulativeRisk;
  const resolution = (total - points[0].cumulativeRisk) / 1000;
  const retained: ImpoverishmentForecastPoint[] = [points[0]];

  for (let index = 1; index < points.length - 1; index += 1) {
    const difference =
      points[index].cumulativeRisk -
      retained[retained.length - 1].cumulativeRisk;

    if (difference > 0 && difference >= resolution)
      retained.push(points[index]);
  }

  if (points.length > 1) retained.push(points[points.length - 1]);

  return retained.map((point) => ({
    timeYears: point.timeYears,
    cumulativeRisk: Math.max(0, total - point.cumulativeRisk),
  }));
}

/**
 * Insert the exact selected-age value into a simplified remaining-risk curve.
 * This keeps the marker on the drawn curve without reducing numerical accuracy
 * of the selected risk. Inputs are sorted, nonempty, and remain unchanged.
 */
export function includeSelectedRiskPoint(
  simplified: readonly ImpoverishmentForecastPoint[],
  cumulative: readonly ImpoverishmentForecastPoint[],
  time: number,
): ImpoverishmentForecastPoint[] {
  let lower = 0;
  let upper = simplified.length;

  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (simplified[middle].timeYears < time) lower = middle + 1;
    else upper = middle;
  }

  const selected = {
    timeYears: time,
    cumulativeRisk: remainingRiskAt(cumulative, time),
  };
  const next = simplified[lower]?.timeYears === time ? lower + 1 : lower;

  return [...simplified.slice(0, lower), selected, ...simplified.slice(next)];
}

/** A time interval and its average mortality-weighted risk density per year. */
export interface TimingDensityBin {
  startTime: number;
  endTime: number;
  density: number;
}

/** Density bins specified either by their width or by their total count. */
export type TimingDensityBinning =
  { widthYears: number } | { binCount: number };

/**
 * Estimate a density histogram from the full, right-continuous cumulative curve.
 * Each bin's area equals its cumulative-risk increment; events exactly at a bin
 * end belong to that bin. A possible time-zero hit is included in the first
 * bin. Width-based bins may end with a shorter interval; count-based bins span
 * the full horizon evenly. The caller supplies a nonempty curve with increasing
 * times and a positive width or a positive integer bin count.
 */
export function makeTimingDensityBins(
  points: readonly ImpoverishmentForecastPoint[],
  binning: TimingDensityBinning = { widthYears: 1 },
): TimingDensityBin[] {
  const start = points[0].timeYears;
  const horizon = points[points.length - 1].timeYears;
  const bins: TimingDensityBin[] = [];
  let index = 0;
  let previousRisk = 0;
  let currentRisk = 0;
  let binStart = start;
  const count =
    "binCount" in binning
      ? binning.binCount
      : Math.ceil((horizon - start) / binning.widthYears);

  for (let bin = 0; bin < count; bin += 1) {
    const binEnd =
      bin === count - 1
        ? horizon
        : "binCount" in binning
          ? start + ((horizon - start) * (bin + 1)) / count
          : Math.min(start + (bin + 1) * binning.widthYears, horizon);

    while (index < points.length && points[index].timeYears <= binEnd) {
      currentRisk = points[index].cumulativeRisk;
      index += 1;
    }

    bins.push({
      startTime: binStart,
      endTime: binEnd,
      density: Math.max(0, currentRisk - previousRisk) / (binEnd - binStart),
    });
    previousRisk = currentRisk;
    binStart = binEnd;
  }

  return bins;
}

/** Return the histogram density in the bin containing the selected time. */
export function timingDensityAt(
  bins: readonly TimingDensityBin[],
  time: number,
): number {
  return (
    bins.find((bin) => time >= bin.startTime && time <= bin.endTime)?.density ??
    0
  );
}

/**
 * Give a forecast plot a stable zero-based y-range with ten percent headroom.
 * Values include the full simulation series and any visible approximation;
 * neither the selected-age marker nor the slider position affects the range.
 * A small default range keeps an all-zero chart readable.
 */
export function forecastYAxisRange(
  simulationValues: readonly number[],
  approximationValues: readonly number[] = [],
): [number, number] {
  let maximum = 0;

  for (const value of simulationValues) maximum = Math.max(maximum, value);
  for (const value of approximationValues) maximum = Math.max(maximum, value);

  return [0, maximum > 0 ? maximum * 1.1 : 0.001];
}
