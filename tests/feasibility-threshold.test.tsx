import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAmount } from "../src/lib/options/simulation-options";
import { makeChartData } from "../src/components/evaluation/RiskWithdrawalChart";
import { findFeasibilityThreshold } from "../src/components/evaluation/feasibility-threshold";
import {
  compatibleGlobalFeasibility,
  compatibleWithdrawal,
  type CompatiblePolicyInputs,
} from "../src/lib/model/analytical/compatible-policy";

const rate = Math.LN2 / 10;
const model: CompatiblePolicyInputs = {
  market: { realRiskFreeRate: rate, rho: 0.01, mertonDirection: [0, 1] },
  mortality: { tau: 10, p: 2, kappa: rate, lambda: 2 * (2 * rate - 0.01) },
  impoverishmentLevel: 80000,
};

test("boundary preserves target risk and recomputes the withdrawal", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const result = findFeasibilityThreshold({ data, model });
  assert.ok("amount" in result);
  assert.match(result.value, /^\d{1,3}(?:,\d{3})*\.\d{2}$/);
  assert.ok(Math.abs(result.amount - 100000) <= 0.011);
  assert.equal(parseAmount(result.value), result.amount);
  assert.match(result.value, /,/);

  const updated = { ...model, impoverishmentLevel: result.amount };
  const withdrawal = compatibleWithdrawal(updated, 150000, 0.25);
  const diagnostic = compatibleGlobalFeasibility(updated, withdrawal);
  assert.equal(diagnostic.reason, "feasible");
  assert.ok(Math.abs(diagnostic.relativeBandwidthExcess! - 1) < 1e-6);
  assert.notEqual(withdrawal, data.selectedWithdrawal);
});

test("boundary preserves a custom withdrawal", () => {
  const withdrawal = 300000 * rate;
  const data = makeChartData(model, 150000, {
    mode: "customAmount",
    amount: withdrawal,
  });
  const result = findFeasibilityThreshold({ data, model });
  assert.ok("amount" in result);
  assert.match(result.value, /^\d{1,3}(?:,\d{3})*\.\d{2}$/);
  assert.ok(Math.abs(result.amount - 100000) <= 0.011);

  const diagnostic = compatibleGlobalFeasibility(
    { ...model, impoverishmentLevel: result.amount },
    withdrawal,
  );
  assert.equal(diagnostic.reason, "feasible");
  assert.ok(Math.abs(diagnostic.relativeBandwidthExcess! - 1) < 1e-6);
});

test("non-cent boundary is rounded upward while keeping the strategy feasible", () => {
  const risk = 0.24;
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk });
  const result = findFeasibilityThreshold({ data, model });
  assert.ok("amount" in result);

  const exact = 150000 / (2 - Math.sqrt(risk));
  assert.ok(result.amount >= exact && result.amount - exact < 0.010001);
  assert.match(result.value, /^\d{1,3}(?:,\d{3})*\.\d{2}$/);
  const updated = { ...model, impoverishmentLevel: result.amount };
  const withdrawal = compatibleWithdrawal(updated, 150000, risk);
  assert.equal(
    compatibleGlobalFeasibility(updated, withdrawal).reason,
    "feasible",
  );
});

test("boundary is unavailable for negative Merton components and insufficient capital", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const negative = {
    ...model,
    market: { ...model.market, mertonDirection: [-0.1, 1] },
  };
  assert.ok("message" in findFeasibilityThreshold({ data, model: negative }));

  const small = { ...model, impoverishmentLevel: 1 };
  const smallData = makeChartData(small, 1.1, {
    mode: "targetRisk",
    risk: 0.25,
  });
  const unsupported = findFeasibilityThreshold({
    data: smallData,
    model: small,
  });
  assert.ok("message" in unsupported);
  assert.match(unsupported.message, /Required level:.*€0\.73/);
  assert.ok("message" in findFeasibilityThreshold({ message: "Fit needed" }));
});
