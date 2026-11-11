import {
  correlationMatrixError,
  MAX_ASSETS,
  type MarketCalibrationDraft,
} from "./market-calibration";
import { chiSquare95, studentT95 } from "../numerics/confidence-quantiles";

/** One observed positive price at its UTC calendar-day index. */
type Observation = { day: number; price: number };

/** Log return and elapsed calendar time in years between two observed prices. */
type Interval = { dt: number; logReturn: number };

/**
 * Unrounded imported-price estimates and coverage diagnostics in asset order.
 * Confidence intervals describe estimation uncertainty, not future returns.
 */
export interface HistoricalMarketEstimate {
  firstDate: string;
  lastDate: string;
  rows: number;
  missingCells: number;
  assets: {
    name: string;
    /** Calendar-time log-price drift per year. */
    annualLogGrowth: number;
    /** Annual compounded log growth, exp(annualLogGrowth) - 1. */
    compoundedGrowth: number;
    /** 95% bounds in decimal fractions for compounded growth and volatility. */
    growthInterval: { lower: number; upper: number };
    volatilityInterval: { lower: number; upper: number };
    /** Annualized log-return standard deviation. */
    volatility: number;
    /** Number of observed return intervals and their elapsed calendar years. */
    intervals: number;
    years: number;
    maxGapDays: number;
  }[];
  correlation: number[][];
  /** Pairwise estimates use only intervals with matching observed endpoints. */
  pairs: {
    first: string;
    second: string;
    intervals: number;
    years: number;
    maxGapDays: number;
    /** Approximate Fisher interval; null for insufficient or perfect-correlation data. */
    correlationInterval: { lower: number; upper: number } | null;
  }[];
}

