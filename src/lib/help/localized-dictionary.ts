import {
  dictionaryEntries,
  type DictionaryEntry,
  type DictionaryTermId,
} from "./dictionary";
import { germanDictionary } from "./dictionary-de";
import type { Language } from "../i18n/messages";

/** German category names for the language-independent glossary structure. */
const germanCategories: Record<string, string> = {
  "RETIREMENT & WEALTH": "RUHESTAND & VERMÖGEN",
  MARKET: "MARKT",
  MORTALITY: "STERBLICHKEIT",
  "RISK & RESULTS": "RISIKO & ERGEBNISSE",
  SIMULATION: "SIMULATION",
  "PORTFOLIO POLICY": "PORTFOLIOSTRATEGIE",
  "SAVING & EXPORT": "SPEICHERN & EXPORT",
};

/** Return the authored glossary entries in the selected language, sharing formulas and IDs. */
export function localizedDictionary(
  language: Language,
): readonly DictionaryEntry[] {
  if (language === "en") return dictionaryEntries;

  return dictionaryEntries.map((entry) => ({
    ...entry,
    ...germanDictionary[entry.id],
    category: germanCategories[entry.category] ?? entry.category,
  }));
}

/** Resolve a term title for accessible links without duplicating navigation IDs. */
export function localizedTermTitle(
  term: DictionaryTermId,
  language: Language,
): string {
  return language === "de"
    ? germanDictionary[term].title
    : dictionaryEntries.find((entry) => entry.id === term)!.title;
}
