/**
 * One row in the market editor. Rate fields are annual percentages as entered
 * by the user: for example, "6.75" means 6.75%, not 0.0675. They remain
 * strings while editing so incomplete input is not silently rewritten.
 */
export interface MarketAsset {
  /** Stable UI key; independent of the asset's current position or name. */
  id: number;
  name: string;
  nominalReturnPercent: string;
  volatilityPercent: string;
}

/**
 * Local, editable market assumptions. This is not yet the validated numerical
 * input to a simulator and is not saved across reloads.
 */
export interface MarketCalibrationDraft {
  assets: MarketAsset[];
  /** String-valued correlation matrix ordered exactly like `assets`. */
  correlations: string[][];
  nominalRiskFreePercent: string;
  inflationPercent: string;
  /** Monotone counter so removed asset IDs are not reused during this session. */
  nextAssetId: number;
}

/** Maximum number of risky assets accepted by the editor. */
export const MAX_ASSETS = 10;

/** Allow incomplete decimal text while editing; final values are validated separately. */
export function isEditableDecimal(value: string): boolean {
  return /^-?\d*(?:\.\d*)?$/.test(value);
}

/** Create the two-asset example using the paper's 0.08 correlation. */
export function initialMarketCalibration(): MarketCalibrationDraft {
  return {
    assets: [
      {
        id: 1,
        name: "Global equities",
        nominalReturnPercent: "6.75",
        volatilityPercent: "14.50",
      },
      {
        id: 2,
        name: "Government bonds",
        nominalReturnPercent: "3.30",
        volatilityPercent: "4.00",
      },
    ],
    // The initial pair follows the paper; newly added assets start at zero correlation.
    correlations: [
      ["1", "0.08"],
      ["0.08", "1"],
    ],
    nominalRiskFreePercent: "2.50",
    inflationPercent: "2.00",
    nextAssetId: 3,
  };
}

/** Supported market-draft edits, including reset and undo actions handled by the parent tab. */
export type MarketEditAction =
  | { type: "edit"; market: MarketCalibrationDraft }
  | { type: "replace"; market: MarketCalibrationDraft }
  | { type: "reset" }
  | { type: "undo" };

/**
 * Reset saves a copy of the previous market for one undo. Later edits and
 * imports preserve that snapshot; the next reset replaces it. Undo restores
 * the saved snapshot and clears it.
 */
export function updateMarketWithUndo(
  market: MarketCalibrationDraft,
  undo: MarketCalibrationDraft | null,
  action: MarketEditAction,
): { market: MarketCalibrationDraft; undo: MarketCalibrationDraft | null } {
  if (action.type === "edit" || action.type === "replace")
    return { market: action.market, undo };
  if (action.type === "reset")
    return {
      market: initialMarketCalibration(),
      undo: structuredClone(market),
    };

  return undo ? { market: undo, undo: null } : { market, undo: null };
}

/**
 * Return a new draft with one empty asset and zero correlations to existing
 * assets. At the asset limit, return the original draft unchanged.
 */
export function addAsset(
  market: MarketCalibrationDraft,
): MarketCalibrationDraft {
  if (market.assets.length >= MAX_ASSETS) return market;

  const id = market.nextAssetId;

  return {
    ...market,
    assets: [
      ...market.assets,
      {
        id,
        name: `Asset ${id}`,
        nominalReturnPercent: "",
        volatilityPercent: "",
      },
    ],
    correlations: [
      ...market.correlations.map((row) => [...row, "0"]),
      [...market.assets.map(() => "0"), "1"],
    ],
    nextAssetId: id + 1,
  };
}

/**
 * Remove an asset and its corresponding matrix row and column. The editor
 * retains at least one asset; invalid indices leave the draft unchanged.
 */
export function removeAsset(
  market: MarketCalibrationDraft,
  index: number,
): MarketCalibrationDraft {
  if (market.assets.length <= 1 || index < 0 || index >= market.assets.length)
    return market;

  return {
    ...market,
    assets: market.assets.filter((_, i) => i !== index),
    correlations: market.correlations
      .filter((_, i) => i !== index)
      .map((row) => row.filter((_, j) => j !== index)),
  };
}

/**
 * Update both symmetric entries without mutating the previous draft. The
 * diagonal is fixed at one, and invalid indices are ignored.
 */
export function setCorrelation(
  market: MarketCalibrationDraft,
  row: number,
  column: number,
  value: string,
): MarketCalibrationDraft {
  if (
    row === column ||
    row < 0 ||
    column < 0 ||
    row >= market.assets.length ||
    column >= market.assets.length
  )
    return market;

  const correlations = market.correlations.map((values) => [...values]);
  correlations[row][column] = value;
  correlations[column][row] = value;

  return { ...market, correlations };
}

