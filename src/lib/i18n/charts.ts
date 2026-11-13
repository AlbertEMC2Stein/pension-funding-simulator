import type { Language } from "./messages";

/** Text shared by plots and chart export controls. */
export interface ChartMessages {
  exportChart: string;
  csvData: string;
  notReady: string;
  exportError: string;
  plotError: string;
  cohort: string;
  gmFit: string;
  ceFit: string;
  attainedAge: string;
  survival: string;
  cohortAria: string;
  cohortTitle: string;
  attainedAgeUnit: string;
  survivalUnit: string;
  riskFreeAsset: string;
  wealth: string;
  allocation: string;
  allocationError: string;
  allocationLegend: string;
  startingCapital: string;
  euroWealth: string;
  portfolioFraction: string;
  projected: string;
  unconstrained: string;
  policy: string;
  yearsAfterRetirement: string;
  capital: string;
  ceCurve: string;
  selectedRisk: string;
  zeroRisk: string;
  ceLifetimeRisk: string;
  annualWithdrawal: string;
  withdrawalAria: string;
  withdrawalTitle: string;
  probability: string;
  eurosPerYear: string;
  cePolicy: string;
  simulation: string;
  durbin: string;
  selectedAge: string;
  riskDensity: string;
  riskAfterAge: string;
  timingError: string;
  conditional: string;
  forecast: string;
  remainingRisk: string;
  densityTitle: string;
  probabilityPerYear: string;
  previousSettings: string;
  borrowingRegion: string;
  samplePath: string;
  samplePaths: string;
  safeBoundary: string;
  impoverishmentLevel: string;
  trajectories: string;
  trajectoryLegend: string;
  trajectoryError: string;
}

