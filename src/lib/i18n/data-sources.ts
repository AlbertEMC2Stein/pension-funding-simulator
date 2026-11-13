import type { Language } from "./messages";

/** Wording for the market and mortality data-source dialogs. */
export interface DataSourceMessages {
  marketButton: string;
  marketLabel: string;
  marketTitle: string;
  closeMarket: string;
  marketIntro: string;
  marketCsv: string;
  marketSites: string;
  opensNewTab: string;
  mortalityButton: string;
  mortalityLabel: string;
  mortalityTitle: string;
  closeMortality: string;
  mortalityIntro: (first: number, last: number) => string;
  mortalityMethod: (age: number) => string;
  mortalitySource: string;
  destatisLink: string;
}

/** The data source, CSV format and cohort limitations in both languages. */
export const dataSourceMessages: Record<Language, DataSourceMessages> = {
  en: {
    marketButton: "Market data sources",
    marketLabel: "MARKET DATA",
    marketTitle: "Choosing market inputs",
    closeMarket: "Close market data information",
    marketIntro:
      "Enter your own annual growth, volatility and correlation assumptions, or import a CSV of historical prices to estimate them. Historical estimates depend on the period selected and are not predictions of future returns.",
    marketCsv:
      "For a CSV import, use a date column in YYYY-MM-DD format and one column per asset containing adjusted closing prices in euros. Check dividend and split adjustments, currency conversion and data coverage before importing.",
    marketSites:
      "The following sites are starting points for researching securities and historical prices. They are not connected to this simulator, and their data may require preparation before import. Availability and download options vary; their displayed statistics may use different definitions.",
    opensNewTab: "opens in a new tab",
    mortalityButton: "About the data",
    mortalityLabel: "MORTALITY DATA",
    mortalityTitle: "About the cohort tables",
    closeMortality: "Close data information",
    mortalityIntro: (first, last) =>
      `The simulator includes a snapshot of German cohort life tables from Destatis for birth years ${first}–${last}. Tables are available for women and men, with low, medium, and high life-expectancy scenarios. These scenarios include projected mortality and are not predictions for an individual.`,
    mortalityMethod: (age) =>
      `We extract the annual death probabilities into smaller files without rounding. The site builds survival from the selected retirement age; a custom mix combines the two conditional survival curves. The data cover annual probabilities up to age ${age}; the fitted models can describe survival beyond this range within their respective domains.`,
    mortalitySource:
      "The packaged snapshot is not updated automatically. Destatis explains the data and its assumptions on its official source page (in German).",
    destatisLink: "Visit the Destatis cohort life tables",
  },
  de: {
    marketButton: "Marktdatenquellen",
    marketLabel: "MARKTDATEN",
    marketTitle: "Markteingaben auswählen",
    closeMarket: "Informationen zu Marktdaten schließen",
    marketIntro:
      "Geben Sie eigene Annahmen für jährliches Wachstum, Volatilität und Korrelation ein oder importieren Sie historische Kurse als CSV, um sie zu schätzen. Historische Schätzungen hängen vom gewählten Zeitraum ab und sind keine Prognosen künftiger Renditen.",
    marketCsv:
      "Verwenden Sie für den CSV-Import eine Datumsspalte im Format JJJJ-MM-TT und pro Anlage eine Spalte mit angepassten Schlusskursen in Euro. Prüfen Sie vor dem Import die Anpassung für Dividenden und Splits, die Währungsumrechnung und die Datenabdeckung.",
    marketSites:
      "Die folgenden Seiten sind Ausgangspunkte für die Recherche zu Wertpapieren und historischen Kursen. Sie sind nicht mit diesem Simulator verbunden; ihre Daten müssen vor dem Import möglicherweise aufbereitet werden. Verfügbarkeit und Downloadoptionen variieren, und angezeigte Kennzahlen können anders definiert sein.",
    opensNewTab: "öffnet sich in einem neuen Tab",
    mortalityButton: "Über die Daten",
    mortalityLabel: "STERBLICHKEITSDATEN",
    mortalityTitle: "Über die Kohortentafeln",
    closeMortality: "Dateninformationen schließen",
    mortalityIntro: (first, last) =>
      `Der Simulator enthält einen Datenstand deutscher Kohortensterbetafeln von Destatis für die Geburtsjahre ${first}–${last}. Es gibt Tafeln für Frauen und Männer mit niedrigen, mittleren und hohen Lebenserwartungsszenarien. Diese enthalten projizierte Sterblichkeit und sind keine individuellen Vorhersagen.`,
    mortalityMethod: (age) =>
      `Die jährlichen Sterbewahrscheinlichkeiten werden ohne Rundung in kleinere Dateien übernommen. Die Überlebenskurve beginnt beim gewählten Ruhestandsalter; eine benutzerdefinierte Mischung verbindet die beiden bedingten Überlebenskurven. Die Daten enthalten jährliche Wahrscheinlichkeiten bis zum Alter ${age}; die angepassten Modelle können das Überleben innerhalb ihres jeweiligen Definitionsbereichs darüber hinaus beschreiben.`,
    mortalitySource:
      "Der enthaltene Datenstand wird nicht automatisch aktualisiert. Destatis erläutert die Daten und Annahmen auf der offiziellen Quellseite.",
    destatisLink: "Destatis-Kohortensterbetafeln öffnen",
  },
};
