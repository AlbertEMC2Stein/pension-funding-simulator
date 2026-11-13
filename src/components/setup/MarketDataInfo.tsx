"use client";

import { useRef } from "react";
import { useLanguage } from "../LanguageContext";
import { dataSourceMessages } from "../../lib/i18n/data-sources";

/** Explain market inputs and identify external sites as research starting points. */
export function MarketDataInfo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const { language } = useLanguage();
  const text = dataSourceMessages[language];

  return (
    <>
      <button
        type="button"
        className="button button-light"
        onClick={() => dialog.current?.showModal()}
      >
        {text.marketButton}
      </button>
      <dialog
        ref={dialog}
        className="help-dialog"
        aria-labelledby="market-data-title"
        lang={language}
      >
        <div className="help-dialog-heading">
          <div>
            <span className="tiny-label">{text.marketLabel}</span>
            <h2 id="market-data-title">{text.marketTitle}</h2>
          </div>
          <button
            type="button"
            className="close-settings"
            aria-label={text.closeMarket}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p>{text.marketIntro}</p>
        <p>{text.marketCsv}</p>
        <p>{text.marketSites}</p>
        <p>
          <a
            className="term-link"
            href="https://finance.yahoo.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Yahoo Finance ({text.opensNewTab}) ↗
          </a>
          <br />
          <a
            className="term-link"
            href="https://www.google.com/finance/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Finance ({text.opensNewTab}) ↗
          </a>
        </p>
      </dialog>
    </>
  );
}
