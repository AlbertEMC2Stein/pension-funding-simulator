import assert from "node:assert/strict";
import { test } from "node:test";
import { initialSimulationDraft } from "../src/lib/options/simulation-options";
import {
  initialMortalityFitAction,
  isInitialMortalitySetup,
} from "../src/lib/mortality/initial-fit";

test("only unchanged mortality and market inputs qualify for the first-visit fit", () => {
  const draft = initialSimulationDraft();
  assert.equal(isInitialMortalitySetup(draft), true);

  draft.simulation.targetRiskPercent = 10;
  draft.investor.initialCapital = "600,000";
  assert.equal(isInitialMortalitySetup(draft), true);

  draft.investor.maleWeight = 0.7;
  assert.equal(isInitialMortalitySetup(draft), false);
  draft.investor.maleWeight = 0.5;
  draft.market.assets[0].nominalReturnPercent = "7.00";
  assert.equal(isInitialMortalitySetup(draft), false);
});

test("the first-visit fit starts once after data load and never on imported setups", () => {
  const draft = initialSimulationDraft();
  const input = {
    draft,
    phase: "loading" as const,
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
  assert.equal(
    initialMortalityFitAction({
      ...input,
      cohortReady: true,
      phase: "skipped",
    }),
    "wait",
  );
  assert.equal(
    initialMortalityFitAction({
      ...input,
      cohortReady: true,
      phase: "complete",
    }),
    "wait",
  );
  draft.investor.birthYear = "1960";
  assert.equal(
    initialMortalityFitAction({ ...input, cohortReady: true }),
    "skip",
  );
});
