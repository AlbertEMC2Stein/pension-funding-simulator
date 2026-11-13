import type { Language } from "./messages";

/** Labels for the editable asset list and symmetric correlation matrix. */
export interface AssetEditorMessages {
  matrix: string;
  asset: string;
  empty: string;
  unnamed: string;
  diagonal: (i: number, value: string) => string;
  pair: (i: number, j: number) => string;
  mirrored: (i: number, j: number, value: string) => string;
  count: (count: number, max: number) => string;
  title: string;
  chooseCsv: string;
  importPrices: string;
  add: string;
  importFailed: string;
  importKept: string;
  name: string;
  growth: string;
  volatility: string;
  perYear: string;
  assetName: (i: number) => string;
  growthLabel: (i: number) => string;
  volatilityLabel: (i: number) => string;
  remove: (i: number, name: string) => string;
  maxAssets: (max: number) => string;
  hideMatrix: string;
  showMatrix: string;
  introStart: string;
  growthLink: string;
  and: string;
  volatilityLink: string;
  introMiddle: string;
  pricesLink: string;
  introEnd: string;
  riskFreeLink: string;
  inflationLink: string;
  introLast: string;
  matrixStart: string;
  correlationLink: string;
  matrixEnd: string;
}

/** Text for market assumptions, without translating stored asset names or values. */
export const assetEditorMessages: Record<Language, AssetEditorMessages> = {
  en: {
    matrix: "Asset correlation matrix",
    asset: "Asset",
    empty: "empty",
    unnamed: "unnamed",
    diagonal: (i, v) =>
      `Correlation of asset ${i} with itself, fixed at 1, current value ${v}`,
    pair: (i, j) => `Correlation of asset ${i} with asset ${j}`,
    mirrored: (i, j, v) =>
      `Mirrored correlation of asset ${i} with asset ${j}: ${v}`,
    count: (count, max) => `${count} OF ${max} ASSETS`,
    title: "Asset universe",
    chooseCsv: "Choose a price CSV",
    importPrices: "Import price data",
    add: "Add asset",
    importFailed: "Import failed:",
    importKept: "Your current inputs have been kept.",
    name: "Asset name",
    growth: "Expected annual growth",
    volatility: "Volatility",
    perYear: "% / year",
    assetName: (i) => `Asset ${i} name`,
    growthLabel: (i) =>
      `Expected annual nominal growth for asset ${i}, percent per year`,
    volatilityLabel: (i) =>
      `Annual volatility for asset ${i}, percent per year`,
    remove: (i, name) => `Remove asset ${i}: ${name}`,
    maxAssets: (max) => `Maximum of ${max} assets reached.`,
    hideMatrix: "Hide correlation matrix",
    showMatrix: "Show / edit correlation matrix",
    introStart: "Enter expected annual",
    growthLink: "nominal growth",
    and: "and",
    volatilityLink: "volatility",
    introMiddle:
      "as percentages. Growth is an annualized compounded rate. Import",
    pricesLink: "adjusted EUR closing prices",
    introEnd: "or edit assumptions directly; enter the",
    riskFreeLink: "risk-free rate",
    inflationLink: "inflation",
    introLast: "separately above.",
    matrixStart: "Enter",
    correlationLink: "correlations",
    matrixEnd:
      "from −1 to 1 below the diagonal. The diagonal is fixed at 1, and values above it are mirrored automatically. Zero is an initial assumption, not an estimate.",
  },
  de: {
    matrix: "Korrelationsmatrix der Anlagen",
    asset: "Anlage",
    empty: "leer",
    unnamed: "unbenannt",
    diagonal: (i, v) =>
      `Korrelation von Anlage ${i} mit sich selbst, fest auf 1 gesetzt, aktueller Wert ${v}`,
    pair: (i, j) => `Korrelation von Anlage ${i} mit Anlage ${j}`,
    mirrored: (i, j, v) =>
      `Gespiegelte Korrelation von Anlage ${i} mit Anlage ${j}: ${v}`,
    count: (count, max) => `${count} VON ${max} ANLAGEN`,
    title: "Anlageuniversum",
    chooseCsv: "Kurs-CSV auswählen",
    importPrices: "Kursdaten importieren",
    add: "Anlage hinzufügen",
    importFailed: "Import fehlgeschlagen:",
    importKept: "Ihre bisherigen Eingaben wurden beibehalten.",
    name: "Name der Anlage",
    growth: "Erwartetes jährliches Wachstum",
    volatility: "Volatilität",
    perYear: "% / Jahr",
    assetName: (i) => `Name der Anlage ${i}`,
    growthLabel: (i) =>
      `Erwartetes jährliches nominales Wachstum von Anlage ${i} in Prozent pro Jahr`,
    volatilityLabel: (i) =>
      `Jährliche Volatilität von Anlage ${i} in Prozent pro Jahr`,
    remove: (i, name) => `Anlage ${i} entfernen: ${name}`,
    maxAssets: (max) => `Höchstzahl von ${max} Anlagen erreicht.`,
    hideMatrix: "Korrelationsmatrix ausblenden",
    showMatrix: "Korrelationsmatrix anzeigen / bearbeiten",
    introStart: "Geben Sie das erwartete jährliche",
    growthLink: "nominale Wachstum",
    and: "und die",
    volatilityLink: "Volatilität",
    introMiddle:
      "in Prozent ein. Das Wachstum ist eine annualisierte aufgezinste Rate. Importieren Sie",
    pricesLink: "angepasste Schlusskurse in Euro",
    introEnd: "oder bearbeiten Sie die Annahmen direkt; geben Sie den",
    riskFreeLink: "risikofreien Zinssatz",
    inflationLink: "Inflation",
    introLast: "oben getrennt ein.",
    matrixStart: "Geben Sie",
    correlationLink: "Korrelationen",
    matrixEnd:
      "zwischen −1 und 1 unterhalb der Diagonale ein. Die Diagonale ist auf 1 festgelegt; darüberliegende Werte werden automatisch gespiegelt. Null ist eine anfängliche Annahme und keine Schätzung.",
  },
};
