import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compactifiedExponentialSurvival,
  gompertzMakehamQuantile,
  gompertzMakehamSurvival,
} from "../src/lib/mortality-models";

const gm = { alpha: 0.00570616, beta: 0.130797, lambda: 0.00766238 };

test("GM survival is one at zero and agrees with the analytic hazard", () => {
  assert.equal(gompertzMakehamSurvival(0, gm), 1);
  const t = 12;
  const expected = Math.exp(
    -gm.lambda * t - (gm.alpha / gm.beta) * Math.expm1(gm.beta * t),
  );
  assert.ok(Math.abs(gompertzMakehamSurvival(t, gm) - expected) < 1e-14);
  assert.equal(gompertzMakehamSurvival(1e6, gm), 0);
});

test("GM quantiles invert survival for the research test probabilities", () => {
  const probabilities = [0, 1e-8, 0.5, 0.995, 1 - 5e-5, 1];
  const times = probabilities.map((p) => gompertzMakehamQuantile(p, gm));
  assert.equal(times[0], 0);
  assert.equal(times.at(-1), Infinity);
  for (let i = 1; i < times.length - 1; i += 1) {
    assert.ok(times[i] > times[i - 1]);
    const expected = 1 - probabilities[i];
    assert.ok(
      Math.abs(gompertzMakehamSurvival(times[i], gm) - expected) <
        1e-9 * expected,
    );
  }
});

test("GM quantile handles zero and small Makeham hazard", () => {
  const probability = 1 - 5e-5;
  const pure = { ...gm, lambda: 0 };
  const expected =
    Math.log1p((pure.beta * -Math.log1p(-probability)) / pure.alpha) /
    pure.beta;
  const pureTime = gompertzMakehamQuantile(probability, pure);
  assert.ok(Math.abs(pureTime - expected) < 1e-12);
  assert.ok(
    gompertzMakehamQuantile(probability, { ...gm, lambda: 1e-5 }) < pureTime,
  );
});

test("CE survival matches a hand-computable case and respects its endpoint", () => {
  const ce = { lambda: Math.LN2, p: 1, kappa: Math.LN2, tau: 1 };
  assert.equal(compactifiedExponentialSurvival(0, ce), 1);
  assert.ok(
    Math.abs(compactifiedExponentialSurvival(0.5, ce) - (2 - Math.SQRT2)) <
      1e-14,
  );
  assert.equal(compactifiedExponentialSurvival(1, ce), 0);
  assert.equal(compactifiedExponentialSurvival(2, ce), 0);
  const grid = Array.from({ length: 101 }, (_, i) =>
    compactifiedExponentialSurvival(i / 100, ce),
  );
  assert.ok(
    grid.every(
      (value, i) =>
        value >= 0 && value <= 1 && (i === 0 || value <= grid[i - 1]),
    ),
  );
});

test("survival and quantile functions reject invalid inputs", () => {
  assert.throws(() => gompertzMakehamSurvival(-1, gm), RangeError);
  assert.throws(
    () => gompertzMakehamSurvival(1, { ...gm, beta: 0 }),
    RangeError,
  );
  assert.throws(() => gompertzMakehamQuantile(1.1, gm), RangeError);
  assert.throws(() => gompertzMakehamQuantile(NaN, gm), RangeError);
  assert.throws(
    () =>
      compactifiedExponentialSurvival(1, { lambda: 0, p: 1, kappa: 1, tau: 0 }),
    RangeError,
  );
  assert.throws(
    () =>
      compactifiedExponentialSurvival(Infinity, {
        lambda: 0,
        p: 1,
        kappa: 1,
        tau: 5,
      }),
    RangeError,
  );
});
