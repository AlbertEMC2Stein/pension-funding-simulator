import type { Language } from "./messages";
import { validationMessage } from "./validation";

/** User-facing messages for setup import and export. */
export interface SetupActionMessages {
  import: string;
  export: string;
  exported: string;
  imported: string;
  versionMismatch: string;
  tooLarge: string;
  importFailed: string;
  exportFailed: string;
}

/** Setup file messages; the serialized file format is language-independent. */
export const setupActionMessages: Record<Language, SetupActionMessages> = {
  en: {
    import: "Import setup",
    export: "Export setup",
    exported: "Setup exported. Results are not included.",
    imported:
      "Setup imported. Fit mortality and run simulations to calculate results.",
    versionMismatch:
      "Setup imported from a different model or cohort-data version. Review it before recalculating.",
    tooLarge: "The setup file is too large (maximum 2 MB).",
    importFailed: "Could not import the setup.",
    exportFailed: "Could not export the setup.",
  },
  de: {
    import: "Konfiguration importieren",
    export: "Konfiguration exportieren",
    exported: "Konfiguration exportiert. Ergebnisse sind nicht enthalten.",
    imported:
      "Konfiguration importiert. Passen Sie die Sterblichkeitsmodelle an und starten Sie die Simulation, um Ergebnisse zu berechnen.",
    versionMismatch:
      "Die importierte Konfiguration verwendet eine andere Modell- oder Kohortendatenversion. Prüfen Sie sie vor einer erneuten Berechnung.",
    tooLarge: "Die Konfigurationsdatei ist zu groß (höchstens 2 MB).",
    importFailed: "Die Konfiguration konnte nicht importiert werden.",
    exportFailed: "Die Konfiguration konnte nicht exportiert werden.",
  },
};

/** Translate fixed setup-file validation errors while preserving unknown details. */
export function setupFileError(message: string, language: Language): string {
  if (language === "en") return message;

  const translations: Record<string, string> = {
    "The file is not valid JSON.": "Die Datei ist kein gültiges JSON.",
    "This is not a supported setup file (expected version 1).":
      "Diese Konfigurationsdatei wird nicht unterstützt (erwartet wird Version 1).",
    "The setup name, inputs or tables are missing or invalid.":
      "Der Konfigurationsname, die Eingaben oder Tabellen fehlen oder sind ungültig.",
    "The market, investor or simulation settings are missing.":
      "Die Markt-, Personen- oder Simulationseinstellungen fehlen.",
    "The market settings are malformed.":
      "Die Markteinstellungen sind fehlerhaft.",
    "An asset entry is malformed or has a duplicate ID.":
      "Ein Anlageneintrag ist fehlerhaft oder hat eine doppelte Kennung.",
    "The correlation matrix or next asset ID is invalid.":
      "Die Korrelationsmatrix oder die nächste Anlagenkennung ist ungültig.",
    "The investor settings are malformed.":
      "Die persönlichen Einstellungen sind fehlerhaft.",
    "The simulation settings are malformed.":
      "Die Simulationseinstellungen sind fehlerhaft.",
    "Invalid correlation matrix: every diagonal entry must equal 1.":
      "Ungültige Korrelationsmatrix: Alle Diagonaleinträge müssen 1 sein.",
    "Invalid saved risk or withdrawal setting.":
      "Das gespeicherte Risiko oder die Entnahme ist ungültig.",
    [setupActionMessages.en.tooLarge]: setupActionMessages.de.tooLarge,
    [setupActionMessages.en.importFailed]: setupActionMessages.de.importFailed,
    [setupActionMessages.en.exportFailed]: setupActionMessages.de.exportFailed,
  };

  /** Map the stable table identifier to its German display name. */
  function tableName(kind: string): string {
    return kind === "withdrawal" ? "Entnahmetabelle" : "Zulässigkeitstabelle";
  }
  const malformedTable =
    /^The (withdrawal|feasibility) table is malformed\.$/.exec(message);
  if (malformedTable)
    return `Die ${tableName(malformedTable[1])} ist fehlerhaft.`;

  const malformedRow =
    /^A (withdrawal|feasibility) table row is malformed or has a duplicate ID\.$/.exec(
      message,
    );
  if (malformedRow)
    return `Eine Zeile der ${tableName(malformedRow[1])} ist fehlerhaft oder hat eine doppelte Kennung.`;

  const invalidRow =
    /^Invalid input for (.+) in the (withdrawal|feasibility) table\.$/.exec(
      message,
    );
  if (invalidRow)
    return `Ungültige Eingabe für ${invalidRow[1]} in der ${tableName(invalidRow[2])}.`;

  const invalidThreshold =
    /^Invalid impoverishment level for (.+) in the feasibility table\.$/.exec(
      message,
    );
  if (invalidThreshold)
    return `Ungültige Verarmungsgrenze für ${invalidThreshold[1]} in der Zulässigkeitstabelle.`;

  const prefix = "Invalid setup inputs: ";
  if (message.startsWith(prefix)) {
    return `Ungültige Konfigurationseingaben: ${validationMessage(message.slice(prefix.length), language)}`;
  }

  return translations[message] ?? message;
}
