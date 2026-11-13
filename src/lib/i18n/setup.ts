import type { Language } from "./messages";

/** Primary labels used by the market and investor setup views. */
export interface SetupMessages {
  eyebrow: string;
  title: string;
  description: string;
  preview: string;
  previewDescription: string;
  yourSetup: string;
  nameSetup: string;
  savedNote: string;
  setupName: string;
  tabs: string;
  market: string;
  investor: string;
  reviewFit: string;
  calibrationNote: string;
  calibrationHeadline: string;
  calibrationDescription: string;
  investmentEyebrow: string;
  marketTitle: string;
  marketDescription: string;
  reset: string;
  undo: string;
  yourMarket: string;
  marketInputs: string;
  currency: string;
  riskFree: string;
  inflation: string;
  perYear: string;
  invalidRates: string;
  realRateLabel: (rate: string) => string;
  marketFitBefore: string;
  mortalityModel: string;
  marketFitAfter: string;
  cohortIntro: string;
  cohortLink: string;
  survivalLink: string;
  fitModelsIntro: string;
  modelsLink: string;
  fitStale: string;
  fitReview: string;
  cohortUnchanged: string;
  mortalityData: string;
  cohortHeadline: string;
  cohortDescription: string;
  retirementProfile: string;
  investorTitle: string;
  investorDescription: string;
  details: string;
  birthYear: string;
  retirementYear: string;
  mortalityTable: string;
  female: string;
  male: string;
  mixture: string;
  longevity: string;
  medium: string;
  low: string;
  high: string;
  initialCapital: string;
  impoverishment: string;
  availableCohorts: string;
  supportedAges: string;
  thresholdError: string;
  lessThan: string;
  ofCapital: string;
  maleWeight: string;
  mixtureDescription: string;
  mortalityCalibration: string;
  survivalFit: string;
}

