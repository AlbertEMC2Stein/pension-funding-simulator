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
  designDraft: string;
  preview: string;
  themeLight: string;
  themeDark: string;
  switchToLight: string;
  switchToDark: string;
  languageLabel: string;
  languagePartial: string;
  preferenceReadError: string;
  preferenceWriteError: string;
  footer: string;
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
    railHeadline: "Plan with perspective.",
    railDescription: "A clearer view of the choices shaping retirement.",
    designDraft: "Design draft",
    preview: "Interface preview",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    languageLabel: "Language (translation in progress)",
    languagePartial:
      "The navigation is translated; panel content is still being translated.",
    preferenceReadError:
      "Display preferences could not be restored from this browser.",
    preferenceWriteError:
      "Display preferences could not be saved in this browser.",
    footer: "Design draft · all values illustrative",
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
    railHeadline: "Mit Weitblick planen.",
    railDescription:
      "Ein klarer Blick auf die Entscheidungen für den Ruhestand.",
    designDraft: "Designentwurf",
    preview: "Oberflächenvorschau",
    themeLight: "Heller Modus",
    themeDark: "Dunkler Modus",
    switchToLight: "Zum hellen Design wechseln",
    switchToDark: "Zum dunklen Design wechseln",
    languageLabel: "Sprache (Übersetzung in Arbeit)",
    languagePartial:
      "Die Navigation ist übersetzt; die Übersetzung der Inhalte folgt noch.",
    preferenceReadError:
      "Die Anzeigeeinstellungen konnten nicht aus diesem Browser geladen werden.",
    preferenceWriteError:
      "Die Anzeigeeinstellungen konnten nicht in diesem Browser gespeichert werden.",
    footer: "Designentwurf · alle Werte dienen der Veranschaulichung",
  },
};
