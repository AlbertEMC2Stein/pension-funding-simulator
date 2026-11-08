import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/simulation-options";
import { setCorrelation } from "../src/lib/market-calibration";

test("builds a numerical, independent snapshot from current inputs", () => {
  const draft = initialSimulationDraft();
  draft.market = setCorrelation(draft.market, 1, 0, "0.25");
  draft.investor.mortality = "custom";
  draft.investor.maleWeight = 0.3;
  draft.simulation.paths = 50000;
  const result = buildSimulationOptions(draft);
  assert.ok(result.ok);
  assert.equal(result.options.market.assets[0].nominalReturn, 0.0675);
  assert.equal(result.options.market.nominalRiskFreeRate, 0.025);
  assert.ok(
    Math.abs(result.options.market.realRiskFreeRate - Math.log(1.025 / 1.02)) <
      1e-14,
  );
  assert.equal(result.options.market.assets[0].volatility, 0.145);
  assert.deepEqual(result.options.market.correlation, [
    [1, 0.25],
    [0.25, 1],
  ]);
  assert.equal(result.options.investor.initialCapital, 500000);
  assert.equal(result.options.investor.mortality.maleWeight, 0.3);
  assert.deepEqual(result.options.policy.withdrawal, {
    mode: "targetRisk",
    targetRisk: 0.05,
  });
  assert.equal(result.options.numerical.paths, 50000);
  draft.market.correlations[0][1] = "0";
  assert.equal(result.options.market.correlation[0][1], 0.25);
});

test("custom withdrawal excludes inactive target and uses selected mortality", () => {
  const draft = initialSimulationDraft();
  draft.investor.mortality = "male";
  draft.investor.longevity = "high";
  draft.simulation.withdrawalMode = "customAmount";
  draft.simulation.withdrawalEuros = 42000;
  draft.simulation.projected = true;
  const result = buildSimulationOptions(draft);
  assert.ok(result.ok);
  assert.deepEqual(result.options.policy.withdrawal, {
    mode: "customAmount",
    annualAmount: 42000,
  });
  assert.equal(result.options.investor.mortality.maleWeight, 1);
  assert.equal(result.options.investor.mortality.longevity, "high");
  assert.equal(result.options.policy.projected, true);
});

test("rejects invalid inputs rather than producing a partial snapshot", () => {
  const draft = initialSimulationDraft();
  draft.market.assets[0].volatilityPercent = "";
  draft.investor.birthYear = "1900";
  draft.investor.initialCapital = "1,23";
  const result = buildSimulationOptions(draft);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.length >= 3);
});

test("impoverishment level must be at least one euro and below initial capital", () => {
  const draft = initialSimulationDraft();
  for (const value of ["0", "0.99", "500,000"]) {
    draft.investor.impoverishmentLevel = value;
    assert.equal(buildSimulationOptions(draft).ok, false);
  }
  draft.investor.impoverishmentLevel = "1";
  assert.equal(buildSimulationOptions(draft).ok, true);
});
