import assert from "node:assert/strict";
import { test } from "node:test";
import {
  remainingRiskAt,
  remainingRiskCurve,
} from "../src/components/evaluation/timing-curve";

test("remaining-risk curve subtracts cumulative events from the horizon total", () => {
  const cumulative = [
    { timeYears: 0, cumulativeRisk: 0 },
    { timeYears: 2, cumulativeRisk: 0.01 },
    { timeYears: 5, cumulativeRisk: 0.03 },
    { timeYears: 10, cumulativeRisk: 0.04 },
  ];
  const remaining = remainingRiskCurve(cumulative);

  assert.deepEqual(
    remaining.map((point) => point.timeYears),
    [0, 2, 5, 10],
  );
  assert.ok(Math.abs(remaining[0].cumulativeRisk - 0.04) < 1e-15);
  assert.ok(Math.abs(remaining[2].cumulativeRisk - 0.01) < 1e-15);
  assert.equal(remaining[3].cumulativeRisk, 0);
  assert.ok(Math.abs(remainingRiskAt(cumulative, 3) - 0.03) < 1e-15);
  assert.ok(Math.abs(remainingRiskAt(cumulative, 5) - 0.01) < 1e-15);
  assert.equal(remainingRiskAt(cumulative, 10), 0);
});

test("conditional curve starts at its remaining risk at the conditioning time", () => {
  const conditional = [
    { timeYears: 4, cumulativeRisk: 0 },
    { timeYears: 7, cumulativeRisk: 0.02 },
    { timeYears: 10, cumulativeRisk: 0.05 },
  ];

  assert.equal(remainingRiskAt(conditional, 4), 0.05);
  assert.equal(remainingRiskCurve(conditional).at(-1)!.cumulativeRisk, 0);
});
