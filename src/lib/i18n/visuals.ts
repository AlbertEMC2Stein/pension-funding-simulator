import type { Language } from "./messages";

/** Text for the allocation, timing, trajectory and CE benchmark cards. */
export interface VisualMessages {
  projectedCE: string;
  unconstrainedCE: string;
  allocation: string;
  allocationIntro: string;
  allocationView: string;
  relativeAllocation: string;
  amountAllocation: string;
  realAmounts: string;
  time: string;
  years: string;
  capitalOutside: string;
  stopped: string;
  projectedNote: string;
  unconstrainedNote: string;
  sliderEnd: string;
  sliderDisabled: string;
  ceBenchmark: string;
  ceRiskForWithdrawal: string;
  withdrawalForRisk: string;
  ceWithdrawalRisk: string;
  ceExplanation: string;
  projectedPolicy: string;
  unconstrainedPolicy: string;
  selectedPolicy: string;
  trajectories: string;
  trajectoryIntro: string;
  paths: string;
  shuffle: string;
  reducedGrid: string;
  shade: string;
  shuffled: (count: number) => string;
  enableVisual: string;
  gmMortality: string;
  timingTitle: string;
  timingIntro: string;
  stale: string;
  perspective: string;
  forecast: string;
  conditional: string;
  chart: string;
  density: string;
  remainingRisk: string;
  running: string;
  runProjected: string;
  runSimulation: string;
  selectedAge: string;
  noPaths: string;
  noSurvival: string;
  selectEarlier: string;
  conditionalRisk: string;
  forecastRisk: string;
  timingDetails: string;
  showDurbin: string;
  invalidRisk: string;
  unstable: string;
  newSimulation: string;
  pathsSimulated: string;
  noEarlierHit: string;
  horizon: string;
  ceBound: string;
  cdfDistance: string;
  unavailable: string;
  enableApprox: string;
  failed: string;
  fullHorizon: string;
  noHits: string;
  zeroRisk: string;
  timingIntroStart: string;
  timingLink: string;
  timingIntroMiddle: string;
  densityLink: string;
  gmLink: string;
  timingNote: (projected: boolean, age: string) => string;
  conditionalDensityNote: string;
  densityNote: string;
  cumulativeNote: string;
  yearsAfter: string;
  ceBoundPrefix: string;
  ceBoundLink: string;
  ceBoundExplanation: string;
  simulationErrorBefore: string;
  bridgeLink: string;
  simulationErrorAfter: string;
}

