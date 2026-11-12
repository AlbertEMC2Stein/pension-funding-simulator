"use client";

import { useRef } from "react";

/** Explain market inputs and identify external sites as research starting points. */
export function MarketDataInfo() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="button button-light"
        onClick={() => dialog.current?.showModal()}
      >
        Market data sources
      </button>
      <dialog
        ref={dialog}
        className="help-dialog"
        aria-labelledby="market-data-title"
      >
        <div className="help-dialog-heading">
          <div>
            <span className="tiny-label">MARKET DATA</span>
            <h2 id="market-data-title">Choosing market inputs</h2>
          </div>
          <button
            type="button"
            className="close-settings"
            aria-label="Close market data information"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p>
          Enter your own annual growth, volatility and correlation assumptions,
          or import a CSV of historical prices to estimate them. Historical
          estimates depend on the period selected and are not predictions of
          future returns.
        </p>
        <p>
          For a CSV import, use a date column in YYYY-MM-DD format and one
          column per asset containing adjusted closing prices in euros. Check
          dividend and split adjustments, currency conversion and data coverage
          before importing.
        </p>
        <p>
          The following sites are starting points for researching securities and
          historical prices. They are not connected to this simulator, and their
          data may require preparation before import. Availability and download
          options vary; their displayed statistics may use different
          definitions.
        </p>
        <p>
          <a
            className="term-link"
            href="https://finance.yahoo.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Yahoo Finance (opens in a new tab) ↗
          </a>
          <br />
          <a
            className="term-link"
            href="https://www.google.com/finance/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Finance (opens in a new tab) ↗
          </a>
        </p>
      </dialog>
    </>
  );
}
