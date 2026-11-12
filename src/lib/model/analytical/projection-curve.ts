import { safeBoundary } from "./safe-boundary";
import { projectCovarianceSimplex } from "./simplex-projection";

/** Inputs for preparing a projected CE allocation curve, in calibrated asset order. */
export interface ProjectionCurveInput {
  covariance: readonly (readonly number[])[];
  mertonDirection: readonly number[];
  realRiskFreeRate: number;
  annualWithdrawal: number;
  impoverishmentLevel: number;
  /** CE mortality endpoint in years after retirement. */
  mortalityEndpoint: number;
  /** CE parameter delta, which must be greater than one. */
  delta: number;
}

/** A breakpoint and the projected allocation at that scale. */
export interface ProjectionKnot {
  scale: number;
  allocation: readonly number[];
}

/** Projected allocation on the bounded scale interval, represented by its knots. */
export interface ProjectionCurve {
  minScale: number;
  maxScale: number;
  knots: readonly ProjectionKnot[];
}

/** Solve a positive-definite principal covariance system by Cholesky factorization. */
function solvePrincipal(
  matrix: readonly (readonly number[])[],
  rhs: readonly number[],
): number[] {
  const n = rhs.length;
  const factor = Array.from({ length: n }, () => Array<number>(n).fill(0));

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let value = matrix[i][j];

      for (let k = 0; k < j; k += 1) value -= factor[i][k] * factor[j][k];

      if (i === j) {
        if (!(value > 0))
          throw new RangeError("Covariance must be positive definite.");
        factor[i][j] = Math.sqrt(value);
      } else {
        factor[i][j] = value / factor[j][j];
      }
    }
  }

  const forward = Array<number>(n).fill(0);
  const solution = Array<number>(n).fill(0);

  for (let i = 0; i < n; i += 1) {
    let value = rhs[i];
    for (let j = 0; j < i; j += 1) value -= factor[i][j] * forward[j];
    forward[i] = value / factor[i][i];
  }

  for (let i = n - 1; i >= 0; i -= 1) {
    let value = forward[i];
    for (let j = i + 1; j < n; j += 1) value -= factor[j][i] * solution[j];
    solution[i] = value / factor[i][i];
  }

  return solution;
}

/** Intersect an interval with the affine inequality intercept + slope * scale >= 0. */
function restrictInterval(
  interval: [number, number],
  intercept: number,
  slope: number,
): void {
  if (slope > 0) interval[0] = Math.max(interval[0], -intercept / slope);
  else if (slope < 0) interval[1] = Math.min(interval[1], -intercept / slope);
  else if (intercept < 0) interval[1] = -Infinity;
}

/**
 * Find the scale interval where one proposed simplex face satisfies the KKT
 * conditions. On that face both the allocation and multiplier are affine in
 * scale. Empty intervals represent faces that the projection never visits.
 */
function faceInterval(
  matrix: readonly (readonly number[])[],
  direction: readonly number[],
  free: readonly number[],
  sumActive: boolean,
  maxScale: number,
): [number, number] {
  const n = direction.length;
  const linear = matrix.map((row) =>
    row.reduce((total, value, j) => total + value * direction[j], 0),
  );
  const principal = free.map((i) => free.map((j) => matrix[i][j]));
  const v = solvePrincipal(
    principal,
    free.map((i) => linear[i]),
  );
  const intercept = Array<number>(n).fill(0);
  const slope = Array<number>(n).fill(0);
  let multiplierIntercept = 0;
  let multiplierSlope = 0;

  if (sumActive) {
    const w = solvePrincipal(
      principal,
      free.map(() => 1),
    );
    const sumW = w.reduce((total, value) => total + value, 0);
    const sumV = v.reduce((total, value) => total + value, 0);
    multiplierIntercept = -1 / sumW;
    multiplierSlope = sumV / sumW;

    free.forEach((index, j) => {
      intercept[index] = w[j] / sumW;
      slope[index] = v[j] - multiplierSlope * w[j];
    });
  } else {
    free.forEach((index, j) => {
      slope[index] = v[j];
    });
  }

  const interval: [number, number] = [0, maxScale];
  const isFree = Array.from({ length: n }, (_, i) => free.includes(i));

  for (let i = 0; i < n; i += 1) {
    if (isFree[i]) {
      restrictInterval(interval, intercept[i], slope[i]);
    } else {
      const gradientIntercept = matrix[i].reduce(
        (total, value, j) => total + value * intercept[j],
        multiplierIntercept,
      );
      const gradientSlope = matrix[i].reduce(
        (total, value, j) => total + value * slope[j],
        multiplierSlope - linear[i],
      );
      restrictInterval(interval, gradientIntercept, gradientSlope);
    }
  }

  if (sumActive) {
    restrictInterval(interval, multiplierIntercept, multiplierSlope);
  } else {
    restrictInterval(
      interval,
      1 - intercept.reduce((total, value) => total + value, 0),
      -slope.reduce((total, value) => total + value, 0),
    );
  }

  return interval;
}

