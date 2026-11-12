import {
  parseSavedSetupDraft,
  SETUP_METADATA,
  type SetupTables,
} from "./setup-file";
import type { SimulationDraft } from "./simulation-options";

/** Namespaced, versioned key for the local editable draft. */
export const SAVED_DRAFT_KEY = "pension-funding-simulator:draft:v1";

/** Minimal storage interface, allowing browser failures to be tested independently. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Editable state persisted locally; calculated results are intentionally omitted. */
export interface SavedDraft {
  name: string;
  draft: SimulationDraft;
  tables: SetupTables;
}

/** Read and structurally validate a saved draft; an absent key means first visit. */
export function readSavedDraft(storage: DraftStorage): SavedDraft | null {
  const source = storage.getItem(SAVED_DRAFT_KEY);
  if (source === null) return null;
  if (source.length > 2_000_000) throw new Error("Saved draft is too large.");

  const parsed = parseSavedSetupDraft(source);
  return { name: parsed.name, draft: parsed.draft, tables: parsed.tables };
}

/** Save editable fields in a separate versioned local format, without results. */
export function writeSavedDraft(
  storage: DraftStorage,
  saved: SavedDraft,
): void {
  const source = JSON.stringify({
    format: "pension-funding-draft",
    version: 1,
    metadata: SETUP_METADATA,
    ...saved,
  });

  // Do not replace an existing recoverable draft with data the reader rejects.
  if (source.length > 2_000_000) throw new Error("Draft is too large to save.");
  parseSavedSetupDraft(source);
  storage.setItem(SAVED_DRAFT_KEY, source);
}
