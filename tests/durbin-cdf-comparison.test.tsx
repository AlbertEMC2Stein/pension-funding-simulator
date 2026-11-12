import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareDurbinApproximation } from "../src/lib/model/analytical/durbin-approximation";
import { compareDurbinConditionalCdf } from "../src/lib/model/analytical/durbin-cdf-comparison";
import { compactifiedExponentialSurvival } from "../src/lib/mortality/mortality-models";

const r = Math.LN2 / 10;
const ce = { tau: 10, p: 2, kappa: r, lambda: 2 * (2 * r - 0.01) };
const gm = { alpha: 0.01, beta: 0.1, lambda: 0.02 };
/** Construct the first-term approximation for the compatible CE benchmark. */
function approximation() {
  return prepareDurbinApproximation({
    realRiskFreeRate: r,
    rho: 0.01,
    ce,
    gm,
    ceRisk: 0.25,
    horizonYears: ce.tau,
  });
}

test("CE conditional CDF is normalized at the endpoints", () => {
  const result = approximation();
  assert.equal(result.ceConditionalCdf(0), 0);
  assert.equal(result.ceConditionalCdf(ce.tau), 1);
  const midpoint = result.ceConditionalCdf(5);
  assert.ok(midpoint !== null && midpoint > 0 && midpoint < 1);
});

test("sup comparison checks both sides of each weighted empirical jump", () => {
  const model = approximation();
  const times = new Float32Array([4, -1, 1, 1, 10]);
  const original = Array.from(times);
  const result = compareDurbinConditionalCdf({
    firstHitTimes: times,
    ce,
    horizonYears: 10,
    approximation: model,
  });
  assert.ok(result.available);
  const weight1 = compactifiedExponentialSurvival(1, ce);
  const weight4 = compactifiedExponentialSurvival(4, ce);
  const at1 = model.ceConditionalCdf(1)!;
  const at4 = model.ceConditionalCdf(4)!;
  const after1 = (2 * weight1) / (2 * weight1 + weight4);
  const expected = Math.max(
    at1,
    Math.abs(after1 - at1),
    Math.abs(after1 - at4),
    1 - at4,
  );

  assert.ok(Math.abs(result.supDistance - expected) < 1e-14);
  assert.equal(result.weightedHits, 3);
  assert.deepEqual(Array.from(times), original);
});

test("comparison is unavailable for truncated horizons or without positive event mass", () => {
  const model = approximation();
  assert.deepEqual(
    compareDurbinConditionalCdf({
      firstHitTimes: [1, -1],
      ce,
      horizonYears: 5,
      approximation: model,
    }),
    { available: false, reason: "truncated-horizon" },
  );
  assert.deepEqual(
    compareDurbinConditionalCdf({
      firstHitTimes: [-1, 10],
      ce,
      horizonYears: 10,
      approximation: model,
    }),
    { available: false, reason: "no-weighted-hits" },
  );
  const zero = prepareDurbinApproximation({
    realRiskFreeRate: r,
    rho: 0.01,
    ce,
    gm,
    ceRisk: 0,
    horizonYears: 10,
  });
  assert.equal(zero.ceConditionalCdf(5), null);
  assert.deepEqual(
    compareDurbinConditionalCdf({
      firstHitTimes: [-1],
      ce,
      horizonYears: 10,
      approximation: zero,
    }),
    { available: false, reason: "no-durbin-mass" },
  );
});
