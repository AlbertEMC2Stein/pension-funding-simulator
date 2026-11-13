import type { Language } from "./messages";

/** Headings and result labels for the principal Evaluation cards. */
export interface EvaluationCardMessages {
  referenceMortality: string;
  gmTitle: string;
  targetRisk: string;
  ceRisk: string;
  ceNote: string;
  estimatedGM: string;
  unconstrainedEstimate: string;
  differenceTarget: string;
  differenceCe: string;
  differenceNote: string;
  projectedComparison: string;
  projectedGM: string;
  projectedEstimate: string;
  projectionContribution: string;
  projectedMinus: string;
  totalTarget: string;
  totalCe: string;
  projectedReference: string;
  valueRisk: string;
  valueRiskTitle: string;
  withdrawalUsed: string;
  year: string;
  riskFreeCapital: string;
  safeBoundary: string;
  atRetirement: string;
  capital: string;
  initialNote: string;
  capitalSurplus: string;
  capitalRelief: string;
  fractionOfSafe: string;
  lifetimeCe: string;
  capitalRequired: string;
  changeFromCapital: string;
  unavailable: string;
  unconstrained: string;
  borrowing: string;
  borrowingProbability: string;
  borrowingProbabilityNote: string;
  borrowingTime: string;
  borrowingTimeNote: string;
  borrowingDetails: string;
}

/** Localized result labels without changing the model or numeric values. */
export const evaluationCardMessages: Record<Language, EvaluationCardMessages> =
  {
    en: {
      referenceMortality: "REFERENCE MORTALITY · SIMULATION RESULT",
      gmTitle: "Risk under Gompertz–Makeham mortality",
      targetRisk: "Target risk α",
      ceRisk: "CE-model risk",
      ceNote: "Unconstrained CE policy · full CE horizon",
      estimatedGM: "Estimated GM risk",
      unconstrainedEstimate: "Unconstrained policy · Monte Carlo estimate",
      differenceTarget: "Difference from target",
      differenceCe: "Difference from CE risk",
      differenceNote: "GM estimate minus CE reference",
      projectedComparison: "PROJECTED POLICY · PAIRED COMPARISON",
      projectedGM: "Estimated projected GM risk",
      projectedEstimate: "Projected policy · Monte Carlo estimate",
      projectionContribution: "Projection contribution",
      projectedMinus: "Projected minus unconstrained GM risk",
      totalTarget: "Total difference from target",
      totalCe: "Total difference from CE risk",
      projectedReference: "Projected GM risk minus unconstrained CE reference",
      valueRisk: "THE VALUE OF RISK-TAKING · UNCONSTRAINED POLICY",
      valueRiskTitle: "What does accepting risk change?",
      withdrawalUsed: "Annual withdrawal used:",
      year: "year",
      riskFreeCapital: "Capital needed without risk-taking",
      safeBoundary: "Safe boundary",
      atRetirement: "at retirement",
      capital: "Starting capital",
      initialNote: "The initial capital in your setup",
      capitalSurplus: "Capital surplus",
      capitalRelief: "Capital relief",
      fractionOfSafe: "of capital needed without risk-taking",
      lifetimeCe: "CE lifetime risk",
      capitalRequired: "Capital required",
      changeFromCapital: "Change from starting capital",
      unavailable: "Not available",
      unconstrained: "UNCONSTRAINED POLICY",
      borrowing: "Borrowing exposure",
      borrowingProbability: "Probability of ever borrowing",
      borrowingProbabilityNote:
        "While alive and before impoverishment or the run horizon",
      borrowingTime: "Expected time borrowing",
      borrowingTimeNote:
        "Average time alive while borrowing before impoverishment or the run horizon",
      borrowingDetails: "View borrowing diagnostics",
    },
    de: {
      referenceMortality: "REFERENZSTERBLICHKEIT · SIMULATIONSERGEBNIS",
      gmTitle: "Risiko unter Gompertz–Makeham-Sterblichkeit",
      targetRisk: "Zielrisiko α",
      ceRisk: "CE-Modellrisiko",
      ceNote: "Unbeschränkte CE-Strategie · gesamter CE-Horizont",
      estimatedGM: "Geschätztes GM-Risiko",
      unconstrainedEstimate: "Unbeschränkte Strategie · Monte-Carlo-Schätzung",
      differenceTarget: "Abweichung vom Ziel",
      differenceCe: "Abweichung vom CE-Risiko",
      differenceNote: "GM-Schätzung minus CE-Referenz",
      projectedComparison: "PROJIZIERTE STRATEGIE · GEPAARTER VERGLEICH",
      projectedGM: "Geschätztes projiziertes GM-Risiko",
      projectedEstimate: "Projizierte Strategie · Monte-Carlo-Schätzung",
      projectionContribution: "Beitrag der Projektion",
      projectedMinus: "Projiziertes minus unbeschränktes GM-Risiko",
      totalTarget: "Gesamtabweichung vom Ziel",
      totalCe: "Gesamtabweichung vom CE-Risiko",
      projectedReference:
        "Projiziertes GM-Risiko minus unbeschränkte CE-Referenz",
      valueRisk: "WERT DER RISIKOÜBERNAHME · UNBESCHRÄNKTE STRATEGIE",
      valueRiskTitle: "Was bewirkt die Risikoübernahme?",
      withdrawalUsed: "Verwendete jährliche Entnahme:",
      year: "Jahr",
      riskFreeCapital: "Kapitalbedarf ohne Risikoübernahme",
      safeBoundary: "Sichere Grenze",
      atRetirement: "zu Ruhestandsbeginn",
      capital: "Anfangskapital",
      initialNote: "Das Anfangskapital Ihrer Konfiguration",
      capitalSurplus: "Kapitalüberschuss",
      capitalRelief: "Kapitalentlastung",
      fractionOfSafe: "des Kapitalbedarfs ohne Risikoübernahme",
      lifetimeCe: "Lebenslanges CE-Risiko",
      capitalRequired: "Erforderliches Kapital",
      changeFromCapital: "Änderung gegenüber Anfangskapital",
      unavailable: "Nicht verfügbar",
      unconstrained: "UNBESCHRÄNKTE STRATEGIE",
      borrowing: "Kreditaufnahme",
      borrowingProbability: "Wahrscheinlichkeit einer Kreditaufnahme",
      borrowingProbabilityNote:
        "Zu Lebzeiten und vor Verarmung oder dem Laufhorizont",
      borrowingTime: "Erwartete Kreditdauer",
      borrowingTimeNote:
        "Durchschnittliche Kreditdauer zu Lebzeiten vor Verarmung oder dem Laufhorizont",
      borrowingDetails: "Kreditdiagnostik anzeigen",
    },
  };
