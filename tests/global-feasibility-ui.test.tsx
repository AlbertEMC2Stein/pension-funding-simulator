import assert from "node:assert/strict";
import { test } from "node:test";
import { makeChartData } from "../src/components/evaluation/RiskWithdrawalChart";
import { evaluateGlobalFeasibility } from "../src/components/evaluation/global-feasibility";
import type { CompatiblePolicyInputs } from "../src/lib/model/analytical/compatible-policy";

const rate = Math.LN2 / 10;
const model: CompatiblePolicyInputs = {
  market: { realRiskFreeRate: rate, rho: 0.01, mertonDirection: [0, 1] },
  mortality: { tau: 10, p: 2, kappa: rate, lambda: 2 * (2 * rate - 0.01) },
  impoverishmentLevel: 100000,
};

test("global diagnostic accepts zero Merton components when another is positive", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const result = evaluateGlobalFeasibility({ model, data });

  assert.equal(result.status, "feasible");
  if ("zeta" in result) assert.ok(Math.abs(result.zeta - 1) < 1e-12);
});

test("global diagnostic separates short-selling and borrowing possibilities", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const negative = {
    ...model,
    market: { ...model.market, mertonDirection: [-0.1, 1] },
  };
  const borrowing = {
    ...model,
    market: { ...model.market, mertonDirection: [1, 1] },
  };

  assert.equal(
    evaluateGlobalFeasibility({ model: negative, data }).status,
    "negative-merton",
  );
  assert.equal(
    evaluateGlobalFeasibility({ model: borrowing, data }).status,
    "borrowing",
  );
  assert.equal(
    evaluateGlobalFeasibility({ message: "Fit needed" }).status,
    "unavailable",
  );
});

test("global diagnostic rejects an all-zero Merton vector", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const zero = {
    ...model,
    market: { ...model.market, mertonDirection: [0, 0] },
  };

  assert.equal(
    evaluateGlobalFeasibility({ model: zero, data }).status,
    "unavailable",
  );
});
