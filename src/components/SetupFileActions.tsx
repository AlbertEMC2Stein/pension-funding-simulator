"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  parseSetupFile,
  SETUP_METADATA,
  type SetupFile,
} from "../lib/options/setup-file";
import {
  DEFAULT_SETUP_NAME,
  useSimulationDraft,
} from "./SimulationDraftContext";
import { useDraft } from "./common";

/** Import and export the same versioned, input-only setup from either panel. */
export function SetupFileActions() {
  const { draft, setupName, tables, importSetup } = useSimulationDraft();
  const { notice } = useDraft();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  /** Serialize a safe setup file and download it without any result data. */
  function exportSetup() {
    try {
      const file: SetupFile = {
        format: "pension-funding-setup",
        version: 1,
        metadata: { ...SETUP_METADATA },
        name: setupName.trim() || DEFAULT_SETUP_NAME,
        draft,
        tables,
      };
      const content = JSON.stringify(file, null, 2);
      parseSetupFile(content);
      const url = URL.createObjectURL(
        new Blob([`${content}\n`], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "pension-setup.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
      notice("Setup exported. Results are not included.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not export the setup.",
      );
    }
  }

  /** Validate the complete file before asking to interrupt work or changing state. */
  async function readSetup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      if (file.size > 2_000_000)
        throw new Error("The setup file is too large (maximum 2 MB).");
      const setup = parseSetupFile(await file.text());
      if (importSetup(setup))
        notice(
          setup.metadata.model !== SETUP_METADATA.model ||
            setup.metadata.mortalityData !== SETUP_METADATA.mortalityData
            ? "Setup imported from a different model or cohort-data version. Review it before recalculating."
            : "Setup imported. Fit mortality and run simulations to calculate results.",
        );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not import the setup.",
      );
    }
  }

  return (
    <div className="setup-file-actions">
      <div className="setup-file-buttons">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={readSetup}
        />
        <button
          type="button"
          className="button button-light"
          onClick={() => inputRef.current?.click()}
        >
          ↥ &nbsp; Import setup
        </button>
        <button
          type="button"
          className="button button-light"
          onClick={exportSetup}
        >
          ↓ &nbsp; Export setup
        </button>
      </div>
      {error && (
        <p className="setup-file-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
