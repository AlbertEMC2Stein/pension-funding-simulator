import assert from "node:assert/strict";
import { test } from "node:test";
import { safeBoundary } from "../src/lib/model/analytical/safe-boundary";
import { safeWithdrawal } from "../src/lib/model/analytical/safe-withdrawal";
import { fitCompatibleCe } from "../src/lib/mortality/mortality-fitting";
import { compactifiedExponentialSurvival } from "../src/lib/mortality/mortality-models";
import {
  compatibleGlobalFeasibility,
  compatiblePortfolio,
  compatibleRequiredCapital,
  compatibleRisk,
  compatibleWithdrawal,
  type CompatiblePolicyInputs,
} from "../src/lib/model/analytical/compatible-policy";

const r = Math.LN2 / 10;
const model: CompatiblePolicyInputs = {
  market: { realRiskFreeRate: r, rho: 0.01, mertonDirection: [0.5, 0.5] },
  mortality: { tau: 10, p: 2, kappa: r, lambda: 2 * (2 * r - 0.01) },
  impoverishmentLevel: 100000,
};

test("risk-free withdrawal inverts the safe boundary at finite and infinite endpoints", () => {
  for (const endpoint of [10, Infinity]) {
    const annualWithdrawal = safeWithdrawal({
      realRiskFreeRate: r,
      initialCapital: 150000,
      impoverishmentLevel: 100000,
      mortalityEndpoint: endpoint,
    });
    const boundary = safeBoundary({
      realRiskFreeRate: r,
      annualWithdrawal,
      impoverishmentLevel: 100000,
      time: 0,
      mortalityEndpoint: endpoint,
    });
    assert.ok(Math.abs(boundary - 150000) < 1e-8);
  }
  assert.ok(
    Math.abs(
      safeWithdrawal({
        realRiskFreeRate: r,
        initialCapital: 150000,
        impoverishmentLevel: 100000,
        mortalityEndpoint: 10,
      }) -
        200000 * r,
    ) < 1e-9,
  );
  assert.throws(
    () =>
      safeWithdrawal({
        realRiskFreeRate: 0,
        initialCapital: 150000,
        impoverishmentLevel: 100000,
        mortalityEndpoint: 10,
      }),
    RangeError,
  );
});

test("compatible risk, target withdrawal and feedback match a hand-computable case", () => {
  const withdrawal = compatibleWithdrawal(model, 150000, 0.25);
  assert.ok(Math.abs(withdrawal - 300000 * r) < 1e-9);
  assert.ok(Math.abs(compatibleRisk(model, 150000, withdrawal) - 0.25) < 1e-12);
  assert.ok(
    Math.abs(compatibleRequiredCapital(model, withdrawal, 0.25) - 150000) <
      1e-8,
  );
  for (const component of compatiblePortfolio(model, withdrawal, 0, 150000))
    assert.ok(Math.abs(component - 1 / 6) < 1e-12);
  assert.deepEqual(compatiblePortfolio(model, withdrawal, 0, 100000), [0, 0]);
  assert.deepEqual(compatiblePortfolio(model, withdrawal, 0, 200001), [0, 0]);
  assert.equal(compatibleRisk(model, 200001, withdrawal), 0);
});

test("global simplex diagnostic distinguishes boundary, borrowing and negative components", () => {
  const withdrawal = compatibleWithdrawal(model, 150000, 0.25);
  const boundary = compatibleGlobalFeasibility(model, withdrawal);
  assert.equal(boundary.reason, "feasible");
  assert.ok(Math.abs(boundary.relativeBandwidthExcess! - 1) < 1e-12);
  assert.equal(
    compatibleGlobalFeasibility(
      { ...model, market: { ...model.market, mertonDirection: [1, 1] } },
      withdrawal,
    ).reason,
    "borrowing",
  );
  assert.deepEqual(
    compatibleGlobalFeasibility(
      { ...model, market: { ...model.market, mertonDirection: [-0.1, 1] } },
      withdrawal,
    ),
    {
      feasible: false,
      reason: "negative-merton-component",
      relativeBandwidthExcess: null,
    },
  );
});

test("rejects incompatible mortality, invalid state and out-of-domain target", () => {
  const withdrawal = compatibleWithdrawal(model, 150000, 0.25);
  assert.throws(
    () =>
      compatibleWithdrawal(
        { ...model, mortality: { ...model.mortality, lambda: 1 } },
        150000,
        0.25,
      ),
    /not compatible/,
  );
  assert.throws(
    () =>
      compatibleWithdrawal(
        { ...model, market: { ...model.market, rho: 0 } },
        150000,
        0.25,
      ),
    /positive/,
  );
  assert.throws(() => compatibleWithdrawal(model, 150000, 1), /Target risk/);
  assert.throws(
    () => compatibleRisk(model, 100000, withdrawal),
    /Initial capital/,
  );
  assert.throws(
    () => compatiblePortfolio(model, withdrawal, 10, 150000),
    /endpoint/,
  );
});

test("accepts a compatible CE fit and detects a changed market", () => {
  const times = Array.from({ length: 9 }, (_, i) => i);
  const target = times.map((t) =>
    compactifiedExponentialSurvival(t, model.mortality),
  );
  const fit = fitCompatibleCe(times, target, r, model.market.rho);
  const fittedModel = { ...model, mortality: fit.parameters };
  const withdrawal = compatibleWithdrawal(fittedModel, 150000, 0.1);
  assert.ok(
    Math.abs(compatibleRisk(fittedModel, 150000, withdrawal) - 0.1) < 1e-12,
  );
  assert.throws(
    () =>
      compatibleRisk(
        { ...fittedModel, market: { ...model.market, rho: 0.02 } },
        150000,
        withdrawal,
      ),
    /compatib/,
  );
});
