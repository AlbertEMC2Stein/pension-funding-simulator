"use client";

import { TermLink } from "./common";
import { useLanguage } from "./LanguageContext";
import { simulationSettingsMessages } from "../lib/i18n/simulation-settings";

import {
  MANUAL_BATCH_SIZES,
  type BatchSizeChoice,
} from "../lib/options/batch-size";
import type { SimulationDraft } from "../lib/options/simulation-options";

/** Shared numerical controls; each instance gets unique, accessible field IDs. */
export function SimulationDetailFields({
  simulation,
  onChange,
  idPrefix,
}: {
  simulation: SimulationDraft["simulation"];
  onChange: (change: Partial<SimulationDraft["simulation"]>) => void;
  idPrefix: string;
}) {
  const { language } = useLanguage();
  const text = simulationSettingsMessages[language];

  return (
    <div className="simulation-detail-fields" lang={language}>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-paths`}>
          {text.paths}
        </label>
        <select
          id={`${idPrefix}-paths`}
          value={simulation.paths}
          onChange={(event) => onChange({ paths: Number(event.target.value) })}
        >
          <option value={10000}>
            {(10000).toLocaleString(language === "de" ? "de-DE" : "en-US")}{" "}
            {text.pathUnit}
          </option>
          <option value={5000}>
            {(5000).toLocaleString(language === "de" ? "de-DE" : "en-US")}{" "}
            {text.pathUnit}
          </option>
          <option value={50000}>
            {(50000).toLocaleString(language === "de" ? "de-DE" : "en-US")}{" "}
            {text.pathUnit}
          </option>
          <option value={100000}>
            {(100000).toLocaleString(language === "de" ? "de-DE" : "en-US")}{" "}
            {text.pathUnit}
          </option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-step`}>
          {text.timeStep}
        </label>
        <select
          id={`${idPrefix}-step`}
          value={simulation.timeStep}
          onChange={(event) =>
            onChange({
              timeStep: event.target.value as typeof simulation.timeStep,
            })
          }
        >
          <option value="monthly">{text.monthly}</option>
          <option value="fortnightly">{text.fortnightly}</option>
          <option value="weekly">{text.weekly}</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-batch-size`}>
          {text.batch}
        </label>
        <select
          id={`${idPrefix}-batch-size`}
          value={simulation.batchSize}
          onChange={(event) =>
            onChange({
              batchSize:
                event.target.value === "auto"
                  ? "auto"
                  : (Number(event.target.value) as BatchSizeChoice),
            })
          }
        >
          <option value="auto">{text.automatic}</option>
          {MANUAL_BATCH_SIZES.map((size) => (
            <option key={size} value={size}>
              {size.toLocaleString(language === "de" ? "de-DE" : "en-US")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-seed`}>
          {text.seed}
        </label>
        <input
          id={`${idPrefix}-seed`}
          type="text"
          value={simulation.seed}
          maxLength={64}
          onChange={(event) => onChange({ seed: event.target.value })}
        />
        <details className="simulation-seed-details">
          <summary>{text.aboutSeed}</summary>
          <p className="simulation-field-hint">
            {text.seedBefore} <TermLink term="seed">{text.seed}</TermLink>
            {text.seedAfter}{" "}
            <TermLink term="simulation-detail">{text.settingsLink}</TermLink>.
          </p>
        </details>
      </div>
    </div>
  );
}
