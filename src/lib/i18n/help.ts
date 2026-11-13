import type { Language } from "./messages";
import type { ResultStatus } from "../../components/StatusBadge";

/** Localized labels and status explanations for the dictionary and help page. */
interface HelpMessages {
  eyebrow: string;
  title: string;
  description: string;
  guide: string;
  statuses: string;
  statusIntro: string;
  statusDescriptions: Record<ResultStatus, string>;
  search: string;
  placeholder: string;
  count: (count: number) => string;
  math: string;
  technical: string;
  empty: string;
  asideLabel: string;
  asideTitle: string;
  asideText: string;
}

/** Page copy; technical article text is maintained in the glossary registry. */
export const helpMessages: Record<Language, HelpMessages> = {
  en: {
    eyebrow: "HERE WHEN YOU NEED IT",
    title: "A little more clarity",
    description:
      "Plain-language explanations, with technical detail when you want it.",
    guide: "A QUICK GUIDE",
    statuses: "Result statuses",
    statusIntro:
      "These labels explain the state of a result. The examples do not reflect an actual run.",
    statusDescriptions: {
      "not-calculated": "No result has been calculated yet.",
      "not-available":
        "The result cannot be calculated or does not apply to these settings.",
      queued: "Waiting for a simulation worker.",
      running: "A calculation is in progress or stopping.",
      "needs-updating": "Inputs changed after this result was captured.",
      error: "The calculation failed; its message explains what happened.",
      cancelled: "The calculation was stopped before completion.",
      calculated: "A result is available for the captured settings.",
    },
    search: "Search the dictionary",
    placeholder: "Try ‘risk’ or ‘withdrawal’",
    count: (count) => `Showing ${count} ${count === 1 ? "term" : "terms"}`,
    math: "Equations are rendered in the technical details of selected entries.",
    technical: "Technical details",
    empty: "No matching terms. Try another search.",
    asideLabel: "LEARN AS YOU GO",
    asideTitle: "As much detail as you need.",
    asideText:
      "Choose an underlined term in the workspace to open its explanation here. Card help offers a shorter guide without leaving your current view.",
  },
  de: {
    eyebrow: "HILFE BEI BEDARF",
    title: "Etwas mehr Klarheit",
    description: "Verständliche Erklärungen und auf Wunsch technische Details.",
    guide: "KURZ ERKLÄRT",
    statuses: "Ergebnisstatus",
    statusIntro:
      "Diese Kennzeichnungen beschreiben den Zustand eines Ergebnisses. Die Beispiele beziehen sich nicht auf einen tatsächlichen Lauf.",
    statusDescriptions: {
      "not-calculated": "Es wurde noch kein Ergebnis berechnet.",
      "not-available":
        "Das Ergebnis kann nicht berechnet werden oder gilt für diese Einstellungen nicht.",
      queued: "Wartet auf einen Simulationsprozess.",
      running: "Eine Berechnung läuft oder wird beendet.",
      "needs-updating": "Die Eingaben haben sich seit der Berechnung geändert.",
      error:
        "Die Berechnung ist fehlgeschlagen; die Meldung erläutert den Grund.",
      cancelled: "Die Berechnung wurde vorzeitig beendet.",
      calculated: "Ein Ergebnis für die erfassten Einstellungen liegt vor.",
    },
    search: "Glossar durchsuchen",
    placeholder: "Zum Beispiel ‚Risiko‘ oder ‚Auszahlung‘",
    count: (count) =>
      `${count} ${count === 1 ? "Begriff" : "Begriffe"} angezeigt`,
    math: "Gleichungen erscheinen in den technischen Details ausgewählter Einträge.",
    technical: "Technische Details",
    empty: "Keine passenden Begriffe. Versuchen Sie eine andere Suche.",
    asideLabel: "BEIM ERKUNDEN LERNEN",
    asideTitle: "So viel Detail wie Sie möchten.",
    asideText:
      "Wählen Sie einen unterstrichenen Begriff im Arbeitsbereich, um hier seine Erklärung zu öffnen. Die Hilfe einer Karte bietet eine kurze Erklärung, ohne die aktuelle Ansicht zu verlassen.",
  },
};
