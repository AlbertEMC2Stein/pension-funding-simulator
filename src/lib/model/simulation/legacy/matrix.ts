/**
 * Factor an annual covariance matrix as L Lᵀ with a stable Cholesky
 * decomposition, preserving the market's asset order.
 * @param _covariance The annual covariance matrix to factor.
 * @returns The lower triangular matrix L such that L Lᵀ = _covariance.
 * @throws Error if the covariance matrix is empty, not square, or not positive definite.
 */
export function covarianceFactor(
  _covariance: readonly (readonly number[])[],
): number[][] {
  let n = _covariance.length;

  if (n === 0) {
    throw new Error("Covariance matrix must be non-empty.");
  }
  for (let i = 0; i < n; i++) {
    if (_covariance[i].length !== n) {
      throw new Error("Covariance matrix must be square.");
    }
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(_covariance[i][j])) {
        throw new Error("Covariance matrix must contain finite values.");
      }
    }
    for (let j = 0; j < i; j++) {
      if (_covariance[i][j] !== _covariance[j][i]) {
        throw new Error("Covariance matrix must be symmetric.");
      }
    }
  }

  return factorPreparedCovariance(_covariance);
}

/** Factor a validated covariance matrix, retaining checks for numerical failure. */
export function factorPreparedCovariance(
  covariance: readonly (readonly number[])[],
): number[][] {
  const n = covariance.length;
  // Cholesky decomposition
  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = covariance[i][j];

      for (let k = 0; k < j; k++) {
        sum -= L[i][k] * L[j][k];
      }
      if (i === j) {
        if (!Number.isFinite(sum) || sum <= 0) {
          throw new Error("Covariance matrix must be positive definite.");
        }

        L[i][j] = Math.sqrt(sum);
      } else {
        L[i][j] = sum / L[j][j];

        if (!Number.isFinite(L[i][j]))
          throw new Error(
            "Covariance factorization produced a non-finite value.",
          );
      }
    }
  }

  return L;
}

/**
 * Transform independent standard normals z into asset log-return noise
 * L z √dt for an annual covariance factor L and step length dt in years.
 * @param _factor The lower triangular matrix L from the Cholesky decomposition of the annual covariance matrix.
 * @param _standardNormals A vector of independent standard normal random variables.
 * @param _timeStepYears The time step length in years.
 * @returns A vector of correlated log-return increments for the assets.
 * @throws Error if the covariance factor is empty, if the standard normals vector length does not match the covariance factor dimension, or if the time step is not a positive finite number.
 */
export function correlatedMarketIncrement(
  _factor: readonly (readonly number[])[],
  _standardNormals: readonly number[],
  _timeStepYears: number,
): number[] {
  const n = _factor.length;

  if (n === 0) {
    throw new Error("Covariance factor must be non-empty.");
  }
  if (_standardNormals.length !== n) {
    throw new Error(
      "Standard normals vector length must match covariance factor dimension.",
    );
  }
  if (
    _factor.some(
      (row) => row.length !== n || row.some((value) => !Number.isFinite(value)),
    ) ||
    _standardNormals.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(
      "Factor and normal draws must have valid dimensions and finite values.",
    );
  }
  if (!isFinite(_timeStepYears) || _timeStepYears <= 0) {
    throw new Error("Time step in years must be a positive finite number.");
  }

  return correlatePreparedIncrement(_factor, _standardNormals, _timeStepYears);
}

/** Transform trusted normals using a previously validated covariance factor. */
export function correlatePreparedIncrement(
  factor: readonly (readonly number[])[],
  normals: readonly number[],
  timeStepYears: number,
): number[] {
  const n = factor.length;
  const increment: number[] = Array(n).fill(0);
  const sqrtDt = Math.sqrt(timeStepYears);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      increment[i] += factor[i][j] * normals[j];
    }
    increment[i] *= sqrtDt;
  }

  return increment;
}