/**
 * Prepare the exact piecewise-affine covariance projection of a times the
 * Merton direction. The scale is bounded by the limiting values at
 * (T, x_imp) and (0, x_imp); both endpoints are included as limits because
 * the portfolio itself stops at the impoverishment boundary.
 *
 * Enumerating simplex faces is a one-time operation for a validated market of
 * at most ten assets. KKT inequalities give each face's valid scale interval;
 * its endpoints are the breakpoints. Calibrated inputs are trusted here.
 */
export function prepareProjectionCurve(
  input: ProjectionCurveInput,
): ProjectionCurve {
  const {
    covariance,
    mertonDirection,
    realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel,
    mortalityEndpoint,
    delta,
  } = input;
  const safeAtStart = safeBoundary({
    realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel,
    mortalityEndpoint,
    time: 0,
  });
  const safeAtEnd = safeBoundary({
    realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel,
    mortalityEndpoint,
    time: mortalityEndpoint,
  });
  const minScale =
    (safeAtEnd - impoverishmentLevel) / impoverishmentLevel / (delta - 1);
  const maxScale =
    (safeAtStart - impoverishmentLevel) / impoverishmentLevel / (delta - 1);
  const n = mertonDirection.length;
  const scale = Math.max(...covariance.map((row, i) => row[i]));
  const matrix = covariance.map((row) => row.map((value) => value / scale));
  const breakpoints = [minScale, maxScale];

  for (let mask = 0; mask < 2 ** n; mask += 1) {
    const free = Array.from({ length: n }, (_, i) => i).filter(
      (i) => (mask & (1 << i)) !== 0,
    );

    for (const sumActive of [false, true]) {
      if (sumActive && free.length === 0) continue;
      const [lower, upper] = faceInterval(
        matrix,
        mertonDirection,
        free,
        sumActive,
        maxScale,
      );

      if (lower <= upper && upper >= minScale && lower <= maxScale) {
        breakpoints.push(Math.max(minScale, lower), Math.min(maxScale, upper));
      }
    }
  }

  breakpoints.sort((a, b) => a - b);
  const unique = breakpoints.filter(
    (value, i) => i === 0 || value > breakpoints[i - 1],
  );
  const knots = unique.map((value) => ({
    scale: value,
    allocation: projectCovarianceSimplex({
      allocation: mertonDirection.map((entry) => value * entry),
      covariance,
    }),
  }));

  return { minScale, maxScale, knots };
}

/** Linearly interpolate a prepared curve at a scale within its stored range. */
export function interpolateProjection(
  curve: ProjectionCurve,
  scale: number,
): number[] {
  if (
    scale < curve.minScale ||
    scale > curve.maxScale ||
    !Number.isFinite(scale)
  )
    throw new RangeError("Projection scale is outside the prepared range.");

  let lower = 0;
  let upper = curve.knots.length - 1;

  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2);
    if (curve.knots[middle].scale <= scale) lower = middle;
    else upper = middle;
  }

  const left = curve.knots[lower];
  const right = curve.knots[upper];
  if (left.scale === right.scale) return [...left.allocation];
  const weight = (scale - left.scale) / (right.scale - left.scale);

  return left.allocation.map(
    (value, i) => value + weight * (right.allocation[i] - value),
  );
}
