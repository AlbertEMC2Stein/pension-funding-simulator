import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { advanceUnconstrainedWealth } from "../src/lib/model/simulation/wealth-step";
import {
  generateTimeGrid,
  simulateWealthPath,
} from "../src/lib/model/simulation/wealth-path";
import {
  covarianceFactor,
  correlatedMarketIncrement,
} from "../src/lib/model/simulation/matrix";
import {
  createRandomStream,
  standardNormalVector,
} from "../src/lib/model/simulation/random";
import { initializeTensorBackend } from "../src/lib/model/simulation/tensorflow/backend";
import { simulateTensorWealthBatch } from "../src/lib/model/simulation/tensorflow/wealth-batch";
import {
  createRunSnapshot,
  type RunConfigurationInput,
} from "../src/lib/model/simulation/run-configuration";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";
import { calibrateMarket } from "../src/lib/market/calibrate-market";

const r = Math.LN2 / 10;
const model = {
  market: { realRiskFreeRate: r, rho: 0.01, mertonDirection: [0.5, 0.5] },
  mortality: { tau: 10, p: 2, kappa: r, lambda: 2 * (2 * r - 0.01) },
  impoverishmentLevel: 100000,
};
const annualWithdrawal = 300000 * r;

test("scalar step follows exact gap and preserves safe wealth at the endpoint", () => {
  const input = {
    model,
    annualWithdrawal,
    current: { time: 0, wealth: 150000 },
    endTime: 1,
    marketIncrement: [0.1, -0.2],
  };
  const actual = advanceUnconstrainedWealth(input);
  const boundary = 300000 - 200000 * Math.exp(-r * 9);
  const expected = boundary - 50000 * Math.exp(r - 0.03 + 0.05);
  assert.ok(Math.abs(actual.wealth - expected) < 1e-8);
  const safe = advanceUnconstrainedWealth({
    ...input,
    current: { time: 0, wealth: 250000 },
    endTime: 10,
  });
  assert.ok(Math.abs(safe.wealth - 200000) < 1e-8);
});

test("scalar paths use the grid once, stop on observed hits and propagate invalid input", () => {
  const grid = generateTimeGrid(1, "monthly");
  assert.equal(grid.length, 13);
  let calls = 0;
  const path = simulateWealthPath(
    {
      initialStep: {
        model,
        annualWithdrawal,
        current: { time: 0, wealth: 150000 },
      },
      times: grid,
      recordTrajectory: true,
    },
    () => {
      calls += 1;
      return [0, 0];
    },
  );
  assert.equal(calls, grid.length - 1);
  assert.equal(path.finalState.time, 1);
  assert.equal(path.status, "completed");
  const hit = simulateWealthPath(
    {
      initialStep: {
        model,
        annualWithdrawal,
        current: { time: 0, wealth: 150000 },
      },
      times: [0, 1, 2],
      recordTrajectory: true,
    },
    () => [-2, -2],
  );
  assert.equal(hit.status, "impoverished-on-grid");
  assert.equal(hit.finalState.time, 1);
  assert.throws(
    () =>
      simulateWealthPath(
        {
          initialStep: {
            model,
            annualWithdrawal,
            current: { time: 0, wealth: 150000 },
          },
          times: [0, 2, 1],
          recordTrajectory: false,
        },
        () => [0, 0],
      ),
    /grid/,
  );
});

test("random streams and covariance increments are deterministic and reject invalid data", () => {
  assert.deepEqual(
    standardNormalVector(createRandomStream("seed"), 5),
    standardNormalVector(createRandomStream("seed"), 5),
  );
  assert.throws(() => standardNormalVector(createRandomStream("seed"), 1.5));
  const factor = covarianceFactor([
    [4, 2],
    [2, 5],
  ]);
  assert.deepEqual(correlatedMarketIncrement(factor, [1, 2], 0.25), [1, 2.5]);
  assert.throws(() =>
    covarianceFactor([
      [1, 0.9],
      [0.1, 1],
    ]),
  );
  assert.throws(() => covarianceFactor([[NaN]]));
});

test("TensorFlow CPU batch matches scalar paths with the same supplied increments", async () => {
  assert.equal(await initializeTensorBackend(["cpu"]), "cpu");
  const initial = [150000, 150000, 250000];
  const times = [0, 1, 2];
  const increments = [
    [0, 0, -2, -2, 0, 0],
    [0.03, -0.01, 0, 0, 0, 0],
  ];
  const before = tf.memory().numTensors;
  const result = await simulateTensorWealthBatch({
    model,
    annualWithdrawal,
    initialWealth: initial,
    times,
    increments,
  });
  for (let i = 0; i < initial.length; i += 1) {
    let step = 0;
    const path = simulateWealthPath(
      {
        initialStep: {
          model,
          annualWithdrawal,
          current: { time: 0, wealth: initial[i] },
        },
        times,
        recordTrajectory: true,
      },
      () => increments[step++].slice(2 * i, 2 * i + 2),
    );
    assert.ok(Math.abs(result.finalWealth[i] - path.finalState.wealth) < 0.1);
    assert.equal(
      result.firstGridHit[i] < 0 ? "completed" : "impoverished-on-grid",
      path.status,
    );
  }
  const streamed = await simulateTensorWealthBatch({
    model,
    annualWithdrawal,
    initialWealth: initial,
    times,
    increments: (step) => increments[step],
  });
  assert.deepEqual(streamed.finalWealth, result.finalWealth);
  assert.deepEqual(streamed.firstGridHit, result.firstGridHit);
  assert.equal(tf.memory().numTensors, before);
});

test("snapshot copies inputs and rejects changed markets and unsupported projection", () => {
  const built = buildSimulationOptions(initialSimulationDraft());
  assert.ok(built.ok);
  const calibrated = calibrateMarket(built.options.market);
  assert.ok(calibrated.ok);
  const market = calibrated.market;
  const tau = 50;
  const b0 =
    market.realRiskFreeRate / -Math.expm1(-market.realRiskFreeRate * tau);
  const p = 2 + market.rho / b0;
  const fit = {
    fittedSurvival: [],
    klDivergence: 0,
    maxSurvivalDifference: 0,
    converged: true,
    starts: 1,
    convergedStarts: 1,
  };
  const input: RunConfigurationInput = {
    options: built.options,
    market,
    mortality: {
      gm: { ...fit, parameters: { alpha: 0.01, beta: 0.1, lambda: 0.01 } },
      ce: {
        ...fit,
        parameters: {
          tau,
          p,
          deltaMin: 1 + market.rho / b0,
          kappa: market.realRiskFreeRate,
          lambda: p * (b0 - market.rho / (p - 1)),
        },
      },
    },
    numerical: {
      seed: "seed",
      horizonYears: 10,
      batchSize: 256,
      recordTrajectories: false,
    },
    versions: {
      schema: "test",
      model: "test",
      randomGenerator: "test",
      simulationAlgorithm: "test",
    },
    provenance: { mortalityData: "test", marketData: "test" },
  };
  const snapshot = createRunSnapshot(input);
  input.options.investor.initialCapital = 900000;
  assert.notEqual(
    snapshot.options.investor.initialCapital,
    input.options.investor.initialCapital,
  );
  assert.throws(
    () =>
      createRunSnapshot({
        ...input,
        options: {
          ...input.options,
          policy: { ...input.options.policy, projected: true },
        },
      }),
    /Projected/,
  );
  assert.throws(
    () =>
      createRunSnapshot({
        ...input,
        market: { ...market, rho: market.rho + 1 },
      }),
    /does not match/,
  );
});
