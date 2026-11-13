import type { Language } from "./messages";

/** Labels and explanations for fitting and reviewing the mortality models. */
export interface MortalityFitMessages {
  invalidYears: string;
  continues: string;
  loading: string;
  survivalByAge: string;
  update: string;
  fit: string;
  cohortNote: (age: number) => string;
  notFitted: string;
  fitting: string;
  starts: string;
  staleRun: string;
  invalidMarket: string;
  staleFits: string;
  gmFit: string;
  ceFit: string;
  viewDiagnostics: string;
  diagnostics: string;
  model: string;
  kl: string;
  largestDifference: string;
  optimizer: string;
  converged: string;
  iterationLimit: string;
  klDescription: string;
  parameters: string;
  convergedGm: string;
  endpoint: string;
  derived: string;
  convergedCe: string;
  fittingHorizon: string;
  years: string;
  ceExplanation: string;
}

/** Messages explaining the mortality fit and its numerical diagnostics. */
export const mortalityFitMessages: Record<Language, MortalityFitMessages> = {
  en: {
    invalidYears:
      "Enter a birth year from 1926 to 2026 and a retirement year giving an age from 0 to 99.",
    continues: "The current fit continues with its original settings.",
    loading: "Loading cohort data…",
    survivalByAge: "Survival by age",
    update: "Update fits",
    fit: "Fit mortality models",
    cohortNote: (age) =>
      `Cohort survival conditional on reaching age ${age}. Annual points are connected by straight lines. Data end at age 100; the remaining survival probability is not forced to zero.`,
    notFitted: "Mortality models have not been fitted for these inputs.",
    fitting: "Fitting",
    starts: "starts",
    staleRun:
      "This run uses earlier settings; update fits to use your current inputs.",
    invalidMarket:
      "CE fitting requires valid market assumptions and positive rho. The GM fit remains available.",
    staleFits: "Some previous fits need updating after input changes.",
    gmFit: "GM fit",
    ceFit: "CE fit",
    viewDiagnostics: "View fit diagnostics and model parameters",
    diagnostics: "Fit diagnostics",
    model: "Model",
    kl: "KL divergence",
    largestDifference: "Largest difference",
    optimizer: "Optimizer",
    converged: "Converged",
    iterationLimit: "Iteration limit",
    klDescription:
      "compares annual death bins and the final survival tail. Largest difference is measured on the annual grid. Fits are numerical estimates; a convergence status is not a quality grade.",
    parameters: "Model parameters and optimization",
    convergedGm: "GM starts converged",
    endpoint: "CE T · remaining lifetime endpoint",
    derived: "derived",
    convergedCe: "CE starts converged",
    fittingHorizon: "Fitting horizon · years after retirement",
    years: "years",
    ceExplanation:
      "The CE fit uses the current real risk-free rate and rho. A low KL value is not a guarantee of predictive accuracy.",
  },
  de: {
    invalidYears:
      "Geben Sie ein Geburtsjahr von 1926 bis 2026 und ein Ruhestandsjahr mit einem Alter zwischen 0 und 99 ein.",
    continues:
      "Die laufende Anpassung verwendet weiterhin ihre ursprünglichen Einstellungen.",
    loading: "Kohortendaten werden geladen…",
    survivalByAge: "Überleben nach Alter",
    update: "Anpassungen aktualisieren",
    fit: "Sterblichkeitsmodelle anpassen",
    cohortNote: (age) =>
      `Überleben der Kohorte unter der Bedingung, das Alter ${age} erreicht zu haben. Jährliche Punkte sind geradlinig verbunden. Die Daten enden bei Alter 100; die verbleibende Überlebenswahrscheinlichkeit wird nicht auf null gesetzt.`,
    notFitted:
      "Für diese Eingaben wurden die Sterblichkeitsmodelle noch nicht angepasst.",
    fitting: "Anpassung",
    starts: "Startpunkte",
    staleRun:
      "Dieser Lauf verwendet frühere Einstellungen; aktualisieren Sie die Anpassungen für die aktuellen Eingaben.",
    invalidMarket:
      "Die CE-Anpassung benötigt gültige Marktannahmen und ein positives Rho. Die GM-Anpassung bleibt verfügbar.",
    staleFits:
      "Einige frühere Anpassungen müssen nach Eingabeänderungen aktualisiert werden.",
    gmFit: "GM-Anpassung",
    ceFit: "CE-Anpassung",
    viewDiagnostics: "Anpassungsdiagnostik und Modellparameter anzeigen",
    diagnostics: "Anpassungsdiagnostik",
    model: "Modell",
    kl: "KL-Divergenz",
    largestDifference: "Größte Differenz",
    optimizer: "Optimierer",
    converged: "Konvergiert",
    iterationLimit: "Iterationsgrenze",
    klDescription:
      "vergleicht jährliche Sterbewahrscheinlichkeiten und den verbleibenden Überlebensrest. Die größte Differenz wird auf dem jährlichen Raster gemessen. Anpassungen sind numerische Schätzungen; der Konvergenzstatus ist keine Qualitätsbewertung.",
    parameters: "Modellparameter und Optimierung",
    convergedGm: "Konvergierte GM-Startpunkte",
    endpoint: "CE T · Endpunkt der Restlebensdauer",
    derived: "abgeleitet",
    convergedCe: "Konvergierte CE-Startpunkte",
    fittingHorizon: "Anpassungshorizont · Jahre nach Ruhestandsbeginn",
    years: "Jahre",
    ceExplanation:
      "Die CE-Anpassung verwendet den aktuellen realen risikofreien Zinssatz und Rho. Ein kleiner KL-Wert garantiert keine Prognosegüte.",
  },
};
