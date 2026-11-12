import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
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
    bridgeDraws: () => ({
      hitThreshold: tf.zeros([pathCount]),
      timeNormal: tf.ones([pathCount]),
      timeUniform: tf.zeros([pathCount]),
    }),
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
  assert.equal(risky.firstHitStep[0], -1);

  // x = 250,000 starts above the boundary and follows the risk-free ODE.
  const safe = await evaluate(250000, [0, 1], [[-2, -2]]);
  assertEuros(safe.finalWealth[0], 300000 - 50000 * Math.exp(rate));
  assert.equal(safe.firstHitStep[0], -1);

  // At the boundary both formulas agree; the implementation chooses risk-free.
  const boundary = await evaluate(200000, [0, 1], [[-2, -2]]);
  assertEuros(boundary.finalWealth[0], nextBoundary);
  assert.equal(boundary.firstHitStep[0], -1);
});

test("TensorFlow freezes only the path with the first observed grid hit", async () => {
  await initializeTensorBackend(["cpu"]);

  const increments = [
    [0, 0, -2, -2],
    [0.03, -0.01, 10, 10],
  ];
  const afterFirst = await evaluate(150000, [0, 1], [increments[0]], 2);
  const afterSecond = await evaluate(150000, [0, 1, 2], increments, 2);

  assert.deepEqual(Array.from(afterFirst.firstHitStep), [-1, 1]);
  assert.deepEqual(Array.from(afterSecond.firstHitStep), [-1, 1]);
  assert.equal(afterSecond.finalWealth[1], afterFirst.finalWealth[1]);
  assert.notEqual(afterSecond.finalWealth[0], afterFirst.finalWealth[0]);
});

test("batch detects an unobserved crossing, records its time and stops at the threshold", async () => {
  await initializeTensorBackend(["cpu"]);
  const base = {
    market,
    mortality,
    annualWithdrawal: withdrawal,
    investor: { initialCapital: 150000, impoverishmentLevel: threshold },
    pathCount: 1,
    times: [0, 1, 2],
    increments: [
      [0, 0],
      [0, 0],
    ],
  };
  const result = await simulateTensorWealthBatch({
    ...base,
    bridgeDraws: () => ({
      hitThreshold: tf.fill([1], 1e6),
      timeNormal: tf.ones([1]),
      timeUniform: tf.zeros([1]),
    }),
  });

  assert.equal(result.firstHitStep[0], 1);
  assert.ok(result.firstHitTime[0] > 0 && result.firstHitTime[0] < 1);
  assertEuros(result.finalWealth[0], threshold);
});

test("batch uses twice rho for the bridge log-gap variance", async () => {
  await initializeTensorBackend(["cpu"]);
  const safeNext = 300000 - 200000 * Math.exp(-rate * 9);
  const gapNext = 50000 * Math.exp(rate - 0.03);
  const d0 = Math.log(2);
  const d1 = Math.log((safeNext - threshold) / gapNext);
  // This threshold lies between the crossing tests for 2ρ and ρ.
  const hitThreshold = (3 * d0 * d1) / (2 * market.rho);
  const result = await simulateTensorWealthBatch({
    market,
    mortality,
    annualWithdrawal: withdrawal,
    investor: { initialCapital: 150000, impoverishmentLevel: threshold },
    pathCount: 1,
    times: [0, 1],
    increments: [[0, 0]],
    bridgeDraws: () => ({
      hitThreshold: tf.fill([1], hitThreshold),
      timeNormal: tf.ones([1]),
      timeUniform: tf.zeros([1]),
    }),
  });

  assert.equal(result.firstHitStep[0], 1);
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
    assert.equal(result.firstHitStep[0], -1);
  }
});

test("TensorFlow handles the mortality endpoint for risky and safe starting wealth", async () => {
  await initializeTensorBackend(["cpu"]);

  // At T the safe boundary equals x_imp. The gap update is evaluated at the
  // endpoint; this does not determine the earlier continuous hit time.
  const risky = await evaluate(150000, [0, 10], [[0, 0]]);
  assertEuros(risky.finalWealth[0], threshold);
  assert.equal(risky.firstHitStep[0], 1);
  assert.ok(risky.firstHitTime[0] >= 0 && risky.firstHitTime[0] <= 10);

  const safe = await evaluate(250000, [0, 10], [[0, 0]]);
  assertEuros(safe.finalWealth[0], 200000);
  assert.equal(safe.firstHitStep[0], -1);
});

test("trajectory recording retains only selected grid points without changing the simulation", async () => {
  await initializeTensorBackend(["cpu"]);
  const before = tf.memory().numTensors;
  const input = {
    market,
    mortality,
    annualWithdrawal: withdrawal,
    investor: { initialCapital: 150000, impoverishmentLevel: threshold },
    pathCount: 2,
    times: [0, 1, 2, 3, 4],
    increments: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    bridgeDraws: () => ({
      hitThreshold: tf.zeros([2]) as tf.Tensor1D,
      timeNormal: tf.ones([2]) as tf.Tensor1D,
      timeUniform: tf.zeros([2]) as tf.Tensor1D,
    }),
  };
  const full = await simulateTensorWealthBatch({
    ...input,
    trajectoryCount: 2,
  });
  const reduced = await simulateTensorWealthBatch({
    ...input,
    trajectoryCount: 2,
    trajectoryStride: 3,
  });
  assert.ok(full.trajectories && reduced.trajectories);
  assert.deepEqual(reduced.finalWealth, full.finalWealth);
  assert.deepEqual(reduced.firstHitTime, full.firstHitTime);
  assert.deepEqual(Array.from(reduced.trajectories), [
    ...full.trajectories.slice(0, 2),
    ...full.trajectories.slice(6, 8),
    ...full.trajectories.slice(8, 10),
  ]);
  assert.equal(tf.memory().numTensors, before);
});
