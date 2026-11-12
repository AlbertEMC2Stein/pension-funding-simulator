import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareConditionalImpoverishmentForecast } from "../src/lib/model/simulation/conditional-impoverishment-forecast";
import {
  calculateImpoverishmentForecast,
  type ForecastMortality,
} from "../src/lib/model/simulation/impoverishment-forecast";
import { gompertzMakehamSurvival } from "../src/lib/mortality/mortality-models";

const gm = { alpha: 0.01, beta: 0.1, lambda: 0.02 };
const ce = { tau: 10, p: 2, kappa: 0.05, lambda: 0.1 };

test("conditional curve includes only later hits and normalizes by the eligible group", () => {
  const hits = new Float32Array([1, 2, 2, 4, -1, -1]);
  const original = Array.from(hits);
  const prepared = prepareConditionalImpoverishmentForecast({
    firstHitTimes: hits,
    horizonYears: 8,
    mortality: { model: "gm", parameters: gm },
  });
  const result = prepared.atTime(2);
  assert.ok(result.available);

  assert.equal(result.eligiblePaths, 3);
  assert.deepEqual(
    result.points.map((point) => point.timeYears),
    [2, 4, 8],
  );
  const expected =
    gompertzMakehamSurvival(4, gm) / (3 * gompertzMakehamSurvival(2, gm));
  assert.ok(Math.abs(result.points[1].cumulativeRisk - expected) < 1e-15);
  assert.equal(
    result.points[2].cumulativeRisk,
    result.points[1].cumulativeRisk,
  );
  assert.deepEqual(Array.from(hits), original);

  const later = prepared.atTime(5);
  assert.ok(later.available);
  assert.equal(later.eligiblePaths, 2);
  assert.equal(later.points.at(-1)!.cumulativeRisk, 0);
});

test("update at retirement matches the unconditional forecast when all paths begin solvent", () => {
  const hits = [-1, 0.5, 4, 4, 9, -1];
  const laws: ForecastMortality[] = [
    { model: "gm", parameters: gm },
    { model: "ce", parameters: ce },
  ];

  for (const mortality of laws) {
    const input = { firstHitTimes: hits, horizonYears: 10, mortality };
    const forecast = calculateImpoverishmentForecast(input);
    const conditional =
      prepareConditionalImpoverishmentForecast(input).atTime(0);
    assert.ok(conditional.available);
    assert.equal(conditional.eligiblePaths, hits.length);
    assert.equal(conditional.points.length, forecast.points.length);
    conditional.points.forEach((point, index) => {
      assert.equal(point.timeYears, forecast.points[index].timeYears);
      assert.ok(
        Math.abs(point.cumulativeRisk - forecast.points[index].cumulativeRisk) <
          1e-15,
      );
    });
  }
});

test("conditional update reports unsupported times and empty conditioning events", () => {
  const prepared = prepareConditionalImpoverishmentForecast({
    firstHitTimes: [1, 2],
    horizonYears: 5,
    mortality: { model: "gm", parameters: gm },
  });
  assert.deepEqual(prepared.atTime(-1), {
    available: false,
    reason: "outside-horizon",
  });
  assert.deepEqual(prepared.atTime(5), {
    available: false,
    reason: "outside-horizon",
  });
  assert.deepEqual(prepared.atTime(NaN), {
    available: false,
    reason: "outside-horizon",
  });
  assert.deepEqual(prepared.atTime(2), {
    available: false,
    reason: "no-eligible-paths",
  });

  const noSurvival = prepareConditionalImpoverishmentForecast({
    firstHitTimes: [-1],
    horizonYears: 12,
    mortality: { model: "ce", parameters: ce },
  });
  assert.deepEqual(noSurvival.atTime(10), {
    available: false,
    reason: "no-mortality-survival",
  });
});

test("roundoff of the recorded horizon hit is plotted at the horizon", () => {
  const horizon = 0.1;
  const hits = new Float32Array([horizon, -1]);
  const result = prepareConditionalImpoverishmentForecast({
    firstHitTimes: hits,
    horizonYears: horizon,
    mortality: { model: "gm", parameters: gm },
  }).atTime(0.05);
  assert.ok(result.available);
  assert.equal(result.points.at(-1)!.timeYears, horizon);
  assert.ok(
    Math.abs(
      result.points.at(-1)!.cumulativeRisk -
        gompertzMakehamSurvival(hits[0], gm) /
          (2 * gompertzMakehamSurvival(0.05, gm)),
    ) < 1e-15,
  );
});
