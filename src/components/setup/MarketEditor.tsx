"use client";

import { useState } from "react";
import {
  addAsset,
  MAX_ASSETS,
  removeAsset,
  setCorrelation,
  type MarketAsset,
  type MarketCalibrationDraft,
  marketValidationErrors,
} from "../../lib/market-calibration";

/** Controlled editor contract: the parent owns the draft and replaces it on edits. */
interface MarketEditorProps {
  market: MarketCalibrationDraft;
  onChange: (market: MarketCalibrationDraft) => void;
}

/**
 * Render the correlation matrix using the asset ordering from `market`.
 * Only the lower triangle is editable; the upper triangle reflects it and the
 * diagonal remains one. Validation is reported by the enclosing editor.
 */
export function CorrelationMatrix({ market, onChange }: MarketEditorProps) {
  return (
    <div className="correlation-scroll">
      <table
        className="correlation-table"
        aria-label="Asset correlation matrix"
      >
        <thead>
          <tr>
            <th scope="col">Asset</th>
            {market.assets.map((asset, i) => (
              <th key={asset.id} scope="col">
                {asset.name.trim() || `Asset ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {market.assets.map((asset, i) => (
            <tr key={asset.id}>
              <th scope="row">{asset.name.trim() || `Asset ${i + 1}`}</th>
              {market.assets.map((other, j) => (
                <td key={other.id}>
                  {i === j ? (
                    <span
                      className="correlation-diagonal"
                      aria-label={`Correlation of asset ${i + 1} with itself, fixed at 1`}
                    >
                      1
                    </span>
                  ) : i > j ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Correlation of asset ${i + 1} with asset ${j + 1}`}
                      value={market.correlations[i][j]}
                      onChange={(event) =>
                        onChange(
                          setCorrelation(market, i, j, event.target.value),
                        )
                      }
                    />
                  ) : (
                    <span
                      className="correlation-mirrored"
                      aria-label={`Mirrored correlation of asset ${i + 1} with asset ${j + 1}: ${market.correlations[i][j] || "empty"}`}
                    >
                      {market.correlations[i][j] || "—"}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Edit asset rows and optionally show the correlation matrix. The parent owns
 * `market`; edits are returned through `onChange`. Validation runs locally,
 * and none of these values are connected to simulations yet.
 */
export function MarketEditor({ market, onChange }: MarketEditorProps) {
  // Expansion is a display preference; closing the matrix preserves its data.
  const [matrixOpen, setMatrixOpen] = useState(false);
  const errors = marketValidationErrors(market);

  /** Replace only the edited asset while preserving its stable ID and peers. */
  function updateAsset(index: number, changes: Partial<MarketAsset>) {
    onChange({
      ...market,
      assets: market.assets.map((asset, i) =>
        i === index ? { ...asset, ...changes } : asset,
      ),
    });
  }

  return (
    <div className="form-card market-editor">
      <div className="card-heading">
        <div>
          <span className="tiny-label">
            {market.assets.length} OF {MAX_ASSETS} ASSETS
          </span>
          <h3>Asset universe</h3>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => onChange(addAsset(market))}
          disabled={market.assets.length >= MAX_ASSETS}
        >
          + &nbsp; Add asset
        </button>
      </div>
      <p>
        Enter expected annual nominal growth and volatility as percentages.
        Growth is an annualized compounded rate. Values are editable examples,
        not historical estimates.
      </p>
      <div className="market-asset-list">
        {market.assets.map((asset, index) => (
          <div className="market-asset-row" key={asset.id}>
            <label>
              Asset name
              <input
                aria-label={`Asset ${index + 1} name`}
                value={asset.name}
                onChange={(event) =>
                  updateAsset(index, { name: event.target.value })
                }
              />
            </label>
            <label>
              Expected annual growth
              <span className="input-suffix">
                <input
                  aria-label={`Expected annual nominal growth for asset ${index + 1}, percent per year`}
                  type="text"
                  inputMode="decimal"
                  value={asset.nominalReturnPercent}
                  onChange={(event) =>
                    updateAsset(index, {
                      nominalReturnPercent: event.target.value,
                    })
                  }
                />
                <span aria-hidden="true">% / year</span>
              </span>
            </label>
            <label>
              Volatility
              <span className="input-suffix">
                <input
                  aria-label={`Annual volatility for asset ${index + 1}, percent per year`}
                  type="text"
                  inputMode="decimal"
                  value={asset.volatilityPercent}
                  onChange={(event) =>
                    updateAsset(index, {
                      volatilityPercent: event.target.value,
                    })
                  }
                />
                <span aria-hidden="true">% / year</span>
              </span>
            </label>
            <button
              type="button"
              className="row-remove market-remove"
              aria-label={`Remove asset ${index + 1}: ${asset.name || "unnamed"}`}
              onClick={() => onChange(removeAsset(market, index))}
              disabled={market.assets.length === 1}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {market.assets.length >= MAX_ASSETS && (
        <p>Maximum of {MAX_ASSETS} assets reached.</p>
      )}
      <button
        type="button"
        className="button button-light card-secondary-action"
        aria-expanded={matrixOpen}
        aria-controls="correlation-editor"
        onClick={() => setMatrixOpen(!matrixOpen)}
      >
        {matrixOpen ? "Hide" : "Show / edit"} correlation matrix
      </button>
      {matrixOpen && (
        <div id="correlation-editor" className="correlation-editor">
          <p>
            Enter correlations from −1 to 1 below the diagonal. The diagonal is
            fixed at 1, and values above it are mirrored automatically. Zero is
            an initial assumption, not an estimate.
          </p>
          <CorrelationMatrix market={market} onChange={onChange} />
        </div>
      )}
      <div
        className={`market-validation ${errors.length ? "market-validation-error" : "market-validation-valid"}`}
        role="status"
        aria-live="polite"
      >
        <strong>
          {errors.length
            ? "Market inputs need attention"
            : "Market inputs are valid"}
        </strong>
        {errors.length > 0 && (
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <small>
          Validation is local to this panel. These values are not yet connected
          to pension results.
        </small>
      </div>
    </div>
  );
}
