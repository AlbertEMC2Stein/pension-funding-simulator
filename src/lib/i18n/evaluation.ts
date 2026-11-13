import type { Language } from "./messages";

/** Primary Evaluation labels; technical diagnostics are translated separately. */
export interface EvaluationMessages {
  eyebrow: string;
  title: string;
  description: string;
  previewTitle: string;
  preview: string;
  checkingStorage: string;
  preparingMortality: string;
  fitting: string;
  starts: string;
  reviewMortality: string;
  yourSetup: string;
  retirementAge: string;
  years: string;
  capital: string;
  impoverishment: string;
  annualWithdrawal: string;
  targetRisk: string;
  editSetup: string;
  customize: string;
  chooseVisuals: string;
  chooseDescription: string;
  visualNote: string;
  withdrawal: string;
  estimatedGM: string;
  valueRisk: string;
  portfolioPolicies: string;
  allocation: string;
  impoverishmentBorrowing: string;
  timing: string;
  borrowing: string;
  trajectories: string;
  illustrative: string;
  decisionEyebrow: string;
  decisionDescription: string;
  portfolioEyebrow: string;
  portfolioDescription: string;
  exposureEyebrow: string;
  projectedExposure: string;
  unconstrainedExposure: string;
  pathsEyebrow: string;
  pathsDescription: string;
  customizeEyebrow: string;
  settings: string;
  close: string;
  settingsLead: string;
  withdrawalApproach: string;
  customAmount: string;
  targetLifetime: string;
  lowerRisk: string;
  higherRisk: string;
  lowerWithdrawal: string;
  higherWithdrawal: string;
  impliedRisk: string;
  derivedWithdrawal: string;
  perYear: string;
  ceModel: string;
  portfolioPolicy: string;
  applyProjection: string;
  projectionNote: string;
  projection: string;
  projectionInfo: string;
  simulationDetail: string;
}

