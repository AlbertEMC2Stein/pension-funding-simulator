import type { Language } from "../i18n/messages";

/** Appearance and language selector values saved independently of setup data. */
export interface DisplayPreferences {
  theme: "light" | "dark";
  /** Selected language; individual panels are translated incrementally. */
  language: Language;
}

/** Storage methods used for local display preferences. */
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Versioned key, separate from the editable simulation setup. */
export const DISPLAY_PREFERENCES_KEY = "pension-funding-simulator:display:v1";

/** Default appearance and language for a new browser. */
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  theme: "light",
  language: "en",
};

/**
 * Restore supported values, falling back independently for missing or invalid
 * fields. Unreadable JSON also falls back without modifying browser storage.
 * Storage access errors are left to the caller to handle.
 */
export function readDisplayPreferences(
  storage: PreferenceStorage,
): DisplayPreferences {
  const source = storage.getItem(DISPLAY_PREFERENCES_KEY);

  if (source === null) return { ...DEFAULT_DISPLAY_PREFERENCES };

  try {
    const value: unknown = JSON.parse(source);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ...DEFAULT_DISPLAY_PREFERENCES };
    }

    const fields = value as Record<string, unknown>;

    return {
      theme: fields.theme === "dark" ? "dark" : "light",
      language: fields.language === "de" ? "de" : "en",
    };
  } catch {
    return { ...DEFAULT_DISPLAY_PREFERENCES };
  }
}

/** Save the user's display choices without changing their setup or results. */
export function writeDisplayPreferences(
  storage: PreferenceStorage,
  preferences: DisplayPreferences,
): void {
  storage.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify(preferences));
}
