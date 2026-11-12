import type { Language } from "./messages";

/** Wording for the Evaluation run control and captured-settings summary. */
export interface SimulationRunMessages {
  control: string;
  settings: string;
  cancel: string;
  run: string;
  progress: string;
  stopping: string;
  paths: string;
  preparing: string;
  finishing: string;
  etaAfterBatch: string;
  about: string;
  remaining: string;
  checkInputs: string;
  cancelled: string;
  usedSettings: string;
  stale: string;
  policy: string;
  pairedPolicy: string;
  unconstrained: string;
  withdrawal: string;
  perYear: string;
  wealth: string;
  cohort: string;
  retirement: string;
  maleWeight: string;
  market: string;
  pathsStep: string;
  batchSeed: string;
  sex: Record<"female" | "male" | "custom", string>;
  longevity: Record<"low" | "medium" | "high", string>;
  step: Record<"monthly" | "fortnightly" | "weekly", string>;
}

/** Localized labels for run progress and previously captured inputs. */
export const simulationRunMessages: Record<Language, SimulationRunMessages> = {
  en: {
    control: "Simulation control",
    settings: "Simulation settings",
    cancel: "Cancel simulation",
    run: "▶  Run simulation",
    progress: "Simulation progress",
    stopping: "Stopping after the current batch…",
    paths: "paths",
    preparing: "Preparing simulation…",
    finishing: "Finishing…",
    etaAfterBatch: "ETA after the first batch",
    about: "About",
    remaining: "remaining",
    checkInputs: "Check your inputs",
    cancelled: "Simulation cancelled. No partial result was saved.",
    usedSettings: "Settings used for this run",
    stale:
      "Inputs changed since this run. These are the settings used for its results.",
    policy: "Policy",
    pairedPolicy: "Unconstrained and projected CE (paired)",
    unconstrained: "Unconstrained CE",
    withdrawal: "Annual withdrawal",
    perYear: "/ year",
    wealth: "Starting capital / impoverishment level",
    cohort: "Mortality cohort",
    retirement: "retirement",
    maleWeight: "male weight",
    market: "Market assets",
    pathsStep: "Paths / time step",
    batchSeed: "Batch size / seed",
    sex: { female: "female", male: "male", custom: "custom" },
    longevity: { low: "low", medium: "medium", high: "high" },
    step: { monthly: "monthly", fortnightly: "fortnightly", weekly: "weekly" },
  },
  de: {
    control: "Simulationssteuerung",
    settings: "Simulationseinstellungen",
    cancel: "Simulation abbrechen",
    run: "▶  Simulation starten",
    progress: "Simulationsfortschritt",
    stopping: "Abbruch nach dem aktuellen Stapel…",
    paths: "Pfade",
    preparing: "Simulation wird vorbereitet…",
    finishing: "Abschluss läuft…",
    etaAfterBatch: "Restzeit nach dem ersten Stapel",
    about: "Etwa",
    remaining: "verbleibend",
    checkInputs: "Eingaben prüfen",
    cancelled:
      "Simulation abgebrochen. Es wurde kein Teilergebnis gespeichert.",
    usedSettings: "Einstellungen dieses Simulationslaufs",
    stale:
      "Die Eingaben wurden seit diesem Lauf geändert. Hier stehen die Einstellungen, mit denen seine Ergebnisse berechnet wurden.",
    policy: "Strategie",
    pairedPolicy: "Unbeschränkte und projizierte CE-Strategie (gepaart)",
    unconstrained: "Unbeschränkte CE-Strategie",
    withdrawal: "Jährliche Entnahme",
    perYear: "/ Jahr",
    wealth: "Anfangskapital / Verarmungsgrenze",
    cohort: "Sterblichkeitskohorte",
    retirement: "Ruhestand",
    maleWeight: "Gewicht Männer",
    market: "Marktanlagen",
    pathsStep: "Pfade / Zeitschritt",
    batchSeed: "Stapelgröße / Zufallsstartwert",
    sex: { female: "weiblich", male: "männlich", custom: "Mischung" },
    longevity: { low: "niedrig", medium: "mittel", high: "hoch" },
    step: {
      monthly: "monatlich",
      fortnightly: "zweiwöchentlich",
      weekly: "wöchentlich",
    },
  },
};
