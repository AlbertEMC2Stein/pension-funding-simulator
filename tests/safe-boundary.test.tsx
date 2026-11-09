import assert from "node:assert/strict";
import { test } from "node:test";
import {
  safeBoundary,
  type SafeBoundaryInputs,
} from "../src/lib/model/analytical/safe-boundary";

const rate = Math.LN2 / 10;
const input: SafeBoundaryInputs = {
  realRiskFreeRate: rate,
  annualWithdrawal: rate * 300000,
  impoverishmentLevel: 100000,
  time: 0,
  mortalityEndpoint: 10,
};

test("safe boundary matches hand-computable finite and infinite horizons", () => {
  assert.ok(Math.abs(safeBoundary(input) - 200000) < 1e-9);
  assert.ok(
    Math.abs(
      safeBoundary({ ...input, time: 5 }) - (300000 - 200000 / Math.sqrt(2)),
    ) < 1e-9,
  );
  assert.equal(safeBoundary({ ...input, time: 10 }), 100000);
  assert.ok(
    Math.abs(safeBoundary({ ...input, mortalityEndpoint: Infinity }) - 300000) <
      1e-9,
  );
});

test("the boundary decreases towards the threshold and tends to the infinite-horizon value", () => {
  const values = [0, 2, 5, 9, 10].map((time) =>
    safeBoundary({ ...input, time }),
  );
  assert.ok(values.every((value, i) => i === 0 || value < values[i - 1]));
  assert.ok(
    Math.abs(safeBoundary({ ...input, mortalityEndpoint: 10000 }) - 300000) <
      1e-9,
  );
});

test("short horizons and very small rates avoid cancellation and overflow", () => {
  const value = safeBoundary({
    realRiskFreeRate: 1e-320,
    annualWithdrawal: 1000,
    impoverishmentLevel: 100,
    time: 0,
    mortalityEndpoint: 1,
  });
  assert.ok(Math.abs(value - 1100) < 1e-10);
});

test("invalid values and cases outside the lemma's standing regime are rejected", () => {
  for (const change of [
    { realRiskFreeRate: 0 },
    { realRiskFreeRate: NaN },
    { impoverishmentLevel: 0 },
    { annualWithdrawal: Infinity },
    { annualWithdrawal: rate * input.impoverishmentLevel },
    { annualWithdrawal: 0 },
    { time: -1 },
    { time: Infinity },
    { mortalityEndpoint: 0 },
    { mortalityEndpoint: NaN },
    { time: 11 },
  ])
    assert.throws(() => safeBoundary({ ...input, ...change }), RangeError);
});
