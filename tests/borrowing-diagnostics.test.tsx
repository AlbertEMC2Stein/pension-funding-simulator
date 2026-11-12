import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateBorrowingDiagnostics } from "../src/components/evaluation/borrowing-diagnostics";
import { evaluateGlobalFeasibility } from "../src/components/evaluation/global-feasibility";
import { makeChartData } from "../src/components/evaluation/RiskWithdrawalChart";
import { safeBoundaryValue } from "../src/lib/model/analytical/safe-boundary";
import type { CompatiblePolicyInputs } from "../src/lib/model/analytical/compatible-policy";

const rate = Math.LN2 / 10;
const model: CompatiblePolicyInputs = {
  market: { realRiskFreeRate: rate, rho: 0.01, mertonDirection: [0, 1] },
  mortality: { tau: 10, p: 2, kappa: rate, lambda: 2 * (2 * rate - 0.01) },
  impoverishmentLevel: 100000,
};

/** Create a fixed-withdrawal CE relationship for the hand-computable test model. */
function example(initialCapital: number, withdrawal: number) {
  const data = makeChartData(model, initialCapital, {
    mode: "customAmount",
    amount: withdrawal,
  });
  const ce = { model, data };
  return calculateBorrowingDiagnostics(ce, evaluateGlobalFeasibility(ce));
}

test("initial borrowing and last possible time follow the moving boundary", () => {
  const withdrawal = 500000 * rate;
  const result = example(120000, withdrawal);
  assert.ok(result.available);
  assert.equal(result.borrowingAtRetirement, true);
  assert.ok(result.lastPossibleTimeYears !== null);
  assert.ok(
    Math.abs(result.lastPossibleTimeYears - Math.log(1.5) / rate) < 1e-10,
  );
  const safeAtCutoff = safeBoundaryValue({
    realRiskFreeRate: rate,
    annualWithdrawal: withdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    mortalityEndpoint: 10,
    time: result.lastPossibleTimeYears,
  });
  assert.ok(Math.abs(safeAtCutoff / 2 - model.impoverishmentLevel) < 1e-8);
  const aboveBoundary = example(160000, withdrawal);
  assert.ok(aboveBoundary.available);
  assert.equal(aboveBoundary.borrowingAtRetirement, false);
});

test("global feasibility excludes borrowing, and stale or negative inputs remain unavailable", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const ce = { model, data };
  const feasible = calculateBorrowingDiagnostics(
    ce,
    evaluateGlobalFeasibility(ce),
  );
  assert.deepEqual(feasible, {
    available: true,
    borrowingAtRetirement: false,
    lastPossibleTimeYears: null,
  });
  assert.deepEqual(
    calculateBorrowingDiagnostics(
      { message: "Fit needed" },
      { status: "unavailable", message: "Fit needed" },
    ),
    { available: false },
  );
  assert.deepEqual(
    calculateBorrowingDiagnostics(ce, {
      status: "negative-merton",
      message: "Short selling",
    }),
    { available: false },
  );
});

test("cutoff remains accurate near the no-borrowing boundary", () => {
  const zeta = 1 + 1e-8;
  const withdrawal = (100000 * (1 + zeta) - 50000) * 2 * rate;
  const result = example(150000, withdrawal);
  assert.ok(result.available && result.lastPossibleTimeYears !== null);
  const expected =
    Math.log1p(((zeta - 1) / zeta) * Math.expm1(rate * 10)) / rate;
  assert.ok(Math.abs(result.lastPossibleTimeYears - expected) < 1e-12);
});
