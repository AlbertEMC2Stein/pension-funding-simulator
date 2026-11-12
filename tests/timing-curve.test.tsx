import assert from "node:assert/strict";
import { test } from "node:test";
import {
  forecastYAxisRange,
  includeSelectedRiskPoint,
  remainingRiskAt,
  remainingRiskCurve,
  simplifyRemainingRiskCurve,
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

test("display simplification bounds error and retains endpoints and selected value", () => {
  const count = 100_000;
  const cumulative = Array.from({ length: count + 1 }, (_, index) => ({
    timeYears: index / 1000,
    cumulativeRisk: (0.0476 * index) / count,
  }));
  const simplified = simplifyRemainingRiskCurve(cumulative);
  const tolerance = 0.0476 / 1000;
  let retainedIndex = 0;

  assert.ok(simplified.length <= 1002);
  assert.equal(simplified[0].timeYears, 0);
  assert.equal(simplified.at(-1)!.timeYears, 100);
  assert.equal(simplified.at(-1)!.cumulativeRisk, 0);

  for (const point of cumulative) {
    while (
      retainedIndex + 1 < simplified.length &&
      simplified[retainedIndex + 1].timeYears <= point.timeYears
    )
      retainedIndex += 1;
    const exact = 0.0476 - point.cumulativeRisk;
    assert.ok(
      Math.abs(simplified[retainedIndex].cumulativeRisk - exact) <=
        tolerance + 1e-12,
    );
  }

  const selectedTime = 12.3456;
  const withSelected = includeSelectedRiskPoint(
    simplified,
    cumulative,
    selectedTime,
  );
  const selected = withSelected.find(
    (point) => point.timeYears === selectedTime,
  );
  assert.ok(selected);
  assert.equal(
    selected.cumulativeRisk,
    remainingRiskAt(cumulative, selectedTime),
  );
  assert.equal(
    simplified.some((point) => point.timeYears === selectedTime),
    false,
  );
});

test("constant curves are reduced to endpoints and preserve an existing selected knot", () => {
  const cumulative = Array.from({ length: 100 }, (_, index) => ({
    timeYears: index,
    cumulativeRisk: 0,
  }));
  const simplified = simplifyRemainingRiskCurve(cumulative);
  assert.equal(simplified.length, 2);
  const withSelected = includeSelectedRiskPoint(simplified, cumulative, 0);
  assert.equal(withSelected.length, 2);
  assert.equal(withSelected[0].timeYears, 0);
});

test("forecast y range pads the full series and any visible approximation", () => {
  assert.deepEqual(forecastYAxisRange([0.05, 0.02]), [0, 0.05 * 1.1]);
  assert.deepEqual(forecastYAxisRange([0.05], [0.08, 0.03]), [0, 0.08 * 1.1]);
  assert.deepEqual(forecastYAxisRange([0, 0]), [0, 0.001]);
});
