"use client";

import { useRef } from "react";
import { useLanguage } from "../LanguageContext";
import { dataSourceMessages } from "../../lib/i18n/data-sources";
import mortalityManifest from "../../../public/data/mortality/manifest.json";

/**
 * Explain the packaged cohort snapshot and link to its official source.
 * The manifest supplies the source URL and ranges so this description stays
 * aligned with the data distributed with the website.
 */
export function MortalityDataInfo() {
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
        {text.mortalityButton}
      </button>
      <dialog
        ref={dialog}
        className="help-dialog"
        aria-labelledby="mortality-data-title"
        lang={language}
      >
        <div className="help-dialog-heading">
          <div>
            <span className="tiny-label">{text.mortalityLabel}</span>
            <h2 id="mortality-data-title">{text.mortalityTitle}</h2>
          </div>
          <button
            type="button"
            className="close-settings"
            aria-label={text.closeMortality}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p>
          {text.mortalityIntro(
            mortalityManifest.firstBirthYear,
            mortalityManifest.lastBirthYear,
          )}
        </p>
        <p>{text.mortalityMethod(mortalityManifest.lastAge)}</p>
        <p>{text.mortalitySource}</p>
        <a
          className="term-link"
          href={mortalityManifest.sourcePage}
          target="_blank"
          rel="noopener noreferrer"
        >
          {text.destatisLink} ({text.opensNewTab}) ↗
        </a>
      </dialog>
    </>
  );
}
