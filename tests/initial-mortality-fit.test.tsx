import assert from "node:assert/strict";
import { test } from "node:test";
import { initialMortalityFitAction } from "../src/lib/mortality/initial-fit";

/** The same readiness checks apply to default and recovered setups. */
test("startup fitting waits for recovery and cohort data, and runs once", () => {
  const input = {
    phase: "loading" as const,
    cohortValid: true,
    cohortReady: false,
    marketReady: true,
    workerActive: false,
  };

  assert.equal(initialMortalityFitAction(input), "wait");
  assert.equal(
    initialMortalityFitAction({ ...input, cohortReady: true }),
    "start",
  );
  assert.equal(
    initialMortalityFitAction({
      ...input,
      cohortReady: true,
      workerActive: true,
    }),
    "wait",
  );
  for (const phase of [
    "checking-storage",
    "running",
    "complete",
    "skipped",
    "error",
  ] as const) {
    assert.equal(
      initialMortalityFitAction({ ...input, cohortReady: true, phase }),
      "wait",
    );
  }
});

test("invalid restored inputs stop startup fitting with an actionable reason", () => {
  const input = {
    phase: "loading" as const,
    cohortValid: true,
    cohortReady: false,
    marketReady: true,
    workerActive: false,
  };

  assert.equal(
    initialMortalityFitAction({ ...input, cohortValid: false }),
    "invalid-cohort",
  );
  assert.equal(
    initialMortalityFitAction({ ...input, marketReady: false }),
    "invalid-market",
  );
});
