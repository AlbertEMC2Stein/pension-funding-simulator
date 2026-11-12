import { adaptiveQuadrature } from "../../numerics/adaptive-quadrature";
import {
  prepareCompactifiedExponentialSurvival,
  prepareGompertzMakehamSurvival,
  type CompactifiedExponentialParameters,
  type GompertzMakehamParameters,
} from "../../mortality/mortality-models";

/** Captured unconstrained CE feedback and the two mortality laws for a run. */
export interface DurbinApproximationInput {
  realRiskFreeRate: number;
  /** Half the market excess-return quadratic form. */
  rho: number;
  ce: CompactifiedExponentialParameters;
  gm: GompertzMakehamParameters;
  /** Exact unconstrained CE risk for the run's initial wealth and withdrawal. */
  ceRisk: number;
  /** Simulated horizon, not exceeding the CE endpoint. */
  horizonYears: number;
}

/** One approximation point: time in years after retirement and risk or density. */
export interface DurbinPoint {
  timeYears: number;
  value: number;
}

/** Results for one forecast or age-conditioned perspective. */
export type DurbinView =
  | { available: true; tail: DurbinPoint[]; density: DurbinPoint[] }
  | {
      available: false;
      reason:
        "outside-horizon" | "unstable-conditioning" | "invalid-probability";
    };

/** Prepared first-term approximation; its numerical error is not certified. */
export interface DurbinApproximation {
  /** CE-weighted first-term mass across the full CE horizon. */
  ceWeightedMass: number;
  /** Estimated TV bound for the CE law conditioned on eventual impoverishment before death. */
  ceConditionalEventTvBound: number | null;
  /** Adaptive quadrature's summed local error estimates, not a rigorous error bound. */
  quadratureErrorEstimate: number;
  /** Calculate GM-weighted forecast or age-conditioned curves for the captured run. */
  view(conditioningTime: number | null): DurbinView;
}

/** One sorted integration panel and its cumulative numerical mass. */
interface IntegralGrid {
  times: number[];
  financialPrefix: number[];
  gmSuffix: number[];
  ceWeightedMass: number;
  estimatedError: number;
}

/**
 * Prepare the manuscript's first Durbin term for the unconstrained compatible
 * CE feedback. Its Brownian boundary uses the exact CE risk and the market's
 * rho convention. The financial hit density is weighted by GM survival for
 * the dashboard and by CE survival solely for the manuscript's TV diagnostic.
 *
 * The first term is an approximation, not a normalized financial density.
 * Conditional updates use 1 minus its financial mass before the selected age;
 * if that becomes non-positive or the implied risk exceeds one, the update is
 * reported unavailable rather than silently normalized or clipped. The CE TV
 * bound concerns the distribution conditioned on impoverishment before death,
 * not this dashboard's GM or age-conditioned curves.
 */
