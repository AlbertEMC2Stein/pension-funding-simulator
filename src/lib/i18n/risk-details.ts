import type { Language } from "./messages";

/** Explanatory text and detailed metrics for the GM, capital and borrowing cards. */
export interface RiskDetailMessages {
  gmIntroBefore: string;
  gmLink: string;
  stale: string;
  approximate: string;
  mcInterval: string;
  sampleUnavailable: string;
  gmHorizon: (years: string) => string;
  projectedIntervals: string;
  projectedRisk: string;
  pairedDifference: string;
  projectedMethod: string;
  awaitingProjected: string;
  offerProjected: string;
  capitalIntro: string;
  withdrawalLink: string;
  capitalLearn: string;
  reliefLink: string;
  capitalNote: string;
  capitalZeroNote: string;
  capitalRows: Record<string, string>;
  borrowIntro: string;
  borrowLink: string;
  borrowIntroEnd: string;
  projectedUnavailable: string;
  negativeUnavailable: string;
  global: string;
  feasible: string;
  unavailable: string;
  notFeasible: string;
  relativeBandwidth: string;
  probabilitySE: string;
  probabilityInterval: string;
  timeSE: string;
  timeInterval: string;
  atRetirement: string;
  yes: string;
  no: string;
  lastTime: string;
  notPossible: string;
  years: string;
  yearsAfter: string;
  bandwidthBefore: string;
  bandwidthAfter: string;
  staleChecks: string;
  analyticalZeros: string;
  simulationIntervals: string;
  noBorrow: string;
  timeEstimate: string;
  timePending: string;
  firstEstimate: string;
  firstPending: string;
}

