import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_KEY,
  readDisplayPreferences,
  writeDisplayPreferences,
  type PreferenceStorage,
} from "../src/lib/options/display-preferences";

/** Supply isolated in-memory storage so reloads can be simulated. */
function memoryStorage() {
  const entries = new Map<string, string>();
  const storage: PreferenceStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };

  return { storage, entries };
}

test("theme and language survive a reload independently of the setup", () => {
  const { storage, entries } = memoryStorage();

  assert.deepEqual(
    readDisplayPreferences(storage),
    DEFAULT_DISPLAY_PREFERENCES,
  );
  writeDisplayPreferences(storage, { theme: "dark", language: "de" });
  assert.deepEqual(readDisplayPreferences(storage), {
    theme: "dark",
    language: "de",
  });
  assert.deepEqual([...entries.keys()], [DISPLAY_PREFERENCES_KEY]);
});

test("invalid saved values fall back without overwriting stored data", () => {
  const { storage, entries } = memoryStorage();
  entries.set(DISPLAY_PREFERENCES_KEY, '{"theme":"dark","language":"fr"}');

  assert.deepEqual(readDisplayPreferences(storage), {
    theme: "dark",
    language: "en",
  });
  entries.set(DISPLAY_PREFERENCES_KEY, "{invalid");
  assert.deepEqual(
    readDisplayPreferences(storage),
    DEFAULT_DISPLAY_PREFERENCES,
  );
  assert.equal(entries.get(DISPLAY_PREFERENCES_KEY), "{invalid");
});

test("storage access failures are available to the caller", () => {
  const storage: PreferenceStorage = {
    getItem: () => {
      throw new Error("unavailable");
    },
    setItem: () => {
      throw new Error("unavailable");
    },
  };

  assert.throws(() => readDisplayPreferences(storage), /unavailable/);
  assert.throws(
    () => writeDisplayPreferences(storage, DEFAULT_DISPLAY_PREFERENCES),
    /unavailable/,
  );
});
