import type { Language } from "./messages";

/** Imported-price coverage and uncertainty table labels and descriptions. */
export interface ImportDiagnosticsMessages {
  title: string;
  matches: string;
  changed: string;
  dateTo: string;
  datedRows: string;
  missing: string;
  stale: string;
  assets: string;
  asset: string;
  intervals: string;
  coverage: string;
  gap: string;
  growth: string;
  volatility: string;
  lower: string;
  upper: string;
  years: string;
  days: string;
  pairs: string;
  pair: string;
  noPairs: string;
  correlation: string;
  uncertaintyBefore: string;
  uncertaintyLink: string;
  uncertaintyAfter: string;
  coverageNote: string;
}

/** Text explaining the model assumptions and missing-data treatment. */
export const importDiagnosticsMessages: Record<
  Language,
  ImportDiagnosticsMessages
> = {
  en: {
    title: "Imported data & estimation uncertainty",
    matches: "Matches inputs",
    changed: "Inputs changed",
    dateTo: "to",
    datedRows: "dated rows",
    missing: "missing price cells.",
    stale:
      "These diagnostics describe the original CSV import. The market inputs have since been edited and may no longer match the imported estimates.",
    assets: "Assets",
    asset: "Asset",
    intervals: "Intervals",
    coverage: "Coverage",
    gap: "Longest gap",
    growth: "95% interval for annual growth",
    volatility: "95% interval for volatility",
    lower: "Lower bound",
    upper: "Upper bound",
    years: "years",
    days: "days",
    pairs: "Asset pairs",
    pair: "Asset pair",
    noPairs: "Pairwise diagnostics require at least two assets.",
    correlation: "95% interval for correlation",
    uncertaintyBefore: "These intervals describe",
    uncertaintyLink: "historical estimation uncertainty",
    uncertaintyAfter:
      "under a constant-parameter Gaussian log-return model. Growth intervals apply to annualized log growth converted to a compounded rate; correlation intervals use an approximate Fisher transformation. A dash means there are too few paired intervals or perfect correlation. Imported values are rounded to two decimals for subsequent calculations.",
    coverageNote:
      "Durations use calendar days / 365.25; no missing prices are filled. Growth and volatility use each asset’s observed intervals, while correlations use matching dates for each pair.",
  },
  de: {
    title: "Importierte Daten & Schätzunsicherheit",
    matches: "Entspricht Eingaben",
    changed: "Eingaben geändert",
    dateTo: "bis",
    datedRows: "Datumszeilen",
    missing: "fehlende Kurswerte.",
    stale:
      "Diese Diagnosen beschreiben den ursprünglichen CSV-Import. Die Markteingaben wurden inzwischen bearbeitet und stimmen möglicherweise nicht mehr mit den importierten Schätzungen überein.",
    assets: "Anlagen",
    asset: "Anlage",
    intervals: "Intervalle",
    coverage: "Abdeckung",
    gap: "Längste Lücke",
    growth: "95%-Intervall für jährliches Wachstum",
    volatility: "95%-Intervall für Volatilität",
    lower: "Untergrenze",
    upper: "Obergrenze",
    years: "Jahre",
    days: "Tage",
    pairs: "Anlagenpaare",
    pair: "Anlagenpaar",
    noPairs: "Paarweise Diagnosen benötigen mindestens zwei Anlagen.",
    correlation: "95%-Intervall für Korrelation",
    uncertaintyBefore: "Diese Intervalle beschreiben die",
    uncertaintyLink: "Unsicherheit historischer Schätzungen",
    uncertaintyAfter:
      "unter einem Gaußmodell für logarithmische Renditen mit konstanten Parametern. Wachstumsintervalle beziehen sich auf annualisiertes logarithmisches Wachstum, umgerechnet in eine aufgezinste Rate; Korrelationsintervalle verwenden eine approximative Fisher-Transformation. Ein Gedankenstrich bedeutet, dass zu wenige paarweise Intervalle vorliegen oder die Korrelation perfekt ist. Importierte Werte werden für nachfolgende Berechnungen auf zwei Dezimalstellen gerundet.",
    coverageNote:
      "Zeiträume verwenden Kalendertage / 365,25; fehlende Kurse werden nicht ergänzt. Wachstum und Volatilität verwenden die beobachteten Intervalle jeder Anlage, Korrelationen hingegen gemeinsame Datumswerte des jeweiligen Paares.",
  },
};