/** Detailed explanations preserve the distinction between model and numerical uncertainty. */
export const riskDetailMessages: Record<Language, RiskDetailMessages> = {
  en: {
    gmIntroBefore:
      "Compare the CE-model reference with the estimated risk under the fitted",
    gmLink: "GM model",
    stale:
      "Settings changed since this run started. Its results belong to the earlier settings.",
    approximate: "Approximate 95%",
    mcInterval: "Monte Carlo interval",
    sampleUnavailable: "not available for this sample",
    gmHorizon: (years) =>
      `The estimate includes hits within ${years} years; GM mortality may extend beyond the CE endpoint. Bridge, time-step and horizon errors are not included in the interval.`,
    projectedIntervals: "Approximate 95% Monte Carlo intervals:",
    projectedRisk: "projected GM risk",
    pairedDifference: "paired difference",
    projectedMethod:
      "The projected policy uses Euler steps and a frozen-variance bridge; time-step and bridge errors are not included in the intervals.",
    awaitingProjected:
      "Paired estimates and their uncertainty will be shown after a projected-policy run.",
    offerProjected:
      "When projection is selected, a paired policy comparison will also appear here. Estimates depend on the model and are not known future risks.",
    capitalIntro:
      "Compare your starting capital with the amount needed without investment risk for your setup's",
    withdrawalLink: "annual withdrawal",
    capitalLearn: "Learn about",
    reliefLink: "capital relief",
    capitalNote:
      "Unconstrained CE model · annual withdrawal is held fixed. Changes are relative to your starting capital; a target at or above 100% is outside the supported range.",
    capitalZeroNote:
      "Your starting capital may exceed the minimum without risk-taking.",
    capitalRows: {
      "No risk-taking": "No risk-taking",
      Comparison: "Comparison",
      "0.95 α · 5% lower": "0.95 α · 5% lower",
      "α · selected risk": "α · selected risk",
      "1.05 α · 5% higher": "1.05 α · 5% higher",
    },
    borrowIntro: "Explore the chance that your portfolio",
    borrowLink: "borrows",
    borrowIntroEnd: "and how long borrowing may last.",
    projectedUnavailable:
      "This diagnostic is available for the unconstrained policy only. Turn off projection to view it. The projected policy prevents borrowing by keeping allocations within the simplex.",
    negativeUnavailable:
      "This diagnostic is unavailable because a Merton-vector component is negative. The unconstrained strategy requires short selling whenever wealth is below the safe boundary, so it is not globally simplex-feasible.",
    global: "Global simplex feasibility",
    feasible: "Feasible",
    unavailable: "Not available",
    notFeasible: "Not feasible",
    relativeBandwidth: "Relative bandwidth multiplier ζ",
    probabilitySE: "Ever-borrowing MC standard error",
    probabilityInterval: "Ever-borrowing 95% MC interval",
    timeSE: "Borrowing time MC standard error",
    timeInterval: "Borrowing time 95% MC interval",
    atRetirement: "Borrowing at retirement",
    yes: "Yes",
    no: "No",
    lastTime: "Last possible borrowing time",
    notPossible: "Not possible",
    years: "years",
    yearsAfter: "years after retirement",
    bandwidthBefore: "Where the model assumptions apply,",
    bandwidthAfter:
      "> 1 indicates that the relative bandwidth exceeds the global no-borrowing threshold. Possibility does not imply borrowing on a particular path. The last possible time is a model boundary, not a predicted borrowing time.",
    staleChecks:
      "These analytical checks use your current inputs; the simulated results use the previous run.",
    analyticalZeros:
      "Both zeros follow analytically from global feasibility, so Monte Carlo uncertainty does not apply.",
    simulationIntervals:
      "Monte Carlo intervals describe sampling uncertainty only; they do not cover numerical approximation or horizon effects.",
    noBorrow:
      "The globally feasible unconstrained policy does not borrow. Both values are analytical and do not require a simulation.",
    timeEstimate:
      "Borrowing time uses interpolated crossings and GM survival; short excursions can be missed. Monte Carlo uncertainty does not include time-step or bridge error.",
    timePending:
      "Borrowing time has not been calculated. The global feasibility diagnostic is analytical when available.",
    firstEstimate:
      "First borrowing uses a single-boundary bridge that does not condition on impoverishment or use a first-passage bridge.",
    firstPending: "The probability of ever borrowing is not calculated yet.",
  },
  de: {
    gmIntroBefore:
      "Vergleichen Sie den CE-Referenzwert mit dem geschätzten Risiko unter dem angepassten",
    gmLink: "GM-Modell",
    stale:
      "Die Einstellungen wurden seit Beginn dieses Laufs geändert. Seine Ergebnisse gehören zu den früheren Einstellungen.",
    approximate: "Approximatives 95%-",
    mcInterval: "Monte-Carlo-Intervall",
    sampleUnavailable: "für diese Stichprobe nicht verfügbar",
    gmHorizon: (years) =>
      `Die Schätzung berücksichtigt Treffer innerhalb von ${years} Jahren; die GM-Sterblichkeit kann über den CE-Endpunkt hinausreichen. Brücken-, Zeitschritt- und Horizontfehler sind nicht im Intervall enthalten.`,
    projectedIntervals: "Approximative 95%-Monte-Carlo-Intervalle:",
    projectedRisk: "projiziertes GM-Risiko",
    pairedDifference: "gepaarte Differenz",
    projectedMethod:
      "Die projizierte Strategie verwendet Euler-Schritte und eine Brücke mit eingefrorener Varianz; Zeitschritt- und Brückenfehler sind nicht in den Intervallen enthalten.",
    awaitingProjected:
      "Gepaarte Schätzungen und ihre Unsicherheit erscheinen nach einem Lauf mit projizierter Strategie.",
    offerProjected:
      "Bei aktivierter Projektion erscheint hier zusätzlich ein gepaarter Strategievergleich. Die Schätzungen hängen vom Modell ab und sind keine bekannten zukünftigen Risiken.",
    capitalIntro:
      "Vergleichen Sie Ihr Anfangskapital mit dem Kapitalbedarf ohne Anlagerisiko für die gewählte",
    withdrawalLink: "jährliche Entnahme",
    capitalLearn: "Mehr zur",
    reliefLink: "Kapitalentlastung",
    capitalNote:
      "Unbeschränktes CE-Modell · die jährliche Entnahme bleibt fest. Änderungen beziehen sich auf Ihr Anfangskapital; ein Ziel von mindestens 100 % liegt außerhalb des unterstützten Bereichs.",
    capitalZeroNote:
      "Ihr Anfangskapital kann das Minimum ohne Risikoübernahme übersteigen.",
    capitalRows: {
      "No risk-taking": "Keine Risikoübernahme",
      Comparison: "Vergleich",
      "0.95 α · 5% lower": "0,95 α · 5 % geringer",
      "α · selected risk": "α · gewähltes Risiko",
      "1.05 α · 5% higher": "1,05 α · 5 % höher",
    },
    borrowIntro: "Erkunden Sie, mit welcher Wahrscheinlichkeit Ihr Portfolio",
    borrowLink: "einen Kredit aufnimmt",
    borrowIntroEnd: "und wie lange die Kreditaufnahme dauern kann.",
    projectedUnavailable:
      "Diese Diagnostik ist nur für die unbeschränkte Strategie verfügbar. Deaktivieren Sie die Projektion. Die projizierte Strategie verhindert Kreditaufnahme, indem die Anteile im Simplex bleiben.",
    negativeUnavailable:
      "Diese Diagnostik ist nicht verfügbar, weil eine Merton-Komponente negativ ist. Die unbeschränkte Strategie erfordert unterhalb der sicheren Grenze Leerverkäufe und ist daher nicht global im Simplex zulässig.",
    global: "Globale Simplex-Zulässigkeit",
    feasible: "Zulässig",
    unavailable: "Nicht verfügbar",
    notFeasible: "Nicht zulässig",
    relativeBandwidth: "Relative Bandbreite ζ",
    probabilitySE: "MC-Standardfehler der Kreditwahrscheinlichkeit",
    probabilityInterval: "95%-MC-Intervall der Kreditwahrscheinlichkeit",
    timeSE: "MC-Standardfehler der Kreditdauer",
    timeInterval: "95%-MC-Intervall der Kreditdauer",
    atRetirement: "Kreditaufnahme bei Ruhestandsbeginn",
    yes: "Ja",
    no: "Nein",
    lastTime: "Letztmöglicher Kreditzeitpunkt",
    notPossible: "Nicht möglich",
    years: "Jahre",
    yearsAfter: "Jahre nach Ruhestandsbeginn",
    bandwidthBefore: "Soweit die Modellannahmen gelten, bedeutet",
    bandwidthAfter:
      "> 1, dass die relative Bandbreite die globale Grenze ohne Kreditaufnahme überschreitet. Die Möglichkeit bedeutet keine Kreditaufnahme auf jedem Pfad. Der letztmögliche Zeitpunkt ist eine Modellgrenze, keine Vorhersage.",
    staleChecks:
      "Diese analytischen Prüfungen verwenden aktuelle Eingaben; die Simulationsergebnisse stammen aus dem vorherigen Lauf.",
    analyticalZeros:
      "Beide Nullwerte folgen analytisch aus der globalen Zulässigkeit; Monte-Carlo-Unsicherheit ist daher nicht anwendbar.",
    simulationIntervals:
      "Monte-Carlo-Intervalle beschreiben ausschließlich Stichprobenunsicherheit; numerische Näherungen oder Horizonteffekte sind nicht enthalten.",
    noBorrow:
      "Die global zulässige unbeschränkte Strategie nimmt keinen Kredit auf. Beide Werte sind analytisch und erfordern keine Simulation.",
    timeEstimate:
      "Die Kreditdauer verwendet interpolierte Grenzübertritte und GM-Überleben; kurze Phasen können übersehen werden. Die Monte-Carlo-Unsicherheit enthält keine Zeitschritt- oder Brückenfehler.",
    timePending:
      "Die Kreditdauer wurde noch nicht berechnet. Die globale Zulässigkeitsdiagnostik ist, sofern verfügbar, analytisch.",
    firstEstimate:
      "Die erste Kreditaufnahme verwendet eine Brücke für eine einzelne Grenze, die weder auf ausbleibende Verarmung bedingt noch eine Erstübertrittsbrücke verwendet.",
    firstPending:
      "Die Wahrscheinlichkeit einer Kreditaufnahme wurde noch nicht berechnet.",
  },
};
