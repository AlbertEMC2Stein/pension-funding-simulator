import assert from "node:assert/strict";
import { test } from "node:test";
import { makeChartData } from "../src/components/evaluation/RiskWithdrawalChart";
import type { CompatiblePolicyInputs } from "../src/lib/model/analytical/compatible-policy";

const rate = Math.LN2 / 10;
const model: CompatiblePolicyInputs = {
  market: { realRiskFreeRate: rate, rho: 0.01, mertonDirection: [0.5, 0.5] },
  mortality: { tau: 10, p: 2, kappa: rate, lambda: 2 * (2 * rate - 0.01) },
  impoverishmentLevel: 100000,
};

test("CE chart uses the selected risk and includes the safe endpoint", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });

  assert.equal(data.selectedRisk, 0.25);
  assert.ok(Math.abs(data.selectedWithdrawal - 300000 * rate) < 1e-8);
  assert.equal(data.risks[0], 0);
  assert.ok(data.risks[1] < data.risks.at(-1)! / 100);
  assert.ok(Math.abs(data.withdrawals[0] - 200000 * rate) < 1e-8);
  assert.ok(data.risks.at(-1)! > data.selectedRisk);
});

test("custom withdrawal marks zero risk below the safe boundary and inverts positive risk", () => {
  const safe = makeChartData(model, 150000, {
    mode: "customAmount",
    amount: 0,
  });
  const risky = makeChartData(model, 150000, {
    mode: "customAmount",
    amount: 300000 * rate,
  });

  assert.equal(safe.selectedRisk, 0);
  assert.equal(safe.selectedWithdrawal, 0);
  assert.ok(Math.abs(risky.selectedRisk - 0.25) < 1e-12);
  assert.ok(risky.risks.at(-1)! > risky.selectedRisk);
});

test("CE chart rejects incompatible market and mortality settings", () => {
  assert.throws(
    () =>
      makeChartData(
        { ...model, mortality: { ...model.mortality, lambda: 1 } },
        150000,
        { mode: "customAmount", amount: 0 },
      ),
    /compatible/,
  );
});
