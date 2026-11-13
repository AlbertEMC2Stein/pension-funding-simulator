import type { Language } from "./messages";

/** Labels for the currently inactive historical-calibration and stress previews. */
export interface MarketPlaceholderMessages {
  historical: string;
  uncertainty: string;
  available: string;
  meta: readonly string[];
  asset: string;
  annualReturn: string;
  confidence: string;
  volatility: string;
  assetFallback: string;
  covariance: string;
  widest: string;
  pair: string;
  conditioning: string;
  notEvaluated: string;
  widestNote: string;
  intervalNote: string;
  comparison: string;
  scenarios: string;
  scenarioIntro: string;
  explore: string;
  recalculate: string;
  scenario: string;
  assumptions: string;
  diagnostics: string;
  rows: readonly (readonly [string, string])[];
  scenarioNote: string;
}

/** These previews remain inactive until the corresponding functionality exists. */
export const marketPlaceholderMessages: Record<
  Language,
  MarketPlaceholderMessages
> = {
  en: {
    historical: "HISTORICAL CALIBRATION",
    uncertainty: "Estimation uncertainty",
    available:
      "Available after calibration from historical API or uploaded data.",
    meta: ["Period", "Frequency", "Currency", "Observations", "Method"],
    asset: "Asset",
    annualReturn: "Annual return",
    confidence: "95% confidence interval",
    volatility: "Volatility",
    assetFallback: "Asset",
    covariance: "Covariance & correlation details",
    widest: "Widest individual covariance interval",
    pair: "Asset pair",
    conditioning: "Matrix conditioning",
    notEvaluated: "Not evaluated",
    widestNote:
      "The widest individual interval is not a confidence bound for the whole matrix. A near-singular covariance warning will appear when applicable.",
    intervalNote:
      "Intervals describe historical-parameter estimation uncertainty, not guaranteed future return ranges.",
    comparison: "SCENARIO COMPARISON",
    scenarios: "Recalibrated market scenarios",
    scenarioIntro:
      "Compare estimated return assumptions with covariance held fixed.",
    explore: "Explore return scenarios",
    recalculate:
      "Recalculate the policy and compatible mortality calibration for each scenario.",
    scenario: "Scenario",
    assumptions: "Return assumptions",
    diagnostics: "Diagnostics",
    rows: [
      ["Baseline", "Historical estimates"],
      ["Lower returns", "Individual lower bounds"],
      ["Higher returns", "Individual upper bounds"],
    ],
    scenarioNote:
      "Individual interval endpoints are not a joint confidence region or guaranteed worst- and best-case outcomes.",
  },
  de: {
    historical: "HISTORISCHE KALIBRIERUNG",
    uncertainty: "Schätzunsicherheit",
    available:
      "Nach Kalibrierung aus historischen API- oder hochgeladenen Daten verfügbar.",
    meta: ["Zeitraum", "Häufigkeit", "Währung", "Beobachtungen", "Methode"],
    asset: "Anlage",
    annualReturn: "Jahresrendite",
    confidence: "95%-Konfidenzintervall",
    volatility: "Volatilität",
    assetFallback: "Anlage",
    covariance: "Details zu Kovarianz und Korrelation",
    widest: "Breitestes einzelnes Kovarianzintervall",
    pair: "Anlagenpaar",
    conditioning: "Konditionierung der Matrix",
    notEvaluated: "Nicht ausgewertet",
    widestNote:
      "Das breiteste Einzelintervall ist keine Konfidenzschranke für die gesamte Matrix. Gegebenenfalls erscheint eine Warnung vor einer nahezu singulären Kovarianz.",
    intervalNote:
      "Die Intervalle beschreiben die Unsicherheit historischer Parameterschätzungen, keine garantierten zukünftigen Renditebereiche.",
    comparison: "SZENARIOVERGLEICH",
    scenarios: "Neu kalibrierte Marktszenarien",
    scenarioIntro:
      "Vergleichen Sie geschätzte Renditeannahmen bei festgehaltener Kovarianz.",
    explore: "Renditeszenarien erkunden",
    recalculate:
      "Strategie und kompatible Sterblichkeitskalibrierung für jedes Szenario neu berechnen.",
    scenario: "Szenario",
    assumptions: "Renditeannahmen",
    diagnostics: "Diagnostik",
    rows: [
      ["Ausgangsszenario", "Historische Schätzungen"],
      ["Niedrigere Renditen", "Einzelne Untergrenzen"],
      ["Höhere Renditen", "Einzelne Obergrenzen"],
    ],
    scenarioNote:
      "Die Endpunkte einzelner Intervalle bilden weder einen gemeinsamen Konfidenzbereich noch garantierte beste oder schlechteste Fälle.",
  },
};