/** Main Evaluation copy; display language does not change simulation inputs. */
export const evaluationMessages: Record<Language, EvaluationMessages> = {
  en: {
    eyebrow: "YOUR RETIREMENT, EXPLORED",
    title: "How much can you withdraw in retirement?",
    description:
      "Explore how much you could withdraw each year for a chosen risk of your savings falling below a threshold you set. Compare the effects of investment returns, inflation, longevity and portfolio constraints.",
    previewTitle: "You're exploring a design draft.",
    preview:
      "The CE withdrawal chart, allocation, capital comparison and feasibility diagnostic use your current inputs. Simulation results use the latest completed run.",
    checkingStorage: "Checking for a saved setup…",
    preparingMortality: "Preparing mortality data…",
    fitting: "Fitting mortality models",
    starts: "starts",
    reviewMortality: "Open Investor & mortality to review and fit the models.",
    yourSetup: "YOUR SETUP",
    retirementAge: "Retirement age",
    years: "years",
    capital: "Starting capital",
    impoverishment: "Impoverishment level",
    annualWithdrawal: "Annual withdrawal",
    targetRisk: "Target risk",
    editSetup: "Edit setup",
    customize: "Customize visuals",
    chooseVisuals: "Choose your visuals",
    chooseDescription:
      "Show the views you want to explore. Enable trajectories before a run to retain a sample for that chart.",
    visualNote:
      "Mortality fit is shown in Investor & mortality. The CE chart, allocation, capital comparison and global feasibility are calculated when available. GM risk is estimated when a simulation completes. The timing and trajectory views use the same run.",
    withdrawal: "Withdrawal & risk",
    estimatedGM: "Estimated GM risk",
    valueRisk: "Value of risk-taking",
    portfolioPolicies: "Portfolio & policies",
    allocation: "Portfolio allocation",
    impoverishmentBorrowing: "Impoverishment & borrowing",
    timing: "Impoverishment timing",
    borrowing: "Borrowing exposure",
    trajectories: "Wealth trajectories",
    illustrative: "Illustrative trajectories",
    decisionEyebrow: "01 / THE DECISION",
    decisionDescription: "Find a balance that feels right for your retirement.",
    portfolioEyebrow: "02 / PORTFOLIO",
    portfolioDescription:
      "See how the selected policy allocates your portfolio.",
    exposureEyebrow: "03 / UNDERSTANDING EXPOSURE",
    projectedExposure: "Explore possible outcomes for the selected policy.",
    unconstrainedExposure:
      "Explore possible outcomes and the borrowing exposure of the unconstrained policy.",
    pathsEyebrow: "04 / ILLUSTRATIVE PATHS",
    pathsDescription: "Explore example paths of wealth over time.",
    customizeEyebrow: "MAKE IT YOURS",
    settings: "Simulation settings",
    close: "Close simulation settings",
    settingsLead: "Adjust the details behind your view.",
    withdrawalApproach: "Withdrawal approach",
    customAmount: "Custom amount",
    targetLifetime: "Target lifetime risk",
    lowerRisk: "Lower risk",
    higherRisk: "Higher risk",
    lowerWithdrawal: "Lower withdrawal",
    higherWithdrawal: "Higher withdrawal",
    impliedRisk: "Model-implied risk",
    derivedWithdrawal: "Model-derived withdrawal",
    perYear: "/ year",
    ceModel: "Unconstrained CE model",
    portfolioPolicy: "Portfolio policy",
    applyProjection: "Apply projected policy",
    projectionNote: "Keep allocations long-only and avoid borrowing.",
    projection: "Projection",
    projectionInfo: "is a feasible comparison policy.",
    simulationDetail: "Simulation detail",
  },
  de: {
    eyebrow: "IHR RUHESTAND IM BLICK",
    title: "Wie viel können Sie sich im Ruhestand auszahlen?",
    description:
      "Erkunden Sie, wie viel Sie sich jährlich auszahlen könnten, wenn Sie ein Risiko dafür wählen, dass Ihr Vermögen unter eine selbst gewählte Grenze fällt. Vergleichen Sie den Einfluss von Anlagerenditen, Inflation, Lebenserwartung und Anlagebeschränkungen.",
    previewTitle: "Sie betrachten einen Designentwurf.",
    preview:
      "CE-Entnahmediagramm, Aufteilung, Kapitalvergleich und Zulässigkeitsdiagnostik verwenden Ihre aktuellen Eingaben. Simulationsergebnisse stammen aus dem letzten abgeschlossenen Lauf.",
    checkingStorage: "Gespeicherte Konfiguration wird gesucht…",
    preparingMortality: "Sterblichkeitsdaten werden vorbereitet…",
    fitting: "Sterblichkeitsmodelle werden angepasst",
    starts: "Startpunkte",
    reviewMortality:
      "Öffnen Sie Person & Sterblichkeit, um die Modelle zu prüfen und anzupassen.",
    yourSetup: "IHRE KONFIGURATION",
    retirementAge: "Ruhestandsalter",
    years: "Jahre",
    capital: "Anfangskapital",
    impoverishment: "Verarmungsgrenze",
    annualWithdrawal: "Jährliche Entnahme",
    targetRisk: "Zielrisiko",
    editSetup: "Konfiguration bearbeiten",
    customize: "Ansichten auswählen",
    chooseVisuals: "Wählen Sie Ihre Ansichten",
    chooseDescription:
      "Wählen Sie die Ansichten aus, die Sie erkunden möchten. Aktivieren Sie Vermögenspfade vor einem Lauf, um eine Stichprobe zu speichern.",
    visualNote:
      "Die Sterblichkeitsanpassung finden Sie unter Person & Sterblichkeit. CE-Diagramm, Aufteilung, Kapitalvergleich und globale Zulässigkeit werden berechnet, wenn sie verfügbar sind. Das GM-Risiko wird nach Abschluss einer Simulation geschätzt. Zeit- und Pfadansichten verwenden denselben Lauf.",
    withdrawal: "Entnahme & Risiko",
    estimatedGM: "Geschätztes GM-Risiko",
    valueRisk: "Wert der Risikoübernahme",
    portfolioPolicies: "Portfolio & Strategien",
    allocation: "Portfolioaufteilung",
    impoverishmentBorrowing: "Verarmung & Kreditaufnahme",
    timing: "Verarmungszeitpunkt",
    borrowing: "Kreditaufnahme",
    trajectories: "Vermögenspfade",
    illustrative: "Beispielhafte Vermögenspfade",
    decisionEyebrow: "01 / DIE ENTSCHEIDUNG",
    decisionDescription:
      "Finden Sie ein für Ihren Ruhestand passendes Gleichgewicht.",
    portfolioEyebrow: "02 / PORTFOLIO",
    portfolioDescription:
      "Sehen Sie, wie die gewählte Strategie Ihr Portfolio aufteilt.",
    exposureEyebrow: "03 / RISIKEN VERSTEHEN",
    projectedExposure:
      "Erkunden Sie mögliche Ergebnisse der gewählten Strategie.",
    unconstrainedExposure:
      "Erkunden Sie mögliche Ergebnisse und die Kreditaufnahme der unbeschränkten Strategie.",
    pathsEyebrow: "04 / BEISPIELPFADE",
    pathsDescription: "Erkunden Sie beispielhafte Vermögensverläufe.",
    customizeEyebrow: "INDIVIDUELL ANPASSEN",
    settings: "Simulationseinstellungen",
    close: "Simulationseinstellungen schließen",
    settingsLead: "Passen Sie die Einstellungen Ihrer Ansicht an.",
    withdrawalApproach: "Entnahmeansatz",
    customAmount: "Eigener Betrag",
    targetLifetime: "Lebenslanges Zielrisiko",
    lowerRisk: "Geringeres Risiko",
    higherRisk: "Höheres Risiko",
    lowerWithdrawal: "Geringere Entnahme",
    higherWithdrawal: "Höhere Entnahme",
    impliedRisk: "Modelliertes Risiko",
    derivedWithdrawal: "Modellierte Entnahme",
    perYear: "/ Jahr",
    ceModel: "Unbeschränktes CE-Modell",
    portfolioPolicy: "Portfoliostrategie",
    applyProjection: "Projizierte Strategie anwenden",
    projectionNote: "Nur positive Anlagepositionen und keine Kreditaufnahme.",
    projection: "Projektion",
    projectionInfo: "ist eine zulässige Vergleichsstrategie.",
    simulationDetail: "Simulationsdetails",
  },
};
