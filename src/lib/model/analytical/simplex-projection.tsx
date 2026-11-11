/** A covariance matrix and allocation in a shared asset order. */
export interface SimplexProjectionInput {
    allocation: readonly number[];
    covariance: readonly (readonly number[])[];
}

/**
 * Solve a positive-definite linear system by Cholesky factorization. Principal
 * covariance submatrices are positive definite when the calibrated market is.
 */
function solvePositiveDefinite(matrix: readonly (readonly number[])[], rhs: readonly number[]): number[] {
    const size = rhs.length;
    const factor = Array.from({ length: size }, () => Array<number>(size).fill(0));

    for (let i = 0; i < size; i += 1) {
        for (let j = 0; j <= i; j += 1) {
            let value = matrix[i][j];
            for (let k = 0; k < j; k += 1) value -= factor[i][k] * factor[j][k];

            if (i === j) {
                if (!(value > 0)) throw new RangeError("Covariance submatrix is not positive definite.");
                factor[i][j] = Math.sqrt(value);
            } else factor[i][j] = value / factor[j][j];
        }
    }

    const forward = Array<number>(size).fill(0);
    const solution = Array<number>(size).fill(0);

    for (let i = 0; i < size; i += 1) {
        let value = rhs[i];
        for (let j = 0; j < i; j += 1) value -= factor[i][j] * forward[j];
        forward[i] = value / factor[i][i];
    }
    for (let i = size - 1; i >= 0; i -= 1) {
        let value = forward[i];
        for (let j = i + 1; j < size; j += 1) value -= factor[j][i] * solution[j];
        solution[i] = value / factor[i][i];
    }

    return solution;
}

/**
 * Project an allocation onto {x ≥ 0, sum(x) ≤ 1} in the covariance norm.
 * A feasible active-set method solves the strictly convex quadratic problem;
 * all covariance principal submatrices are solved by Cholesky. Inputs are
 * trusted from the validated market and policy; a numerical failure is reported
 * rather than returning an unverified allocation.
 */
export function projectCovarianceSimplex({ allocation, covariance }: SimplexProjectionInput): number[] {
    const size = allocation.length;
    if (allocation.every((value) => value >= 0) && allocation.reduce((sum, value) => sum + value, 0) <= 1)
        return [...allocation];

    // Scaling the objective leaves its minimizer unchanged and makes the
    // optimality tolerance independent of the market's volatility units.
    const scale = Math.max(...covariance.map((row, index) => row[index]));
    const matrix = covariance.map((row) => row.map((value) => value / scale));
    const tolerance = 1e-10 * Math.max(1, ...allocation.map(Math.abs));
    const position = Array<number>(size).fill(0);
    const free = Array<boolean>(size).fill(false);
    let sumActive = false;

    for (let iteration = 0; iteration < 2000; iteration += 1) {
        const gradient = matrix.map((row) => row.reduce((sum, value, index) => sum + value * (position[index] - allocation[index]), 0));
        const indices = free.flatMap((isFree, index) => isFree ? [index] : []);
        const direction = Array<number>(size).fill(0);
        let multiplier = 0;

        if (indices.length > 0) {
            const submatrix = indices.map((i) => indices.map((j) => matrix[i][j]));
            const unconstrained = solvePositiveDefinite(submatrix, indices.map((i) => -gradient[i]));

            if (sumActive) {
                const ones = solvePositiveDefinite(submatrix, indices.map(() => 1));
                multiplier = unconstrained.reduce((sum, value) => sum + value, 0) / ones.reduce((sum, value) => sum + value, 0);
                indices.forEach((index, i) => { direction[index] = unconstrained[i] - multiplier * ones[i]; });
            } else indices.forEach((index, i) => { direction[index] = unconstrained[i]; });
        }

        if (Math.max(...direction.map(Math.abs)) <= tolerance) {
            if (sumActive && multiplier < -tolerance) {
                sumActive = false;
                continue;
            }

            let release = -1;
            let smallest = -tolerance;
            for (let i = 0; i < size; i += 1) {
                const reducedGradient = gradient[i] + multiplier;
                if (!free[i] && reducedGradient < smallest) {
                    smallest = reducedGradient;
                    release = i;
                }
            }

            if (release < 0) return position;
            free[release] = true;
            continue;
        }

        let step = 1;
        let blockingIndex = -1;
        let hitSum = false;
        for (const index of indices) {
            if (direction[index] < 0) {
                const bound = Math.max(0, -position[index] / direction[index]);
                if (bound < step) { step = bound; blockingIndex = index; hitSum = false; }
            }
        }
        const movement = direction.reduce((sum, value) => sum + value, 0);
        if (!sumActive && movement > 0) {
            const bound = Math.max(0, (1 - position.reduce((sum, value) => sum + value, 0)) / movement);
            if (bound < step) { step = bound; blockingIndex = -1; hitSum = true; }
        }

        for (const index of indices) position[index] += step * direction[index];
        if (blockingIndex >= 0) { position[blockingIndex] = 0; free[blockingIndex] = false; }
        if (hitSum) sumActive = true;
    }

    throw new Error("Covariance-weighted simplex projection did not converge.");
}