/** Parse comma-separated rows including quoted headers, escaped quotes and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closedQuote = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
        closedQuote = true;
      } else field += ch;
    } else if (ch === '"') {
      if (field !== "" || closedQuote)
        throw new Error("Malformed CSV quotation.");

      quoted = true;
    } else if (ch === "," || ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      closedQuote = false;

      if (ch !== ",") {
        if (ch === "\r" && input[i + 1] === "\n") i += 1;

        rows.push(row);
        row = [];
      }
    } else {
      if (closedQuote)
        throw new Error("Unexpected text after a quoted CSV field.");

      field += ch;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  if (field !== "" || row.length > 0 || closedQuote) rows.push([...row, field]);

  return rows;
}

/** Parse a strict ISO calendar date into a UTC day index, rejecting invalid or normalized dates. */
function parseDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD.`);

  const time = Date.parse(`${value}T00:00:00Z`);

  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  )
    throw new Error(`Invalid date: ${value}.`);

  return time / 86_400_000;
}

/** Create calendar-time log-return intervals between consecutive observed prices; missing observations are not filled. */
function intervals(observations: Observation[]): Interval[] {
  return observations.slice(1).map((current, i) => ({
    dt: (current.day - observations[i].day) / 365.25,
    logReturn: Math.log(current.price) - Math.log(observations[i].price),
  }));
}

/** Estimate annual log drift and residuals normalized for irregular intervals. */
function fitIntervals(values: Interval[], label: string) {
  if (values.length < 3)
    throw new Error(`${label} needs at least 3 usable return intervals.`);

  const years = values.reduce((sum, item) => sum + item.dt, 0);
  const drift = values.reduce((sum, item) => sum + item.logReturn, 0) / years;
  const residuals = values.map(
    (item) => (item.logReturn - drift * item.dt) / Math.sqrt(item.dt),
  );
  const variance =
    residuals.reduce((sum, value) => sum + value * value, 0) /
    (values.length - 1);

  if (!Number.isFinite(drift) || !Number.isFinite(variance) || variance <= 0)
    throw new Error(`${label} has zero or invalid return variation.`);

  return {
    drift,
    variance,
    residuals,
    years,
    maxGapDays: values.reduce(
      (max, item) => Math.max(max, item.dt * 365.25),
      0,
    ),
  };
}

/** Fit simple historical estimates; all pairwise intervals have matching endpoints. */
export function estimateHistoricalMarket(
  csv: string,
): HistoricalMarketEstimate {
  const rows = parseCsv(csv);

  if (rows.length < 2)
    throw new Error("The CSV needs a header and price observations.");

  const header = rows[0].map((value) => value.trim());

  if (header[0] !== "" && header[0].toLowerCase() !== "date")
    throw new Error(
      'The first column must be a date index named "date" or left blank.',
    );

  const names = header.slice(1);

  if (names.length < 1 || names.length > MAX_ASSETS)
    throw new Error(`Provide between 1 and ${MAX_ASSETS} assets.`);
  if (
    names.some((name) => !name) ||
    new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length
  )
    throw new Error("Asset column names must be nonempty and unique.");

  const series: Observation[][] = names.map(() => []);
  let previousDay = -Infinity,
    missingCells = 0;
  const dates: string[] = [];
  rows.slice(1).forEach((row, index) => {
    if (row.length !== header.length)
      throw new Error(`Row ${index + 2} has the wrong number of columns.`);

    const date = row[0].trim();
    const day = parseDay(date);

    if (day <= previousDay)
      throw new Error("Dates must be unique and in ascending order.");

    previousDay = day;
    dates.push(date);
    row.slice(1).forEach((raw, i) => {
      const text = raw.trim();

      if (!text) {
        missingCells += 1;

        return;
      }
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
        throw new Error(`Invalid price for ${names[i]} on ${date}.`);

      const price = Number(text);

      if (!Number.isFinite(price) || price <= 0)
        throw new Error(
          `Prices must be positive and finite (${names[i]}, ${date}).`,
        );

      series[i].push({ day, price });
    });
  });
  const assets = series.map((observations, i) => {
    const values = intervals(observations);
    const fit = fitIntervals(values, names[i]);
    const compoundedGrowth = Math.expm1(fit.drift);
    // Under independent Gaussian log increments, the log-drift estimate has
    // standard error σ / √total time; its estimated scale gives a t interval.
    const margin =
      studentT95(values.length - 1) * Math.sqrt(fit.variance / fit.years);
    const growthInterval = {
      lower: Math.expm1(fit.drift - margin),
      upper: Math.expm1(fit.drift + margin),
    };
    const [chiLower, chiUpper] = chiSquare95(values.length - 1);
    const sumSquares = (values.length - 1) * fit.variance;
    const volatilityInterval = {
      lower: Math.sqrt(sumSquares / chiUpper),
      upper: Math.sqrt(sumSquares / chiLower),
    };

    if (!Number.isFinite(compoundedGrowth) || compoundedGrowth <= -1)
      throw new Error(
        `${names[i]} has a growth estimate outside the supported range.`,
      );

    return {
      name: names[i],
      annualLogGrowth: fit.drift,
      compoundedGrowth,
      growthInterval,
      volatilityInterval,
      volatility: Math.sqrt(fit.variance),
      intervals: values.length,
      years: fit.years,
      maxGapDays: fit.maxGapDays,
    };
  });
  const correlation: number[][] = names.map((_, i) =>
    names.map((__, j) => (i === j ? 1 : 0)),
  );
  const pairs: HistoricalMarketEstimate["pairs"] = [];

  for (let i = 0; i < names.length; i += 1)
    for (let j = i + 1; j < names.length; j += 1) {
      const right = new Map(series[j].map((point) => [point.day, point]));
      const leftCommon = series[i].filter((point) => right.has(point.day));
      const rightCommon = leftCommon.map((point) => right.get(point.day)!);
      const leftIntervals = intervals(leftCommon),
        rightIntervals = intervals(rightCommon);
      const left = fitIntervals(leftIntervals, `${names[i]} / ${names[j]}`);
      const rightFit = fitIntervals(
        rightIntervals,
        `${names[i]} / ${names[j]}`,
      );
      const cross = left.residuals.reduce(
        (sum, value, k) => sum + value * rightFit.residuals[k],
        0,
      );
      const denominator =
        Math.sqrt(left.variance * rightFit.variance) *
        (leftIntervals.length - 1);
      const raw = cross / denominator;

      if (!Number.isFinite(raw) || Math.abs(raw) > 1 + 1e-12)
        throw new Error(
          `Could not estimate correlation for ${names[i]} / ${names[j]}.`,
        );

      const value = Math.max(-1, Math.min(1, raw));
      correlation[i][j] = value;
      correlation[j][i] = value;
      // Fisher's z interval is approximate and needs more than three paired
      // intervals. Perfect sample correlations have no finite z transform.
      const correlationInterval =
        leftIntervals.length > 3 && Math.abs(value) < 1
          ? (() => {
              const z = Math.atanh(value);
              const margin =
                1.959963984540054 / Math.sqrt(leftIntervals.length - 3);

              return {
                lower: Math.tanh(z - margin),
                upper: Math.tanh(z + margin),
              };
            })()
          : null;
      pairs.push({
        first: names[i],
        second: names[j],
        intervals: leftIntervals.length,
        years: left.years,
        maxGapDays: left.maxGapDays,
        correlationInterval,
      });
    }

  const matrixError = correlationMatrixError(
    correlation.map((row) => row.map(String)),
  );

  if (matrixError)
    throw new Error(
      `The estimated correlation matrix cannot be used: ${matrixError}`,
    );

  return {
    firstDate: dates[0],
    lastDate: dates.at(-1)!,
    rows: dates.length,
    missingCells,
    assets,
    correlation,
    pairs,
  };
}

/** Round imported estimates to the two decimals used by the editable inputs. */
export function historicalMarketToDraft(
  estimate: HistoricalMarketEstimate,
  current: MarketCalibrationDraft,
): MarketCalibrationDraft {
  /** Round a finite imported percentage or correlation to two editable decimal places, normalizing negative zero. */
  const format = (value: number) => {
    if (!Number.isFinite(value) || Math.abs(value) >= 1e21)
      throw new Error(
        "An estimated value is too large to display with two decimal places.",
      );

    const rounded = value.toFixed(2);

    return Number(rounded) === 0 ? "0.00" : rounded;
  };
  const assets = estimate.assets.map((asset, i) => ({
    id: current.nextAssetId + i,
    name: asset.name,
    nominalReturnPercent: format(asset.compoundedGrowth * 100),
    volatilityPercent: format(asset.volatility * 100),
  }));
  const correlations = estimate.correlation.map((row) => row.map(format));

  if (
    assets.some(
      (asset) =>
        Number(asset.volatilityPercent) <= 0 ||
        Number(asset.nominalReturnPercent) <= -100,
    )
  ) {
    throw new Error(
      "An estimated growth rate or volatility is outside the supported range after rounding to two decimals.",
    );
  }

  const error = correlationMatrixError(correlations);

  if (error)
    throw new Error(
      `The estimated matrix cannot be used after rounding to two decimals: ${error}`,
    );

  return {
    ...current,
    assets,
    correlations,
    nextAssetId: current.nextAssetId + assets.length,
  };
}