/** Shared English/German setup labels; field values remain language-independent. */
export const setupMessages: Record<Language, SetupMessages> = {
  en: {
    eyebrow: "BUILD YOUR SETUP",
    title: "The foundations",
    description:
      "Set the market and investor assumptions behind your analysis.",
    preview: "Design preview.",
    previewDescription:
      "Explore the market and mortality inputs used by the simulator. Export your setup to save it for later.",
    yourSetup: "YOUR SETUP",
    nameSetup: "Name your setup",
    savedNote:
      "Your inputs are saved locally in this browser. Fits and results are not saved automatically.",
    setupName: "Setup name",
    tabs: "Setup sections",
    market: "Market",
    investor: "Investor & mortality",
    reviewFit: "Review fit",
    calibrationNote: "A NOTE ON CALIBRATION",
    calibrationHeadline: "Historical returns are not forecasts.",
    calibrationDescription:
      "Enter your own market assumptions or estimate them from historical prices. Results depend on the inputs you choose.",
    investmentEyebrow: "THE INVESTMENT UNIVERSE",
    marketTitle: "Market assumptions",
    marketDescription: "Define up to 10 assets and how they move together.",
    reset: "Reset to example",
    undo: "Undo reset",
    yourMarket: "YOUR MARKET",
    marketInputs: "Market inputs",
    currency: "Base currency",
    riskFree: "Nominal risk-free rate",
    inflation: "Inflation assumption",
    perYear: "% / year",
    invalidRates: "Enter a valid rate and inflation assumption.",
    realRateLabel: (rate) =>
      `Real rate after inflation: ${rate}% / year (continuously compounded).`,
    marketFitBefore: "Market assumptions can affect the fitted",
    mortalityModel: "mortality model",
    marketFitAfter:
      "After changing them, check the fit under Investor & mortality. The underlying cohort data do not change.",
    cohortIntro: "Explore",
    cohortLink: "cohort",
    survivalLink: "survival",
    fitModelsIntro: "from your expected retirement age and fit",
    modelsLink: "mortality models",
    fitStale: "The compatible CE fit needs updating after an input change.",
    fitReview:
      "The compatible CE fit depends on market assumptions. Check the fit again after changing them.",
    cohortUnchanged: "The cohort data themselves do not change.",
    mortalityData: "MORTALITY DATA",
    cohortHeadline: "Built around your cohort.",
    cohortDescription:
      "Your birth year, retirement age, and selected longevity scenario determine the cohort survival data used for calibration.",
    retirementProfile: "YOUR RETIREMENT PROFILE",
    investorTitle: "Investor & mortality",
    investorDescription:
      "Set the person and retirement context for your setup.",
    details: "A few details about you",
    birthYear: "Birth year",
    retirementYear: "Expected retirement year",
    mortalityTable: "Mortality table",
    female: "Female",
    male: "Male",
    mixture: "Custom mixture",
    longevity: "Longevity scenario",
    medium: "Medium",
    low: "Low",
    high: "High",
    initialCapital: "Initial capital",
    impoverishment: "Impoverishment level",
    availableCohorts: "Available cohorts",
    supportedAges: "Supported retirement ages: 0–99.",
    thresholdError: "Enter at least €1 and less than your initial capital.",
    lessThan: "Less than 0.01",
    ofCapital: "of initial capital",
    maleWeight: "Male weight",
    mixtureDescription:
      "Weights the female and male survival curves; 0.50 gives an equal mixture.",
    mortalityCalibration: "MORTALITY CALIBRATION",
    survivalFit: "Survival curve & model fit",
  },
  de: {
    eyebrow: "KONFIGURATION ERSTELLEN",
    title: "Die Grundlagen",
    description:
      "Legen Sie die Markt- und Personenannahmen Ihrer Analyse fest.",
    preview: "Designvorschau.",
    previewDescription:
      "Erkunden Sie die Markt- und Sterblichkeitseingaben des Simulators. Exportieren Sie Ihre Konfiguration, um sie später erneut zu verwenden.",
    yourSetup: "IHRE KONFIGURATION",
    nameSetup: "Konfiguration benennen",
    savedNote:
      "Ihre Eingaben werden lokal in diesem Browser gespeichert. Anpassungen und Ergebnisse werden nicht automatisch gespeichert.",
    setupName: "Name der Konfiguration",
    tabs: "Konfigurationsbereiche",
    market: "Markt",
    investor: "Person & Sterblichkeit",
    reviewFit: "Anpassung prüfen",
    calibrationNote: "HINWEIS ZUR KALIBRIERUNG",
    calibrationHeadline: "Historische Renditen sind keine Prognose.",
    calibrationDescription:
      "Geben Sie eigene Marktannahmen ein oder schätzen Sie diese anhand historischer Kurse. Die Ergebnisse hängen von Ihren Eingaben ab.",
    investmentEyebrow: "DAS ANLAGEUNIVERSUM",
    marketTitle: "Marktannahmen",
    marketDescription:
      "Legen Sie bis zu 10 Anlagen und ihre gemeinsamen Bewegungen fest.",
    reset: "Auf Beispiel zurücksetzen",
    undo: "Zurücksetzen rückgängig",
    yourMarket: "IHR MARKT",
    marketInputs: "Markteingaben",
    currency: "Basiswährung",
    riskFree: "Nominaler risikofreier Zinssatz",
    inflation: "Inflationsannahme",
    perYear: "% / Jahr",
    invalidRates:
      "Geben Sie einen gültigen Zinssatz und eine gültige Inflationsannahme ein.",
    realRateLabel: (rate) =>
      `Realzins nach Inflation: ${rate}% / Jahr (stetig verzinst).`,
    marketFitBefore: "Marktannahmen können das angepasste",
    mortalityModel: "Sterblichkeitsmodell",
    marketFitAfter:
      "beeinflussen. Prüfen Sie nach Änderungen die Anpassung unter Person & Sterblichkeit. Die zugrunde liegenden Kohortendaten ändern sich nicht.",
    cohortIntro: "Erkunden Sie das",
    cohortLink: "Kohorte",
    survivalLink: "Überleben",
    fitModelsIntro:
      "ab dem voraussichtlichen Ruhestandsalter und passen Sie die",
    modelsLink: "Sterblichkeitsmodelle",
    fitStale:
      "Die kompatible CE-Anpassung muss nach einer Eingabeänderung aktualisiert werden.",
    fitReview:
      "Die kompatible CE-Anpassung hängt von Marktannahmen ab. Prüfen Sie die Anpassung nach Änderungen erneut.",
    cohortUnchanged: "Die Kohortendaten selbst bleiben unverändert.",
    mortalityData: "STERBLICHKEITSDATEN",
    cohortHeadline: "Auf Ihrer Kohorte aufgebaut.",
    cohortDescription:
      "Ihr Geburtsjahr, Ruhestandsalter und Langlebigkeitsszenario bestimmen die Kohortenüberlebensdaten für die Kalibrierung.",
    retirementProfile: "IHR RUHESTANDSPROFIL",
    investorTitle: "Person & Sterblichkeit",
    investorDescription:
      "Legen Sie den persönlichen und zeitlichen Rahmen Ihrer Konfiguration fest.",
    details: "Einige Angaben zu Ihnen",
    birthYear: "Geburtsjahr",
    retirementYear: "Voraussichtliches Ruhestandsjahr",
    mortalityTable: "Sterbetafel",
    female: "Weiblich",
    male: "Männlich",
    mixture: "Eigene Mischung",
    longevity: "Langlebigkeitsszenario",
    medium: "Mittel",
    low: "Niedrig",
    high: "Hoch",
    initialCapital: "Anfangskapital",
    impoverishment: "Verarmungsgrenze",
    availableCohorts: "Verfügbare Kohorten",
    supportedAges: "Unterstütztes Ruhestandsalter: 0–99.",
    thresholdError:
      "Geben Sie mindestens 1 € und weniger als Ihr Anfangskapital ein.",
    lessThan: "Weniger als 0,01",
    ofCapital: "des Anfangskapitals",
    maleWeight: "Gewicht Männer",
    mixtureDescription:
      "Gewichtet die weibliche und männliche Überlebenskurve; 0,50 ergibt eine gleichmäßige Mischung.",
    mortalityCalibration: "STERBLICHKEITSKALIBRIERUNG",
    survivalFit: "Überlebenskurve & Modellanpassung",
  },
};