/** Chart labels and export descriptions; numeric data and CSV column keys stay unchanged. */
export const chartMessages: Record<Language, ChartMessages> = {
  en: {
    exportChart: "Export chart",
    csvData: "CSV data",
    notReady: "The chart is not ready to export yet.",
    exportError: "The chart could not be exported. Please try again.",
    plotError: "The chart could not be displayed.",
    cohort: "Cohort",
    gmFit: "GM fit",
    ceFit: "CE fit",
    attainedAge: "Attained age",
    survival: "Survival probability",
    cohortAria: "Cohort survival probability by attained age",
    cohortTitle: "Cohort survival and mortality fits",
    attainedAgeUnit: "attained age in years",
    survivalUnit: "survival probability",
    riskFreeAsset: "Risk-free asset",
    wealth: "Wealth (€)",
    allocation: "Portfolio allocation",
    allocationError: "The allocation chart could not be displayed.",
    allocationLegend: "Portfolio allocation legend",
    startingCapital: "Starting capital (t = 0)",
    euroWealth: "EUR wealth",
    portfolioFraction: "portfolio fraction",
    projected: "Projected",
    unconstrained: "Unconstrained",
    policy: "policy",
    yearsAfterRetirement: "years after retirement",
    capital: "starting capital",
    ceCurve: "CE withdrawal curve",
    selectedRisk: "Selected risk and withdrawal",
    zeroRisk: "Zero-risk withdrawal range",
    ceLifetimeRisk: "CE lifetime impoverishment risk",
    annualWithdrawal: "Annual withdrawal (€)",
    withdrawalAria:
      "Unconstrained CE model annual withdrawal against lifetime impoverishment risk",
    withdrawalTitle: "Withdrawal and CE risk",
    probability: "probability",
    eurosPerYear: "EUR per year",
    cePolicy: "Unconstrained CE policy",
    simulation: "Simulation",
    durbin: "Durbin approximation",
    selectedAge: "Selected age",
    riskDensity: "Risk density / year",
    riskAfterAge: "Risk after age",
    timingError: "The timing chart could not be displayed.",
    conditional: "Conditional update",
    forecast: "Forecast",
    remainingRisk: "Remaining impoverishment risk",
    densityTitle: "Impoverishment risk density",
    probabilityPerYear: "probability per year",
    previousSettings: "previous settings",
    borrowingRegion: "Borrowing region",
    samplePath: "Sample path",
    samplePaths: "Sample paths",
    safeBoundary: "Safe boundary",
    impoverishmentLevel: "Impoverishment level",
    trajectories: "Illustrative wealth trajectories",
    trajectoryLegend: "Wealth trajectory legend",
    trajectoryError: "The trajectory chart could not be displayed.",
  },
  de: {
    exportChart: "Diagramm exportieren",
    csvData: "CSV-Daten",
    notReady: "Das Diagramm ist noch nicht für den Export bereit.",
    exportError:
      "Das Diagramm konnte nicht exportiert werden. Bitte versuchen Sie es erneut.",
    plotError: "Das Diagramm konnte nicht angezeigt werden.",
    cohort: "Kohorte",
    gmFit: "GM-Anpassung",
    ceFit: "CE-Anpassung",
    attainedAge: "Erreichtes Alter",
    survival: "Überlebenswahrscheinlichkeit",
    cohortAria:
      "Überlebenswahrscheinlichkeit der Kohorte nach erreichtem Alter",
    cohortTitle: "Kohortenüberleben und Sterblichkeitsanpassungen",
    attainedAgeUnit: "erreichtes Alter in Jahren",
    survivalUnit: "Überlebenswahrscheinlichkeit",
    riskFreeAsset: "Risikofreie Anlage",
    wealth: "Vermögen (€)",
    allocation: "Portfolioaufteilung",
    allocationError: "Das Aufteilungsdiagramm konnte nicht angezeigt werden.",
    allocationLegend: "Legende der Portfolioaufteilung",
    startingCapital: "Anfangskapital (t = 0)",
    euroWealth: "Vermögen in EUR",
    portfolioFraction: "Portfolioanteil",
    projected: "Projizierte",
    unconstrained: "Unbeschränkte",
    policy: "Strategie",
    yearsAfterRetirement: "Jahre nach Ruhestandsbeginn",
    capital: "Anfangskapital",
    ceCurve: "CE-Auszahlungskurve",
    selectedRisk: "Gewähltes Risiko und Auszahlung",
    zeroRisk: "Auszahlungsbereich bei null Risiko",
    ceLifetimeRisk: "Lebenslanges CE-Verarmungsrisiko",
    annualWithdrawal: "Jährliche Auszahlung (€)",
    withdrawalAria:
      "Jährliche Auszahlung und lebenslanges Verarmungsrisiko im unbeschränkten CE-Modell",
    withdrawalTitle: "Auszahlung und CE-Risiko",
    probability: "Wahrscheinlichkeit",
    eurosPerYear: "EUR pro Jahr",
    cePolicy: "Unbeschränkte CE-Strategie",
    simulation: "Simulation",
    durbin: "Durbin-Näherung",
    selectedAge: "Gewähltes Alter",
    riskDensity: "Risikodichte / Jahr",
    riskAfterAge: "Risiko nach Alter",
    timingError: "Das Zeitdiagramm konnte nicht angezeigt werden.",
    conditional: "Bedingte Aktualisierung",
    forecast: "Prognose",
    remainingRisk: "Verbleibendes Verarmungsrisiko",
    densityTitle: "Dichte des Verarmungsrisikos",
    probabilityPerYear: "Wahrscheinlichkeit pro Jahr",
    previousSettings: "frühere Einstellungen",
    borrowingRegion: "Kreditbereich",
    samplePath: "Beispielpfad",
    samplePaths: "Beispielpfade",
    safeBoundary: "Sichere Grenze",
    impoverishmentLevel: "Verarmungsgrenze",
    trajectories: "Beispielhafte Vermögenspfade",
    trajectoryLegend: "Legende der Vermögenspfade",
    trajectoryError: "Das Vermögensdiagramm konnte nicht angezeigt werden.",
  },
};