/** Parse a finite decimal or scientific-notation string; reject empty input. */
function parseDecimal(value: string): number | null {
  const text = value.trim();

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
    return null;

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

/** Convert effective annual nominal and inflation percentages to real continuous rate. */
export function realRateFromNominal(
  nominalPercent: string,
  inflationPercent: string,
): number | null {
  const nominal = parseDecimal(nominalPercent);
  const inflation = parseDecimal(inflationPercent);

  if (
    nominal === null ||
    inflation === null ||
    nominal <= -100 ||
    inflation <= -100
  )
    return null;

  return Math.log1p(nominal / 100) - Math.log1p(inflation / 100);
}

/** Validate the nominal input and the model's strictly positive real-rate condition. */
export function nominalRiskFreeRateError(
  value: string,
  inflationPercent: string,
): string | null {
  const nominal = parseDecimal(value);

  if (nominal === null || nominal <= -100)
    return "Enter a nominal risk-free rate greater than −100%.";

  const real = realRateFromNominal(value, inflationPercent);

  if (real !== null && real <= 0)
    return "The nominal risk-free rate must exceed inflation, so the real rate is greater than 0%.";

  return null;
}

/** An effective annual inflation rate must be finite and greater than -100%. */
export function inflationRateError(value: string): string | null {
  const inflation = parseDecimal(value);

  return inflation === null || inflation <= -100
    ? "Enter an inflation assumption greater than −100%."
    : null;
}

/**
 * Check dimensions, entries, symmetry and positive definiteness. Returns the
 * first human-readable error, or null when accepted. A Cholesky diagonal pivot
 * at or below 1e-12 is rejected; the matrix is never silently repaired.
 */
export function correlationMatrixError(values: string[][]): string | null {
  const size = values.length;

  if (size === 0 || values.some((row) => row.length !== size))
    return "The correlation matrix must be square.";

  const matrix = values.map((row) => row.map(parseDecimal));

  if (
    matrix.some((row) =>
      row.some((value) => value === null || value < -1 || value > 1),
    )
  ) {
    return "Enter a number between −1 and 1 for every correlation.";
  }
  for (let i = 0; i < size; i += 1) {
    if (matrix[i][i] !== 1) return "Every diagonal correlation must equal 1.";
    for (let j = 0; j < i; j += 1) {
      if (matrix[i][j] !== matrix[j][i])
        return "The correlation matrix must be symmetric.";
    }
  }

  // Build the lower Cholesky factor one entry at a time. A non-positive
  // diagonal residual means a positive-definite factor cannot be formed.
  const lower = Array.from({ length: size }, () => Array<number>(size).fill(0));

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let residual = matrix[i][j]!;

      for (let k = 0; k < j; k += 1) residual -= lower[i][k] * lower[j][k];
      if (i === j) {
        if (residual <= 1e-12)
          return "The correlation matrix must be positive definite; these correlations are inconsistent or nearly singular.";

        lower[i][j] = Math.sqrt(residual);
      } else {
        lower[i][j] = residual / lower[j][j];
      }
    }
  }

  return null;
}

/**
 * Return all market-input messages for the editor. Values are interpreted as
 * percentages, and the matrix must have one row and column per asset. Passing
 * validation does not perform calibration or imply a simulation has run.
 */
export function marketValidationErrors(
  market: MarketCalibrationDraft,
): string[] {
  const errors: string[] = [];
  const names = market.assets.map((asset) =>
    asset.name.trim().toLocaleLowerCase(),
  );

  if (names.some((name) => !name)) errors.push("Enter a name for every asset.");
  if (new Set(names).size !== names.length)
    errors.push("Asset names must be unique.");
  if (
    market.assets.some((asset) => {
      const value = parseDecimal(asset.nominalReturnPercent);

      return value === null || value <= -100;
    })
  ) {
    errors.push(
      "Enter expected annual nominal growth greater than −100% for each asset.",
    );
  }
  if (
    market.assets.some((asset) => {
      const value = parseDecimal(asset.volatilityPercent);

      return value === null || value <= 0;
    })
  ) {
    errors.push("Enter a positive annual volatility for each asset.");
  }

  const rateError = nominalRiskFreeRateError(
    market.nominalRiskFreePercent,
    market.inflationPercent,
  );

  if (rateError) errors.push(rateError);

  const inflationError = inflationRateError(market.inflationPercent);

  if (inflationError) errors.push(inflationError);
  if (market.correlations.length !== market.assets.length) {
    errors.push("The correlation matrix must match the number of assets.");
  } else {
    const correlationError = correlationMatrixError(market.correlations);

    if (correlationError) errors.push(correlationError);
  }

  return errors;
}
