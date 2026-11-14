import assert from "node:assert/strict";
import { test } from "node:test";
import { initialSimulationDraft } from "../src/lib/options/simulation-options";
import {
  initialSetupTables,
  parseSetupFile,
} from "../src/lib/options/setup-file";
import {
  readSavedDraft,
  SAVED_DRAFT_KEY,
  writeSavedDraft,
  type DraftStorage,
} from "../src/lib/options/saved-draft";
import { mortalityFitNeedsUpdate } from "../src/lib/mortality/automatic-fit";

/** In-memory browser-storage stand-in with observable values. */
function memoryStorage() {
  const entries = new Map<string, string>();
  const storage: DraftStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
  return { storage, entries };
}

test("local drafts preserve unfinished input and table edits without results", () => {
  const { storage, entries } = memoryStorage();
  const draft = initialSimulationDraft();
  const tables = initialSetupTables(draft.investor.impoverishmentLevel);
  draft.market.assets[0].nominalReturnPercent = "-";
  draft.market.correlations[0][1] = "";
  draft.market.correlations[1][0] = "";
  draft.investor.initialCapital = "";
  draft.simulation.seed = "";
  tables.feasibility[0].name = "";
  tables.feasibility[0].value = "";
  const saved = { name: "", draft, tables };

  writeSavedDraft(storage, saved);
  assert.deepEqual(readSavedDraft(storage), saved);
  const stored = entries.get(SAVED_DRAFT_KEY)!;
  assert.doesNotMatch(stored, /mortalityFits|firstHitTimes|evaluationResult/);
  assert.throws(() => parseSetupFile(stored));
});

test("missing, malformed and unavailable storage never modify the existing entry", () => {
  const { storage, entries } = memoryStorage();
  assert.equal(readSavedDraft(storage), null);
  entries.set(SAVED_DRAFT_KEY, "{broken");
  assert.throws(() => readSavedDraft(storage));
  assert.equal(entries.get(SAVED_DRAFT_KEY), "{broken");

  const unavailable: DraftStorage = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("quota");
    },
  };
  const draft = initialSimulationDraft();
  assert.throws(() => readSavedDraft(unavailable), /denied/);
  assert.throws(
    () =>
      writeSavedDraft(unavailable, {
        name: "Example",
        draft,
        tables: initialSetupTables(draft.investor.impoverishmentLevel),
      }),
    /quota/,
  );
});

test("automatic mortality fitting waits for browser recovery", () => {
  const state = {
    storageRestored: false,
    cohortValid: true,
    cohortReady: true,
    gmKey: "cohort",
    ceKey: "cohort/market",
    fittedGmKey: null,
    fittedCeKey: null,
    retry: false,
  };

  assert.equal(mortalityFitNeedsUpdate(state), false);
  assert.equal(
    mortalityFitNeedsUpdate({ ...state, storageRestored: true }),
    true,
  );
});