export function prepareDurbinApproximation(
  input: DurbinApproximationInput,
): DurbinApproximation {
  const { realRiskFreeRate: r, rho, ce, gm, ceRisk: q, horizonYears } = input;
  const { tau, p: delta } = ce;
  const gmSurvival = prepareGompertzMakehamSurvival(gm);
  const ceSurvival = prepareCompactifiedExponentialSurvival(ce);

  if (
    !Number.isFinite(q) ||
    q < 0 ||
    q >= 1 ||
    !Number.isFinite(rho) ||
    rho <= 0 ||
    !Number.isFinite(r) ||
    r <= 0 ||
    delta <= 1 ||
    horizonYears <= 0 ||
    horizonYears > tau
  )
    throw new RangeError(
      "Durbin approximation is unavailable for these model inputs.",
    );

  // At or above the safe level the financial hit probability is zero.
  if (q === 0) {
    return {
      ceWeightedMass: 0,
      ceConditionalEventTvBound: null,
      quadratureErrorEstimate: 0,
      view: (time) => {
        if (
          time !== null &&
          (!Number.isFinite(time) || time < 0 || time >= horizonYears)
        )
          return { available: false, reason: "outside-horizon" };
        const start = time ?? 0;
        const zero = [
          { timeYears: start, value: 0 },
          { timeYears: horizonYears, value: 0 },
        ];

        return { available: true, tail: zero, density: zero };
      },
    };
  }

  const sigma = Math.sqrt(2 * rho) / (delta - 1);
  const drift = r - (2 * rho) / (delta - 1) - sigma ** 2 / 2;
  const logInitialRatio = -Math.log(q) / delta;
  const logInitialBoundary = Math.log(-Math.expm1(-r * tau));

  /** Evaluate the first tangent term in log space on the open CE interval. */
  function financialDensity(time: number): number {
    if (time <= 0 || time >= tau) return 0;

    const remaining = tau - time;
    const logRatio = Math.log(-Math.expm1(-r * remaining)) - logInitialBoundary;
    const boundary = (logRatio + logInitialRatio - drift * time) / sigma;
    const intercept =
      (logRatio + logInitialRatio + (time * r) / Math.expm1(r * remaining)) /
      sigma;

    if (!(intercept > 0) || !Number.isFinite(intercept))
      throw new RangeError(
        "The Durbin boundary is outside the supported numerical range.",
      );

    const logDensity =
      Math.log(intercept) -
      0.5 * Math.log(2 * Math.PI) -
      1.5 * Math.log(time) -
      boundary ** 2 / (2 * time);

    return Math.exp(logDensity);
  }

  /** Integrate one panel using tolerances scaled to the full mortality endpoint. */
  function integrate(fn: (time: number) => number, start: number, end: number) {
    return adaptiveQuadrature(
      fn,
      start,
      end,
      (1e-12 * (end - start)) / tau + 1e-16,
      1e-8,
    );
  }

  const gmDensity = (time: number) => financialDensity(time) * gmSurvival(time);
  const ceDensity = (time: number) => financialDensity(time) * ceSurvival(time);
  const times = [0, tau, horizonYears];

  // Uniform panels resolve the central range. Geometric panels resolve both
  // endpoint layers and the small-time peak as the starting risk approaches 1.
  for (let i = 1; i < 256; i += 1) times.push((tau * i) / 256);
  for (let power = 1; power <= 42; power += 1) {
    const offset = tau * 2 ** -power;
    if (offset > 0 && offset < tau) times.push(offset, tau - offset);
  }
  const initialBoundary = logInitialRatio / sigma;
  const peakScale = (initialBoundary * initialBoundary) / 3;
  for (let power = -12; power <= 12; power += 1) {
    const candidate = peakScale * 2 ** power;
    if (candidate > 0 && candidate < tau) times.push(candidate);
  }

  times.sort((a, b) => a - b);
  const unique = times.filter(
    (value, index) => index === 0 || value > times[index - 1],
  );
  const financialPrefix = [0];
  const gmMasses: number[] = [];
  let ceWeightedMass = 0;
  let estimatedError = 0;

  for (let i = 1; i < unique.length; i += 1) {
    const start = unique[i - 1];
    const end = unique[i];
    const financial = integrate(financialDensity, start, end);
    const weightedGm = integrate(gmDensity, start, end);
    const weightedCe = integrate(ceDensity, start, end);
    financialPrefix.push(financialPrefix[i - 1] + financial.value);
    gmMasses.push(weightedGm.value);
    ceWeightedMass += weightedCe.value;
    estimatedError +=
      financial.estimatedError +
      weightedGm.estimatedError +
      weightedCe.estimatedError;
  }

  const gmSuffix = Array<number>(unique.length).fill(0);
  for (let i = gmMasses.length - 1; i >= 0; i -= 1)
    gmSuffix[i] = gmSuffix[i + 1] + gmMasses[i];

  // The first term dominates the financial density under the stated theory.
  // These consistency checks catch missed peaks and unsupported numerical cases.
  const tolerance = Math.max(1e-7, estimatedError * 20);
  if (financialPrefix.at(-1)! < 1 - tolerance || ceWeightedMass < q - tolerance)
    throw new RangeError(
      "The Durbin approximation failed a numerical consistency check.",
    );

  const grid: IntegralGrid = {
    times: unique,
    financialPrefix,
    gmSuffix,
    ceWeightedMass,
    estimatedError,
  };
  const ceConditionalEventTvBound =
    ceWeightedMass > 0 && ceWeightedMass >= q ? 1 - q / ceWeightedMass : null;

  /** Locate a time within the prepared panel grid. */
  function panel(time: number): number {
    let lower = 0;
    let upper = grid.times.length - 1;
    while (upper - lower > 1) {
      const middle = Math.floor((lower + upper) / 2);
      if (grid.times[middle] <= time) lower = middle;
      else upper = middle;
    }

    return lower;
  }

  /** Integrate the financial first term from retirement to the selected time. */
  function financialMassUntil(time: number): number {
    if (time <= 0) return 0;
    if (time >= tau) return grid.financialPrefix.at(-1)!;
    const i = panel(time);
    if (time === grid.times[i]) return grid.financialPrefix[i];

    return (
      grid.financialPrefix[i] +
      integrate(financialDensity, grid.times[i], time).value
    );
  }

  /** Integrate the GM-weighted first term from the selected time to the endpoint. */
  function gmMassAfter(time: number): number {
    if (time <= 0) return grid.gmSuffix[0];
    if (time >= tau) return 0;
    const i = panel(time);
    if (time === grid.times[i]) return grid.gmSuffix[i];

    return (
      grid.gmSuffix[i + 1] + integrate(gmDensity, time, grid.times[i + 1]).value
    );
  }

  /** Produce the two GM curves, conditioned at one fixed time when requested. */
  function view(conditioningTime: number | null): DurbinView {
    if (
      conditioningTime !== null &&
      (!Number.isFinite(conditioningTime) ||
        conditioningTime < 0 ||
        conditioningTime >= horizonYears)
    )
      return { available: false, reason: "outside-horizon" };

    const start = conditioningTime ?? 0;
    const remainingFinancial =
      conditioningTime === null ? 1 : 1 - financialMassUntil(start);
    const denominator =
      conditioningTime === null ? 1 : gmSurvival(start) * remainingFinancial;

    if (!(denominator > 0))
      return { available: false, reason: "unstable-conditioning" };

    const pastHorizon = gmMassAfter(horizonYears);
    const total = Math.max(0, gmMassAfter(start) - pastHorizon) / denominator;
    if (!Number.isFinite(total) || total > 1 + tolerance)
      return { available: false, reason: "invalid-probability" };

    const sampleTimes = [
      start,
      ...grid.times.filter((time) => time > start && time < horizonYears),
      horizonYears,
    ];
    const tail = sampleTimes.map((time) => ({
      timeYears: time,
      value: Math.max(0, gmMassAfter(time) - pastHorizon) / denominator,
    }));
    const density = sampleTimes.map((time) => ({
      timeYears: time,
      value: gmDensity(time) / denominator,
    }));

    return { available: true, tail, density };
  }

  return {
    ceWeightedMass,
    ceConditionalEventTvBound,
    quadratureErrorEstimate: grid.estimatedError,
    view,
  };
}
