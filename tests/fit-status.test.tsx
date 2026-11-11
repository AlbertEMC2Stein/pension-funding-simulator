import assert from "node:assert/strict";
import { test } from "node:test";
import { ceFitStatus, mortalityFitKeys } from "../src/lib/mortality/fit-status";

test("CE fit status follows the captured inputs and current usable settings", () => {
  assert.equal(ceFitStatus(null, "current"), "not-fitted");
  assert.equal(ceFitStatus("a", "a"), "current");
  assert.equal(ceFitStatus("a", "b"), "needs-update");
  assert.equal(ceFitStatus("a", null), "needs-update");
  assert.equal(ceFitStatus("b", "b"), "current");
});

test("fit keys follow the cohort and market dependencies of each model", () => {
  const input = {
    birthYear: "1960",
    retirementYear: "2027",
    mortality: "female" as const,
    longevity: "medium" as const,
    maleWeight: 0,
    market: { realRiskFreeRate: 0.01, rho: 0.1 },
  };
  const original = mortalityFitKeys(input);
  const changedMarket = mortalityFitKeys({
    ...input,
    market: { ...input.market, rho: 0.2 },
  });
  const changedCohort = mortalityFitKeys({ ...input, birthYear: "1961" });

  assert.equal(changedMarket.gm, original.gm);
  assert.notEqual(changedMarket.ce, original.ce);
  assert.notEqual(changedCohort.gm, original.gm);
  assert.notEqual(changedCohort.ce, original.ce);
  assert.equal(mortalityFitKeys({ ...input, maleWeight: 0.5 }).gm, original.gm);
  assert.notEqual(
    mortalityFitKeys({ ...input, mortality: "custom", maleWeight: 0 }).gm,
    mortalityFitKeys({ ...input, mortality: "custom", maleWeight: 0.5 }).gm,
  );
  assert.equal(mortalityFitKeys({ ...input, market: null }).ce, null);
});
