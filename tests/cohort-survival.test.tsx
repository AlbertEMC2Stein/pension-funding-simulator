import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  cohortSurvival,
  loadCohort,
  mixCohortSurvival,
  parseCohortCsv,
  CohortRequestError,
  validateCohortYears,
} from "../src/lib/mortality/cohort-survival";

test("cohort year limits include future retirement years within supported ages", () => {
  assert.equal(validateCohortYears("1926", "1926").valid, true);
  assert.equal(validateCohortYears("2026", "2125").valid, true);
  assert.equal(validateCohortYears("2026", "2126").valid, false);
  assert.equal(validateCohortYears("1925", "1990").valid, false);
  assert.equal(validateCohortYears("2027", "2090").valid, false);
  assert.equal(validateCohortYears("1965", "1964").valid, false);
  assert.equal(validateCohortYears("", "2032").valid, false);
});

test("annual cohort survival starts at retirement and ends at age 100", () => {
  const q = Array<number>(100).fill(0.1);
  const curve = cohortSurvival(q, 98);
  assert.deepEqual(
    curve.map((point) => point.age),
    [98, 99, 100],
  );
  assert.equal(curve[0].survival, 1);
  assert.ok(Math.abs(curve[1].survival - 0.9) < 1e-12);
  assert.ok(Math.abs(curve[2].survival - 0.81) < 1e-12);
});

test("custom mix averages survival curves rather than annual probabilities", () => {
  const female = Array<number>(100).fill(0.1);
  const male = Array<number>(100).fill(0.4);
  const curve = mixCohortSurvival(female, male, 98, 0.5);
  assert.ok(Math.abs(curve[2].survival - (0.9 ** 2 + 0.6 ** 2) / 2) < 1e-12);
  assert.notEqual(curve[2].survival, 0.75 ** 2);
  assert.deepEqual(
    mixCohortSurvival(female, male, 98, 0),
    cohortSurvival(female, 98),
  );
  assert.deepEqual(
    mixCohortSurvival(female, male, 98, 1),
    cohortSurvival(male, 98),
  );
});

test("reads a packaged cohort and rejects malformed or missing data", () => {
  const csv = readFileSync(
    new URL(
      "../public/data/mortality/cohort_table_1926_2026_female_medium.csv",
      import.meta.url,
    ),
    "utf8",
  );
  const q = parseCohortCsv(csv, 1965);
  assert.equal(q.length, 100);
  const curve = cohortSurvival(q, 67);
  assert.equal(curve[0].survival, 1);
  assert.ok(
    curve.every(
      (point, i) =>
        point.survival >= 0 &&
        point.survival <= 1 &&
        (i === 0 || point.survival <= curve[i - 1].survival),
    ),
  );
  assert.throws(() => parseCohortCsv(csv, 1900));
  assert.throws(() => parseCohortCsv("birth_year,age_0\n1965,0.1\n", 1965));
  assert.throws(() => cohortSurvival(q, 100));
});

test("loader uses the static-site base path and selected file", async () => {
  const original = globalThis.fetch;
  const csv = readFileSync(
    new URL(
      "../public/data/mortality/cohort_table_1926_2026_female_medium.csv",
      import.meta.url,
    ),
    "utf8",
  );
  try {
    globalThis.fetch = (async (url) => {
      assert.equal(
        url,
        "/repo/data/mortality/cohort_table_1926_2026_female_medium.csv",
      );
      return new Response(csv);
    }) as typeof fetch;
    assert.equal(
      (
        await loadCohort(
          1965,
          "female",
          "medium",
          "/repo",
          new AbortController().signal,
        )
      ).length,
      100,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("cohort loader distinguishes network failures, HTTP errors and cancellation", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();

  try {
    globalThis.fetch = (async () => {
      throw new TypeError("network unavailable");
    }) as typeof fetch;
    await assert.rejects(
      loadCohort(1965, "female", "medium", "", controller.signal),
      (error: unknown) =>
        error instanceof CohortRequestError && error.cause instanceof TypeError,
    );

    globalThis.fetch = (async () =>
      new Response("missing", { status: 404 })) as typeof fetch;
    await assert.rejects(
      loadCohort(1965, "female", "medium", "", controller.signal),
      /404/,
    );

    const abort = new DOMException("Aborted", "AbortError");
    controller.abort();
    globalThis.fetch = (async () => {
      throw abort;
    }) as typeof fetch;
    await assert.rejects(
      loadCohort(1965, "female", "medium", "", controller.signal),
      (error: unknown) => error === abort,
    );
  } finally {
    globalThis.fetch = original;
  }
});
