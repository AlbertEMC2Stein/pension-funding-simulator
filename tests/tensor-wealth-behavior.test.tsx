import assert from "node:assert/strict";
import { test } from "node:test";
import { initializeTensorBackend } from "../src/lib/model/simulation/tensorflow/backend";
import { simulateTensorWealthBatch } from "../src/lib/model/simulation/tensorflow/wealth-batch";
import { simulateWealthPath } from "../src/lib/model/simulation/legacy/wealth-path";

// These parameters give x_safe(0) = 200,000 and x_safe(10) = 100,000.
const rate = Math.LN2 / 10;
const market = {
  realRiskFreeRate: rate,
  rho: 0.01,
  mertonDirection: [0.5, 0.5],
};
const mortality = { tau: 10, p: 2, kappa: rate, lambda: 2 * (2 * rate - 0.01) };
const threshold = 100000;
const withdrawal = 300000 * rate;
// At this scale Float32 resolution is approximately 0.016 EUR; allow for
// rounding across several tensor operations rather than requiring exact equality.
const tolerance = 0.2;

/** Evaluate one batch on the CPU backend using explicitly supplied increments. */
async function evaluate(
  initialCapital: number,
  times: number[],
  increments: number[][],
  pathCount = 1,
) {
  return simulateTensorWealthBatch({
    market,
    mortality,
    annualWithdrawal: withdrawal,
    investor: { initialCapital, impoverishmentLevel: threshold },
    pathCount,
    times,
    increments,
  });
}

/** Compare monetary values allowing for Float32 rounding in TensorFlow. */
function assertEuros(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} differs from ${expected} by ${actual - expected} EUR`,
  );
}

test("TensorFlow matches independently calculated risky and safe one-step values", async () => {
  await initializeTensorBackend(["cpu"]);

  // x_safe(1) follows directly from the finite-endpoint boundary formula.
  const nextBoundary = 300000 - 200000 * Math.exp(-rate * 9);
  const risky = await evaluate(150000, [0, 1], [[0.1, -0.2]]);
  const expectedGap = 50000 * Math.exp(rate - 0.03 + 0.05);
  assertEuros(risky.finalWealth[0], nextBoundary - expectedGap);
  assert.equal(risky.firstGridHit[0], -1);

  // x = 250,000 starts above the boundary and follows the risk-free ODE.
  const safe = await evaluate(250000, [0, 1], [[-2, -2]]);
  assertEuros(safe.finalWealth[0], 300000 - 50000 * Math.exp(rate));
  assert.equal(safe.firstGridHit[0], -1);

  // At the boundary both formulas agree; the implementation chooses risk-free.
  const boundary = await evaluate(200000, [0, 1], [[-2, -2]]);
  assertEuros(boundary.finalWealth[0], nextBoundary);
  assert.equal(boundary.firstGridHit[0], -1);
});

test("TensorFlow freezes only the path with the first observed grid hit", async () => {
  await initializeTensorBackend(["cpu"]);

  const increments = [
    [0, 0, -2, -2],
    [0.03, -0.01, 10, 10],
  ];
  const afterFirst = await evaluate(150000, [0, 1], [increments[0]], 2);
  const afterSecond = await evaluate(150000, [0, 1, 2], increments, 2);

  assert.deepEqual(Array.from(afterFirst.firstGridHit), [-1, 1]);
  assert.deepEqual(Array.from(afterSecond.firstGridHit), [-1, 1]);
  assert.equal(afterSecond.finalWealth[1], afterFirst.finalWealth[1]);
  assert.notEqual(afterSecond.finalWealth[0], afterFirst.finalWealth[0]);
});

test("TensorFlow agrees with reference at each grid time with supplied increments", async () => {
  await initializeTensorBackend(["cpu"]);

  const times = [0, 0.25, 1, 2];
  const increments = [
    [0.02, -0.01],
    [-0.05, 0.03],
    [0.01, 0.04],
  ];
  let index = 0;
  const reference = simulateWealthPath(
    {
      initialStep: {
        market,
        mortality,
        annualWithdrawal: withdrawal,
        investor: {
          impoverishmentLevel: threshold,
          current: { time: 0, wealth: 150000 },
        },
      },
      times,
      recordTrajectory: true,
    },
    () => increments[index++],
  );

  assert.equal(reference.status, "completed");
  for (let end = 1; end < times.length; end += 1) {
    const result = await evaluate(
      150000,
      times.slice(0, end + 1),
      increments.slice(0, end),
    );
    assertEuros(result.finalWealth[0], reference.trajectory![end].wealth);
    assert.equal(result.firstGridHit[0], -1);
  }
});

test("TensorFlow handles the mortality endpoint for risky and safe starting wealth", async () => {
  await initializeTensorBackend(["cpu"]);

  // At T the safe boundary equals x_imp. The gap update is evaluated at the
  // endpoint; this does not determine the earlier continuous hit time.
  const risky = await evaluate(150000, [0, 10], [[0, 0]]);
  const endpointGap = 50000 * Math.exp((rate - 0.03) * 10);
  assertEuros(risky.finalWealth[0], threshold - endpointGap);
  assert.equal(risky.firstGridHit[0], 1);

  const safe = await evaluate(250000, [0, 10], [[0, 0]]);
  assertEuros(safe.finalWealth[0], 200000);
  assert.equal(safe.firstGridHit[0], -1);
});
