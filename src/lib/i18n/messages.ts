/** Languages currently offered by the interface. */
export type Language = "en" | "de";

/** Stable navigation keys, shared by both translations. */
export type NavigationKey =
  "evaluation" | "setup" | "data" | "help" | "developer";

/** Text used by the application shell; other panels will be added incrementally. */
export interface ShellMessages {
  workspace: string;
  navigation: Record<NavigationKey, string>;
  home: string;
  railHeadline: string;
  railDescription: string;
  themeLight: string;
  themeDark: string;
  switchToLight: string;
  switchToDark: string;
  languageLabel: string;
  documentTitle: string;
  documentDescription: string;
  preferenceReadError: string;
  preferenceWriteError: string;
}

/** English and German shell copy; matching keys are enforced by TypeScript. */
export const shellMessages: Record<Language, ShellMessages> = {
  en: {
    workspace: "Workspace",
    navigation: {
      evaluation: "Evaluation",
      setup: "Market & investor",
      data: "Data & tables",
      help: "Dictionary & help",
      developer: "Developer tools",
    },
    home: "Stillwell home",
    railHeadline: "Retirement withdrawals",
    railDescription: "Compare withdrawals and risks using your own assumptions.",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    languageLabel: "Language",
    documentTitle: "Stillwell — Pension funding simulator",
    documentDescription:
      "Explore retirement withdrawals and risks under your chosen assumptions.",
    preferenceReadError:
      "Display preferences could not be restored from this browser.",
    preferenceWriteError:
      "Display preferences could not be saved in this browser.",
  },
  de: {
    workspace: "Arbeitsbereich",
    navigation: {
      evaluation: "Auswertung",
      setup: "Markt & Person",
      data: "Daten & Tabellen",
      help: "Glossar & Hilfe",
      developer: "Entwicklerwerkzeuge",
    },
    home: "Stillwell Startseite",
    railHeadline: "Auszahlungen im Ruhestand",
    railDescription:
      "Vergleichen Sie Auszahlungen und Risiken anhand Ihrer eigenen Annahmen.",
    themeLight: "Heller Modus",
    themeDark: "Dunkler Modus",
    switchToLight: "Zum hellen Design wechseln",
    switchToDark: "Zum dunklen Design wechseln",
    languageLabel: "Sprache",
    documentTitle: "Stillwell — Ruhestandsfinanzierungssimulator",
    documentDescription:
      "Erkunden Sie Auszahlungen und Risiken im Ruhestand anhand Ihrer eigenen Annahmen.",
    preferenceReadError:
      "Die Anzeigeeinstellungen konnten nicht aus diesem Browser geladen werden.",
    preferenceWriteError:
      "Die Anzeigeeinstellungen konnten nicht in diesem Browser gespeichert werden.",
  },
};
