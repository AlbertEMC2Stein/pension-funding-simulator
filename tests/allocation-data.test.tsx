import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AllocationCard } from "../src/components/evaluation/AllocationCard";
import {
  allocationTimeLimit,
  makeAllocationData,
} from "../src/components/evaluation/allocation-data";
import { makeChartData } from "../src/components/evaluation/RiskWithdrawalChart";
import type { CompatiblePolicyInputs } from "../src/lib/model/analytical/compatible-policy";

const rate = Math.LN2 / 10;
const model: CompatiblePolicyInputs = {
  market: { realRiskFreeRate: rate, rho: 0.01, mertonDirection: [0.5, 0.5] },
  mortality: { tau: 10, p: 2, kappa: rate, lambda: 2 * (2 * rate - 0.01) },
  impoverishmentLevel: 100000,
};
const withdrawal = 300000 * rate;

test("allocation slider ends one day before the endpoint", () => {
  assert.equal(allocationTimeLimit(10), 10 - 1 / 365.25);
  assert.equal(allocationTimeLimit(1 / 730.5), 0);
});

test("allocation spans the moving risky interval and includes the risk-free fraction", () => {
  const initial = makeAllocationData(model, withdrawal, 0);
  const later = makeAllocationData(model, withdrawal, 5);

  assert.ok(Math.abs(initial.safeLevel - 200000) < 1e-8);
  assert.ok(later.safeLevel < initial.safeLevel);
  assert.ok(initial.wealth[0] > model.impoverishmentLevel);
  assert.equal(initial.wealth.at(-1), initial.safeLevel);
  assert.ok(Math.abs(initial.riskyFractions[0][0] - 0.5) < 1e-6);
  assert.equal(initial.riskyFractions[0].at(-1), 0);
  assert.equal(initial.riskFreeFractions.at(-1), 1);
  assert.throws(() => makeAllocationData(model, withdrawal, 10), /endpoint/);
});

test("allocation retains borrowing and short positions rather than clipping them", () => {
  const leveraged = {
    ...model,
    market: { ...model.market, mertonDirection: [-1, 3] },
  };
  const data = makeAllocationData(leveraged, withdrawal, 0);

  assert.ok(data.riskyFractions[0][0] < 0);
  assert.ok(data.riskFreeFractions[0] < 0);
});

test("projected allocation remains unavailable until the projected policy exists", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const html = renderToStaticMarkup(
    <AllocationCard
      result={{ model, data }}
      projected
      assetNames={["One", "Two"]}
    />,
  );

  assert.match(html, /projected allocation is not implemented/);
  assert.match(html, /disabled/);
});

test("allocation identifies starting capital at retirement", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const html = renderToStaticMarkup(
    <AllocationCard
      result={{ model, data }}
      projected={false}
      assetNames={["One", "Two"]}
    />,
  );

  assert.match(html, /Starting capital \(t = 0\)/);
});
