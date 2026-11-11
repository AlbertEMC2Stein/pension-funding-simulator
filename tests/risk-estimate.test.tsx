import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compactifiedExponentialSurvival,
  gompertzMakehamSurvival,
  prepareCompactifiedExponentialSurvival,
  prepareGompertzMakehamSurvival,
} from "../src/lib/mortality/mortality-models";
import { estimateMortalityRisk } from "../src/lib/model/simulation/risk-estimate";

const gm = { alpha: 0.01, beta: 0.1, lambda: 0.02 };
const ce = { tau: 10, p: 2, kappa: 0.05, lambda: 0.1 };

test("prepared mortality evaluators agree with checked survival functions", () => {
  const gmSurvival = prepareGompertzMakehamSurvival(gm);
  const ceSurvival = prepareCompactifiedExponentialSurvival(ce);

  for (const t of [0, 1, 5, 9.9999, 10, 20]) {
    assert.equal(gmSurvival(t), gompertzMakehamSurvival(t, gm));
    assert.equal(ceSurvival(t), compactifiedExponentialSurvival(t, ce));
  }
});

test("risk estimator averages survival-weighted hits and zero-valued non-hits", () => {
  const times = new Float32Array([-1, 0, 1, 3]);
  const result = estimateMortalityRisk({
    firstHitTimes: times,
    gm,
    ce,
    horizonYears: 3,
    ceBenchmark: 0.5,
  });
  const payoffs = [
    0,
    1,
    gompertzMakehamSurvival(1, gm),
    gompertzMakehamSurvival(3, gm),
  ];
  const expected =
    payoffs.reduce((sum, value) => sum + value, 0) / payoffs.length;
  const variance =
    payoffs.reduce((sum, value) => sum + (value - expected) ** 2, 0) /
    (payoffs.length - 1);

  assert.ok(Math.abs(result.gm.estimate - expected) < 1e-15);
  assert.ok(
    Math.abs(result.gm.standardError! - Math.sqrt(variance / payoffs.length)) <
      1e-15,
  );
  assert.ok(result.gm.interval95);
  assert.ok(result.gm.interval95.lower >= 0 && result.gm.interval95.upper <= 1);
  assert.equal(result.horizonYears, 3);
  assert.equal(result.ceEndpoint, 10);
  assert.equal(result.ceBenchmark, 0.5);
});

test("zero variation and one-path samples do not produce misleading normal intervals", () => {
  const none = estimateMortalityRisk({
    firstHitTimes: [-1, -1, -1],
    gm,
    ce,
    horizonYears: 2,
    ceBenchmark: 0.5,
  });
  const one = estimateMortalityRisk({
    firstHitTimes: [1],
    gm,
    ce,
    horizonYears: 2,
    ceBenchmark: 0.5,
  });

  assert.equal(none.gm.estimate, 0);
  assert.equal(none.gm.interval95, null);
  assert.equal(none.ce.interval95, null);
  assert.equal(one.gm.standardError, null);
  assert.equal(one.gm.interval95, null);
});
