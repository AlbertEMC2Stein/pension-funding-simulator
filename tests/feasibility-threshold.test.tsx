import assert from "node:assert/strict";
import { test } from "node:test";
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
  assert.ok(Math.abs(result.amount - 100000) < 1e-5);

  const updated = { ...model, impoverishmentLevel: result.amount };
  const withdrawal = compatibleWithdrawal(updated, 150000, 0.25);
  const diagnostic = compatibleGlobalFeasibility(updated, withdrawal);
  assert.equal(diagnostic.reason, "feasible");
  assert.ok(Math.abs(diagnostic.relativeBandwidthExcess! - 1) < 1e-8);
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
  assert.ok(Math.abs(result.amount - 100000) < 1e-5);

  const diagnostic = compatibleGlobalFeasibility(
    { ...model, impoverishmentLevel: result.amount },
    withdrawal,
  );
  assert.equal(diagnostic.reason, "feasible");
  assert.ok(Math.abs(diagnostic.relativeBandwidthExcess! - 1) < 1e-8);
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
  assert.match(unsupported.message, /Required level: approximately €0\.73/);
  assert.ok("message" in findFeasibilityThreshold({ message: "Fit needed" }));
});
