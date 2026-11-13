"use client";

import { useLanguage } from "../LanguageContext";
import { validationMessage } from "../../lib/i18n/validation";
import { assetEditorMessages } from "../../lib/i18n/asset-editor";
import { TermLink } from "../common";

import { useRef, useState } from "react";
import {
  estimateHistoricalMarket,
  historicalMarketToDraft,
  type HistoricalMarketEstimate,
} from "../../lib/market/historical-market";
import { ImportedMarketDiagnostics } from "./ImportedMarketDiagnostics";
import {
  addAsset,
  MAX_ASSETS,
  removeAsset,
  setCorrelation,
  type MarketAsset,
  type MarketCalibrationDraft,
  isEditableDecimal,
} from "../../lib/market/market-calibration";

/** Controlled editor contract: the parent owns the draft and replaces it on edits. */
interface MarketEditorProps {
  market: MarketCalibrationDraft;
  onChange: (market: MarketCalibrationDraft) => void;
  onImport: (market: MarketCalibrationDraft) => void;
}

/**
 * Render the correlation matrix using the asset ordering from `market`.
 * Only the lower triangle is editable; the upper triangle reflects it and the
 * diagonal remains one. Validation is reported by the enclosing editor.
 */
export function CorrelationMatrix({
  market,
  onChange,
}: Omit<MarketEditorProps, "onImport">) {
  const { language } = useLanguage();
  const text = assetEditorMessages[language];

  return (
    <div className="correlation-scroll">
      <table className="correlation-table" aria-label={text.matrix}>
        <thead>
          <tr>
            <th scope="col">{text.asset}</th>
            {market.assets.map((asset, i) => (
              <th key={asset.id} scope="col">
                {asset.name.trim() || `${text.asset} ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {market.assets.map((asset, i) => (
            <tr key={asset.id}>
              <th scope="row">
                {asset.name.trim() || `${text.asset} ${i + 1}`}
              </th>
              {market.assets.map((other, j) => (
                <td key={other.id}>
                  {i === j ? (
                    <span
                      className="correlation-diagonal"
                      aria-label={text.diagonal(
                        i + 1,
                        market.correlations[i][j] || text.empty,
                      )}
                    >
                      {market.correlations[i][j] || "—"}
                    </span>
                  ) : i > j ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={text.pair(i + 1, j + 1)}
                      value={market.correlations[i][j]}
                      onChange={(event) => {
                        if (isEditableDecimal(event.target.value))
                          onChange(
                            setCorrelation(market, i, j, event.target.value),
                          );
                      }}
                    />
                  ) : (
                    <span
                      className="correlation-mirrored"
                      aria-label={text.mirrored(
                        i + 1,
                        j + 1,
                        market.correlations[i][j] || text.empty,
                      )}
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
 * `market`; edits are returned through `onChange`. Shared market validation
 * is displayed separately beneath the market input sections.
 */
export function MarketEditor({
  market,
  onChange,
  onImport,
}: MarketEditorProps) {
  const { language } = useLanguage();
  const text = assetEditorMessages[language];

  // Expansion is a display preference; closing the matrix preserves its data.
  const [matrixOpen, setMatrixOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const latestMarket = useRef(market);
  const latestOnImport = useRef(onImport);
  const importSequence = useRef(0);
  latestMarket.current = market;
  latestOnImport.current = onImport;
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState<{
    name: string;
    estimate: HistoricalMarketEstimate;
    signature: string;
  } | null>(null);

  /** Imported price diagnostics are current only while asset inputs match. */
  function signature(value: MarketCalibrationDraft) {
    return JSON.stringify({
      assets: value.assets.map(
        ({ name, nominalReturnPercent, volatilityPercent }) => ({
          name,
          nominalReturnPercent,
          volatilityPercent,
        }),
      ),
      correlations: value.correlations,
    });
  }
  /** Read and calibrate a selected price CSV, then apply it to the latest market draft. Sequence numbers prevent older asynchronous imports from replacing newer ones. */
  async function importFile(file: File) {
    const sequence = ++importSequence.current;
    setImportError(null);

    try {
      const estimate = estimateHistoricalMarket(await file.text());
      const next = historicalMarketToDraft(estimate, latestMarket.current);

      if (sequence !== importSequence.current) return;

      latestOnImport.current(next);
      setImported({ name: file.name, estimate, signature: signature(next) });
    } catch (error) {
      if (sequence === importSequence.current)
        setImportError(
          error instanceof Error
            ? error.message
            : "Could not import price data.",
        );
    }
  }

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
            {text.count(market.assets.length, MAX_ASSETS)}
          </span>
          <h3>{text.title}</h3>
        </div>
        <div className="asset-actions">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="visually-hidden"
            tabIndex={-1}
            aria-label={text.chooseCsv}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";

              if (file) void importFile(file);
            }}
          />
          <button
            type="button"
            className="button button-light"
            onClick={() => fileInput.current?.click()}
          >
            ↥ &nbsp; {text.importPrices}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => onChange(addAsset(market))}
            disabled={market.assets.length >= MAX_ASSETS}
          >
            + &nbsp; {text.add}
          </button>
        </div>
      </div>
      <p>
        {text.introStart} <TermLink term="growth">{text.growthLink}</TermLink>{" "}
        {text.and} <TermLink term="volatility">{text.volatilityLink}</TermLink>{" "}
        {text.introMiddle}{" "}
        <TermLink term="adjusted-prices">{text.pricesLink}</TermLink>{" "}
        {text.introEnd}{" "}
        <TermLink term="risk-free-rate">{text.riskFreeLink}</TermLink>{" "}
        {text.and} <TermLink term="nominal-real">{text.inflationLink}</TermLink>{" "}
        {text.introLast}
      </p>
      {importError && (
        <div
          className="feasibility-status market-validation"
          data-status="invalid"
          role="alert"
        >
          {text.importFailed} {validationMessage(importError, language)}{" "}
          {text.importKept}
        </div>
      )}
      <div className="market-asset-list">
        {market.assets.map((asset, index) => (
          <div className="market-asset-row" key={asset.id}>
            <label>
              {text.name}
              <input
                aria-label={text.assetName(index + 1)}
                value={asset.name}
                onChange={(event) =>
                  updateAsset(index, { name: event.target.value })
                }
              />
            </label>
            <label>
              {text.growth}
              <span className="input-suffix">
                <input
                  aria-label={text.growthLabel(index + 1)}
                  type="text"
                  inputMode="decimal"
                  value={asset.nominalReturnPercent}
                  onChange={(event) => {
                    if (isEditableDecimal(event.target.value))
                      updateAsset(index, {
                        nominalReturnPercent: event.target.value,
                      });
                  }}
                />
                <span aria-hidden="true">{text.perYear}</span>
              </span>
            </label>
            <label>
              {text.volatility}
              <span className="input-suffix">
                <input
                  aria-label={text.volatilityLabel(index + 1)}
                  type="text"
                  inputMode="decimal"
                  value={asset.volatilityPercent}
                  onChange={(event) => {
                    if (isEditableDecimal(event.target.value))
                      updateAsset(index, {
                        volatilityPercent: event.target.value,
                      });
                  }}
                />
                <span aria-hidden="true">{text.perYear}</span>
              </span>
            </label>
            <button
              type="button"
              className="row-remove market-remove"
              aria-label={text.remove(index + 1, asset.name || text.unnamed)}
              onClick={() => onChange(removeAsset(market, index))}
              disabled={market.assets.length === 1}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {market.assets.length >= MAX_ASSETS && (
        <p>{text.maxAssets(MAX_ASSETS)}</p>
      )}
      <button
        type="button"
        className="button button-light card-secondary-action"
        aria-expanded={matrixOpen}
        aria-controls="correlation-editor"
        onClick={() => setMatrixOpen(!matrixOpen)}
      >
        {matrixOpen ? text.hideMatrix : text.showMatrix}
      </button>
      {matrixOpen && (
        <div id="correlation-editor" className="correlation-editor">
          <p>
            {text.matrixStart}{" "}
            <TermLink term="correlation">{text.correlationLink}</TermLink>{" "}
            {text.matrixEnd}
          </p>
          <CorrelationMatrix market={market} onChange={onChange} />
        </div>
      )}
      {imported && (
        <ImportedMarketDiagnostics
          name={imported.name}
          estimate={imported.estimate}
          current={signature(market) === imported.signature}
        />
      )}
    </div>
  );
}