/** Plain-language controls and diagnostic states for Evaluation visuals. */
export const visualMessages: Record<Language, VisualMessages> = {
  en: {
    projectedCE: "PROJECTED CE POLICY",
    unconstrainedCE: "UNCONSTRAINED CE POLICY",
    allocation: "Portfolio allocation",
    allocationIntro:
      "Allocation by wealth between the impoverishment and safe levels.",
    allocationView: "Display allocation as",
    relativeAllocation: "Share (%)",
    amountAllocation: "Amount (€)",
    realAmounts: "Amounts are inflation-adjusted euros.",
    time: "Time after retirement",
    years: "years",
    capitalOutside:
      "Starting capital is outside the displayed wealth interval.",
    stopped: "The policy stops when the impoverishment level is reached.",
    projectedNote:
      "The projected allocation prevents short positions and borrowing.",
    unconstrainedNote:
      "Negative positions indicate short selling or borrowing.",
    sliderEnd: "The slider ends one day before the CE endpoint.",
    sliderDisabled:
      "The endpoint is at most one day away, so the slider is disabled.",
    ceBenchmark: "UNCONSTRAINED CE BENCHMARK",
    ceRiskForWithdrawal: "CE risk for the selected withdrawal",
    withdrawalForRisk: "Annual withdrawal for the selected CE risk",
    ceWithdrawalRisk: "CE withdrawal and risk",
    ceExplanation:
      "Analytical CE-model relationship for the unconstrained policy. The marker shows your selection; it does not represent projected-policy or GM-model risk.",
    projectedPolicy: "PROJECTED POLICY",
    unconstrainedPolicy: "UNCONSTRAINED POLICY",
    selectedPolicy: "SELECTED POLICY",
    trajectories: "Illustrative trajectories",
    trajectoryIntro:
      "These example paths assume you remain alive. Each ends at impoverishment or the policy horizon; they are not predictions.",
    paths: "Number of paths",
    shuffle: "Shuffle paths",
    reducedGrid:
      "Lines use a reduced time grid and may omit short-lived fluctuations.",
    shade:
      "The shaded region indicates where the unconstrained policy borrows.",
    shuffled: (count) =>
      `Shuffle selects from ${count} retained paths without rerunning the simulation.`,
    enableVisual:
      "Enable this visual before starting a simulation to retain example paths.",
    gmMortality: "GM MORTALITY",
    timingTitle: "When might impoverishment occur?",
    timingIntro:
      "Explore forecast and conditional risk across attained ages under the selected policy and fitted mortality model.",
    stale:
      "Settings changed since this run started. This chart uses the earlier settings.",
    perspective: "Perspective",
    forecast: "Forecast",
    conditional: "Conditional update",
    chart: "Chart",
    density: "Density",
    remainingRisk: "Remaining risk",
    running:
      "Simulation running; timing results appear after the run completes.",
    runProjected: "Run a projected-policy simulation to see this chart.",
    runSimulation: "Run a simulation to see this chart.",
    selectedAge: "Selected age",
    noPaths: "No simulated paths remain without impoverishment at this age.",
    noSurvival: "Mortality survival at this age is numerically zero.",
    selectEarlier: "Select an age before the end of the simulation.",
    conditionalRisk:
      "Remaining risk through the run horizon, given survival without impoverishment to the selected age",
    forecastRisk:
      "Risk from the selected age through the run horizon, assessed at retirement",
    timingDetails: "Approximation error & diagnostics",
    showDurbin: "Show Durbin approximation",
    invalidRisk:
      "The approximation is unavailable here because it produced an invalid risk.",
    unstable:
      "The approximation is unavailable at this age because its estimated probability of avoiding an earlier hit is not positive.",
    newSimulation: "Run a new simulation to enable the Durbin approximation.",
    pathsSimulated: "Simulated paths",
    noEarlierHit: "Paths without an earlier hit",
    horizon: "Simulation horizon",
    ceBound: "CE conditional-on-impoverishment TV bound (approx.)",
    cdfDistance: "CE conditional CDF sup distance (estimated)",
    unavailable: "Not available",
    enableApprox: "Enable the approximation to calculate",
    failed: "Calculation failed",
    fullHorizon: "Requires the full CE horizon",
    noHits: "No survival-weighted hits observed",
    zeroRisk: "Not available at zero CE risk",
    timingIntroStart: "Explore",
    timingLink: "forecast and conditional risk",
    timingIntroMiddle:
      "across attained ages under the selected policy and fitted mortality model. Learn about",
    densityLink: "remaining risk and density",
    gmLink: "GM mortality",
    timingNote: (projected, age) =>
      `${projected ? "projected" : "unconstrained"} policy · events through age ${age}. GM mortality may extend beyond this horizon. The curve is an estimate; time-step, bridge and Monte Carlo errors apply.`,
    conditionalDensityNote:
      "Bars show average risk density across 30 intervals; their areas represent risk. Results can be noisy when few paths remain.",
    densityNote:
      "Bars show average risk density per year; their areas represent risk. The last interval may be shorter than one year.",
    cumulativeNote:
      "The curve reaches zero at the end of the simulated horizon.",
    yearsAfter: "years after retirement",
    ceBoundPrefix: "The",
    ceBoundLink: "CE bound",
    ceBoundExplanation:
      "concerns the timing distribution conditional on impoverishment before death under CE mortality. It is not a bound for this GM chart or for the age-conditional update. Its numerical value uses approximate quadrature. The CDF distance compares the same CE conditional laws using simulated paths; Monte Carlo, time-step, bridge and quadrature errors can make it exceed the theoretical bound.",
    simulationErrorBefore: "The simulation has Monte Carlo, time-step and",
    bridgeLink: "bridge",
    simulationErrorAfter: "errors.",
  },
  de: {
    projectedCE: "PROJIZIERTE CE-STRATEGIE",
    unconstrainedCE: "UNBESCHRÄNKTE CE-STRATEGIE",
    allocation: "Portfolioaufteilung",
    allocationIntro:
      "Aufteilung nach Vermögen zwischen der Verarmungs- und der sicheren Grenze.",
    allocationView: "Aufteilung anzeigen als",
    relativeAllocation: "Anteil (%)",
    amountAllocation: "Betrag (€)",
    realAmounts: "Die Beträge sind inflationsbereinigt.",
    time: "Zeit seit Ruhestandsbeginn",
    years: "Jahre",
    capitalOutside:
      "Das Anfangskapital liegt außerhalb des dargestellten Vermögensbereichs.",
    stopped: "Die Strategie endet beim Erreichen der Verarmungsgrenze.",
    projectedNote:
      "Die projizierte Aufteilung verhindert Leerverkäufe und Kreditaufnahme.",
    unconstrainedNote:
      "Negative Positionen bedeuten Leerverkäufe oder Kreditaufnahme.",
    sliderEnd: "Der Schieberegler endet einen Tag vor dem CE-Endpunkt.",
    sliderDisabled:
      "Der Endpunkt ist höchstens einen Tag entfernt; deshalb ist der Regler deaktiviert.",
    ceBenchmark: "UNBESCHRÄNKTER CE-VERGLEICHSWERT",
    ceRiskForWithdrawal: "CE-Risiko für die gewählte Auszahlung",
    withdrawalForRisk: "Jährliche Auszahlung für das gewählte CE-Risiko",
    ceWithdrawalRisk: "CE-Auszahlung und -Risiko",
    ceExplanation:
      "Analytischer CE-Modellzusammenhang für die unbeschränkte Strategie. Der Punkt markiert Ihre Auswahl; er stellt weder das Risiko der projizierten Strategie noch das GM-Risiko dar.",
    projectedPolicy: "PROJIZIERTE STRATEGIE",
    unconstrainedPolicy: "UNBESCHRÄNKTE STRATEGIE",
    selectedPolicy: "GEWÄHLTE STRATEGIE",
    trajectories: "Beispielhafte Vermögenspfade",
    trajectoryIntro:
      "Diese Beispielpfade setzen voraus, dass Sie am Leben bleiben. Sie enden bei Verarmung oder am Strategiehorizont und sind keine Vorhersagen.",
    paths: "Anzahl der Pfade",
    shuffle: "Pfade mischen",
    reducedGrid:
      "Die Linien verwenden ein reduziertes Zeitraster und können kurzzeitige Schwankungen auslassen.",
    shade:
      "Der schattierte Bereich zeigt, wo die unbeschränkte Strategie einen Kredit aufnimmt.",
    shuffled: (count) =>
      `Beim Mischen wird aus ${count} gespeicherten Pfaden gewählt, ohne die Simulation zu wiederholen.`,
    enableVisual:
      "Aktivieren Sie diese Ansicht vor dem Simulationsstart, um Beispielpfade zu speichern.",
    gmMortality: "GM-STERBLICHKEIT",
    timingTitle: "Wann könnte Verarmung eintreten?",
    timingIntro:
      "Erkunden Sie Prognose und bedingtes Risiko nach erreichtem Alter für die gewählte Strategie und das angepasste Sterblichkeitsmodell.",
    stale:
      "Die Einstellungen haben sich seit dem Start geändert. Das Diagramm verwendet die früheren Einstellungen.",
    perspective: "Perspektive",
    forecast: "Prognose",
    conditional: "Bedingte Aktualisierung",
    chart: "Diagramm",
    density: "Dichte",
    remainingRisk: "Verbleibendes Risiko",
    running:
      "Die Simulation läuft; Ergebnisse zum Zeitpunkt erscheinen nach ihrem Abschluss.",
    runProjected:
      "Starten Sie eine Simulation mit Projektion, um dieses Diagramm zu sehen.",
    runSimulation: "Starten Sie eine Simulation, um dieses Diagramm zu sehen.",
    selectedAge: "Gewähltes Alter",
    noPaths:
      "In diesem Alter sind keine simulierten Pfade ohne vorherige Verarmung übrig.",
    noSurvival:
      "Die Überlebenswahrscheinlichkeit ist in diesem Alter numerisch null.",
    selectEarlier: "Wählen Sie ein Alter vor dem Ende der Simulation.",
    conditionalRisk:
      "Verbleibendes Risiko bis zum Laufhorizont, bedingt auf Überleben ohne Verarmung bis zum gewählten Alter",
    forecastRisk:
      "Risiko vom gewählten Alter bis zum Laufhorizont, bewertet zum Ruhestandsbeginn",
    timingDetails: "Näherungsfehler & Diagnostik",
    showDurbin: "Durbin-Näherung anzeigen",
    invalidRisk:
      "Die Näherung ist hier nicht verfügbar, weil sie ein ungültiges Risiko ergeben hat.",
    unstable:
      "Die Näherung ist in diesem Alter nicht verfügbar, weil ihre geschätzte Wahrscheinlichkeit, einen früheren Treffer zu vermeiden, nicht positiv ist.",
    newSimulation:
      "Starten Sie eine neue Simulation, um die Durbin-Näherung zu aktivieren.",
    pathsSimulated: "Simulierte Pfade",
    noEarlierHit: "Pfade ohne früheren Treffer",
    horizon: "Simulationshorizont",
    ceBound: "CE-Totalvariationsschranke bedingt auf Verarmung (ca.)",
    cdfDistance: "CE-Abstand der bedingten Verteilungsfunktionen (geschätzt)",
    unavailable: "Nicht verfügbar",
    enableApprox: "Näherung zur Berechnung aktivieren",
    failed: "Berechnung fehlgeschlagen",
    fullHorizon: "Benötigt den vollständigen CE-Horizont",
    noHits: "Keine überlebensgewichteten Treffer beobachtet",
    zeroRisk: "Bei CE-Risiko null nicht verfügbar",
    timingIntroStart: "Erkunden Sie",
    timingLink: "Prognose und bedingtes Risiko",
    timingIntroMiddle:
      "nach erreichtem Alter für die gewählte Strategie und das angepasste Sterblichkeitsmodell. Mehr über",
    densityLink: "verbleibendes Risiko und Dichte",
    gmLink: "GM-Sterblichkeit",
    timingNote: (projected, age) =>
      `${projected ? "projizierte" : "unbeschränkte"} Strategie · Ereignisse bis Alter ${age}. GM-Sterblichkeit kann über diesen Horizont hinausreichen. Die Kurve ist eine Schätzung; Zeitschritt-, Brücken- und Monte-Carlo-Fehler sind möglich.`,
    conditionalDensityNote:
      "Die Balken zeigen die mittlere Risikodichte über 30 Intervalle; ihre Flächen entsprechen Risikobeiträgen. Bei wenigen verbleibenden Pfaden können die Ergebnisse stark schwanken.",
    densityNote:
      "Die Balken zeigen die mittlere Risikodichte pro Jahr; ihre Flächen entsprechen Risikobeiträgen. Das letzte Intervall kann kürzer als ein Jahr sein.",
    cumulativeNote: "Am Ende des Simulationshorizonts erreicht die Kurve null.",
    yearsAfter: "Jahre nach Ruhestandsbeginn",
    ceBoundPrefix: "Die",
    ceBoundLink: "CE-Schranke",
    ceBoundExplanation:
      "betrifft die Zeitverteilung unter CE-Sterblichkeit, bedingt auf Verarmung vor dem Tod. Sie ist keine Schranke für dieses GM-Diagramm oder die altersbedingte Aktualisierung. Ihr Wert wird durch approximative Quadratur berechnet. Der CDF-Abstand vergleicht dieselben bedingten CE-Verteilungen anhand simulierter Pfade; Monte-Carlo-, Zeitschritt-, Brücken- und Quadraturfehler können dazu führen, dass er die theoretische Schranke überschreitet.",
    simulationErrorBefore:
      "Die Simulation enthält Monte-Carlo-, Zeitschritt- und",
    bridgeLink: "Brückenfehler",
    simulationErrorAfter: ".",
  },
};
