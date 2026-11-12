"use client";

import { useRef } from "react";
import mortalityManifest from "../../../public/data/mortality/manifest.json";

/**
 * Explain the packaged cohort snapshot and link to its official source.
 * The manifest supplies the source URL and ranges so this description stays
 * aligned with the data distributed with the website.
 */
export function MortalityDataInfo() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="button button-light"
        onClick={() => dialog.current?.showModal()}
      >
        About the data
      </button>
      <dialog
        ref={dialog}
        className="help-dialog"
        aria-labelledby="mortality-data-title"
      >
        <div className="help-dialog-heading">
          <div>
            <span className="tiny-label">MORTALITY DATA</span>
            <h2 id="mortality-data-title">About the cohort tables</h2>
          </div>
          <button
            type="button"
            className="close-settings"
            aria-label="Close data information"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p>
          The simulator includes a snapshot of German cohort life tables from
          Destatis for birth years {mortalityManifest.firstBirthYear}–
          {mortalityManifest.lastBirthYear}. Tables are available for women and
          men, with low, medium, and high life-expectancy scenarios. These
          scenarios include projected mortality and are not predictions for an
          individual.
        </p>
        <p>
          We extract the annual death probabilities into smaller files without
          rounding. The site builds survival from the selected retirement age; a
          custom mix combines the two conditional survival curves. The data
          cover annual probabilities up to age {mortalityManifest.lastAge}; the
          fitted models can describe survival beyond this range within their
          respective domains.
        </p>
        <p>
          The packaged snapshot is not updated automatically. Destatis explains
          the data and its assumptions on its official source page (in German).
        </p>
        <a
          className="term-link"
          href={mortalityManifest.sourcePage}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit the Destatis cohort life tables (opens in a new tab) ↗
        </a>
      </dialog>
    </>
  );
}
