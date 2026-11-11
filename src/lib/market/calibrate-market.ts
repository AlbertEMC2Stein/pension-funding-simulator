import type { SimulationOptions } from "../options/simulation-options";

/** Numerical market options required for calibration; the already-derived real rate is used instead of the nominal rate. */
type MarketInput = Omit<SimulationOptions["market"], "nominalRiskFreeRate">;

/** Annual real model parameters, in the same asset order as the input. */
export interface CalibratedMarket {
  /** Asset names and all vector/matrix entries share this ordering. */
  assetNames: string[];
  /** Continuously compounded real rate per year and effective annual inflation. */
  realRiskFreeRate: number;
  inflationRate: number;
  realLogGrowth: number[];
  /** Arithmetic SDE drift and its excess over the real risk-free rate. */
  realDrift: number[];
  excessReturn: number[];
  covariance: number[][];
  /** Sigma-inverse times excess drift; not itself an allocation. */
  mertonDirection: number[];
  /** One half of the excess-drift quadratic form, as defined in the manuscript. */
  rho: number;
  /** Zero premium is calculable but outside the paper's analytical scope. */
  paperAssumptions: { positiveRho: boolean; nonnegativeMerton: boolean };
}

/** Successful calibrated market or an explanatory validation/numerical failure. */
type Result =
  { ok: true; market: CalibratedMarket } | { ok: false; error: string };

/**
 * Calibrate the paper's real Black–Scholes market from compounded nominal
 * growth, inflation, annual volatilities and correlations. This function has
 * no UI or worker dependencies, and never changes or rounds its input.
 *
 * With Sigma = D R D, solve R y = D^-1 theta via Cholesky, then m = D^-1 y.
 * This avoids explicitly inverting Sigma and uses the correlation scale for
 * the editor's existing positive-definiteness guard.
 */
export function calibrateMarket(input: MarketInput): Result {
  /** Construct a failed calibration result without throwing from normal validation paths. */
  const fail = (error: string): Result => ({ ok: false, error });
  const n = input.assets.length;
  if (n < 1 || n > 10 || input.currency !== "EUR")
    return fail("Select between 1 and 10 assets in euros.");
  if (
    !Number.isFinite(input.realRiskFreeRate) ||
    input.realRiskFreeRate <= 0 ||
    !Number.isFinite(input.inflationRate) ||
    input.inflationRate <= -1
  )
    return fail(
      "The real risk-free rate and inflation are outside the supported range.",
    );
  if (
    input.assets.some(
      (asset) =>
        !Number.isFinite(asset.nominalReturn) ||
        asset.nominalReturn <= -1 ||
        !Number.isFinite(asset.volatility) ||
        asset.volatility <= 0,
    )
  )
    return fail(
      "Each asset needs valid expected growth and positive volatility.",
    );
  const correlation = input.correlation;
  if (correlation.length !== n || correlation.some((row) => row.length !== n))
    return fail("The correlation matrix must match the number of assets.");
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const value = correlation[i][j];
      if (
        !Number.isFinite(value) ||
        Math.abs(value) > 1 ||
        value !== correlation[j][i] ||
        (i === j && value !== 1)
      )
        return fail(
          "The correlation matrix must be symmetric, have a unit diagonal, and contain values from -1 to 1.",
        );
    }
  }

  // Cholesky factorization R = L L^T, with the same residual guard as the editor.
  const lower = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let residual = correlation[i][j];
      for (let k = 0; k < j; k += 1) residual -= lower[i][k] * lower[j][k];
      if (i === j) {
        if (!Number.isFinite(residual) || residual <= 1e-12)
          return fail(
            "The correlation matrix is not positive definite or is numerically near-singular.",
          );
        lower[i][j] = Math.sqrt(residual);
      } else lower[i][j] = residual / lower[j][j];
    }
  }

  const vol = input.assets.map((asset) => asset.volatility);
  const realLogGrowth = input.assets.map(
    (asset) =>
      Math.log1p(asset.nominalReturn) - Math.log1p(input.inflationRate),
  );
  const realDrift = realLogGrowth.map((growth, i) => growth + vol[i] ** 2 / 2);
  const excessReturn = realDrift.map((drift) => drift - input.realRiskFreeRate);
  const covariance = correlation.map((row, i) =>
    row.map((value, j) => vol[i] * value * vol[j]),
  );
  const scaledExcess = excessReturn.map((value, i) => value / vol[i]);
  if (
    [
      ...realLogGrowth,
      ...realDrift,
      ...excessReturn,
      ...scaledExcess,
      ...covariance.flat(),
    ].some((value) => !Number.isFinite(value)) ||
    covariance.some((row, i) => row[i] <= 0)
  )
    return fail("Market parameters exceed the supported numerical range.");

  // Forward and backward substitution for L L^T y = D^-1 theta.
  const intermediate = Array<number>(n).fill(0);
  const scaledDirection = Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    let value = scaledExcess[i];
    for (let j = 0; j < i; j += 1) value -= lower[i][j] * intermediate[j];
    intermediate[i] = value / lower[i][i];
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    let value = intermediate[i];
    for (let j = i + 1; j < n; j += 1)
      value -= lower[j][i] * scaledDirection[j];
    scaledDirection[i] = value / lower[i][i];
  }
  const mertonDirection = scaledDirection.map((value, i) => value / vol[i]);
  // The Cholesky quadratic form is a sum of squares, avoiding cancellation.
  const rho = intermediate.reduce((sum, value) => sum + value * value, 0) / 2;
  const residual = Math.max(
    ...correlation.map((row, i) =>
      Math.abs(
        row.reduce((sum, value, j) => sum + value * scaledDirection[j], 0) -
          scaledExcess[i],
      ),
    ),
  );
  const scale =
    Math.max(
      ...correlation.map((row) =>
        row.reduce((sum, value) => sum + Math.abs(value), 0),
      ),
    ) *
      Math.max(...scaledDirection.map(Math.abs)) +
    Math.max(...scaledExcess.map(Math.abs));
  const zeroPremium = excessReturn.every((value) => value === 0);
  if (
    [...mertonDirection, rho, residual, scale].some(
      (value) => !Number.isFinite(value),
    ) ||
    residual > 1e-10 * scale ||
    (!zeroPremium && rho === 0)
  )
    return fail(
      "The market calculation is numerically unstable or outside the supported range.",
    );

  return {
    ok: true,
    market: {
      assetNames: input.assets.map((asset) => asset.name),
      realRiskFreeRate: input.realRiskFreeRate,
      inflationRate: input.inflationRate,
      realLogGrowth,
      realDrift,
      excessReturn,
      covariance,
      mertonDirection,
      rho,
      paperAssumptions: {
        positiveRho: !zeroPremium,
        nonnegativeMerton: mertonDirection.every((value) => value >= 0),
      },
    },
  };
}
