import type { Language } from "./messages";

/** Translated workflow text; destinations remain language-independent. */
export interface QuickStartMessages {
  eyebrow: string;
  title: string;
  introduction: string;
  steps: readonly { title: string; description: string; action: string }[];
  fitNote: string;
  resultNote: string;
}

/** Guidance for the current setup, mortality fit, simulation and export workflow. */
export const quickStartMessages: Record<Language, QuickStartMessages> = {
  en: {
    eyebrow: "GETTING STARTED",
    title: "Your quick start",
    introduction: "Start with the example or build a setup of your own.",
    steps: [
      {
        title: "Set up the market",
        description:
          "In the Market tab, review the example assets and assumptions, enter your own, or import adjusted closing prices in euros.",
        action: "Open Market & investor",
      },
      {
        title: "Set up the investor and fit mortality",
        description:
          "In Investor & mortality, enter your retirement details, starting capital and impoverishment level. Review the survival curve and fit the mortality models.",
        action: "Open Market & investor",
      },
      {
        title: "Choose a withdrawal and run",
        description:
          "On Evaluation, open Simulation settings to choose a target risk or withdrawal. Optionally enable projection, then run the simulation and explore the results.",
        action: "Open Evaluation",
      },
      {
        title: "Compare and save",
        description:
          "Use Data & tables to compare variations. Export your setup separately from your results; chart menus offer image and data downloads.",
        action: "Open Data & tables",
      },
    ],
    fitNote:
      "On startup, the mortality models normally fit automatically using your restored inputs. After changing relevant inputs or importing a setup, check and fit the models in Investor & mortality before running.",
    resultNote:
      "Inputs are normally saved in this browser, but fits and results are not saved automatically. Results are model-based estimates; Monte Carlo intervals describe sampling uncertainty only.",
  },
  de: {
    eyebrow: "ERSTE SCHRITTE",
    title: "Schnellstart",
    introduction:
      "Beginnen Sie mit dem Beispiel oder erstellen Sie eine eigene Konfiguration.",
    steps: [
      {
        title: "Markt konfigurieren",
        description:
          "Prüfen Sie im Reiter Markt die Beispielanlagen und Annahmen, geben Sie eigene Werte ein oder importieren Sie angepasste Schlusskurse in Euro.",
        action: "Markt & Person öffnen",
      },
      {
        title: "Persönliche Daten und Sterblichkeitsmodelle",
        description:
          "Geben Sie unter Person & Sterblichkeit Ihre Ruhestandsdaten, Ihr Anfangskapital und Ihre Verarmungsgrenze ein. Prüfen Sie die Überlebenskurve und passen Sie die Modelle an.",
        action: "Markt & Person öffnen",
      },
      {
        title: "Auszahlung wählen und Simulation starten",
        description:
          "Wählen Sie unter Auswertung in den Simulationseinstellungen ein Zielrisiko oder einen Auszahlungsbetrag. Aktivieren Sie bei Bedarf die Projektion und starten Sie die Simulation.",
        action: "Auswertung öffnen",
      },
      {
        title: "Vergleichen und speichern",
        description:
          "Vergleichen Sie Varianten unter Daten & Tabellen. Exportieren Sie Ihre Konfiguration und die Ergebnisse getrennt; Diagramme lassen sich als Bild oder Daten herunterladen.",
        action: "Daten & Tabellen öffnen",
      },
    ],
    fitNote:
      "Beim Start werden die Sterblichkeitsmodelle normalerweise automatisch anhand Ihrer wiederhergestellten Eingaben angepasst. Nach relevanten Änderungen oder dem Import einer Konfiguration prüfen und passen Sie die Modelle vor der Simulation erneut an.",
    resultNote:
      "Eingaben werden normalerweise in diesem Browser gespeichert, Anpassungen und Simulationsergebnisse jedoch nicht. Die Ergebnisse sind modellbasierte Schätzungen; Monte-Carlo-Intervalle beschreiben ausschließlich die Stichprobenunsicherheit.",
  },
};
