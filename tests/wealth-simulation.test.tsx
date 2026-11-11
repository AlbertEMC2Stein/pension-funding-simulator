import { generateTimeGrid } from "../src/lib/model/simulation/time-grid";
import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { advanceUnconstrainedWealth } from "../src/lib/model/simulation/legacy/wealth-step";
import {
  simulateWealthBatch,
  simulateWealthPath,
} from "../src/lib/model/simulation/legacy/wealth-path";
import {
  covarianceFactor,
  correlatedMarketIncrement,
  correlatePreparedIncrement,
} from "../src/lib/model/simulation/legacy/matrix";
import {
  createRandomStream,
  standardNormalVector,
} from "../src/lib/model/simulation/random";
import { initializeTensorBackend } from "../src/lib/model/simulation/tensorflow/backend";
import {
  simulateTensorBatch,
  simulateTensorWealthBatch,
} from "../src/lib/model/simulation/tensorflow/wealth-batch";
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

/** Build a scalar test input with both investor amounts in the same group. */
function investorAt(wealth: number) {
  return {
    impoverishmentLevel: model.impoverishmentLevel,
    current: { time: 0, wealth },
  };
}

test("scalar step follows exact gap and preserves safe wealth at the endpoint", () => {
  const input = {
    market: model.market,
    mortality: model.mortality,
    annualWithdrawal,
    investor: investorAt(150000),
    endTime: 1,
    marketIncrement: [0.1, -0.2],
  };
  const actual = advanceUnconstrainedWealth(input);
  const boundary = 300000 - 200000 * Math.exp(-r * 9);
  const expected = boundary - 50000 * Math.exp(r - 0.03 + 0.05);
  assert.ok(Math.abs(actual.wealth - expected) < 1e-8);
  const safe = advanceUnconstrainedWealth({
    ...input,
    investor: investorAt(250000),
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
        market: model.market,
        mortality: model.mortality,
        annualWithdrawal,
        investor: investorAt(150000),
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
        market: model.market,
        mortality: model.mortality,
        annualWithdrawal,
        investor: investorAt(150000),
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
            market: model.market,
            mortality: model.mortality,
            annualWithdrawal,
            investor: investorAt(150000),
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
  const times = [0, 1, 2];
  const scenarios = [
    {
      initialCapital: 150000,
      pathCount: 2,
      increments: [
        [0, 0, -2, -2],
        [0.03, -0.01, 0, 0],
      ],
    },
    {
      initialCapital: 250000,
      pathCount: 1,
      increments: [
        [0, 0],
        [0, 0],
      ],
    },
  ];
  const before = tf.memory().numTensors;

  for (const { initialCapital, pathCount, increments } of scenarios) {
    const input = {
      market: model.market,
      mortality: model.mortality,
      annualWithdrawal,
      investor: {
        impoverishmentLevel: model.impoverishmentLevel,
        initialCapital,
      },
      pathCount,
      times,
      increments,
    };
    const result = await simulateTensorWealthBatch(input);

    for (let i = 0; i < pathCount; i += 1) {
      let step = 0;
      const path = simulateWealthPath(
        {
          initialStep: {
            market: model.market,
            mortality: model.mortality,
            annualWithdrawal,
            investor: investorAt(initialCapital),
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
      ...input,
      increments: (step) => increments[step],
    });
    assert.deepEqual(streamed.finalWealth, result.finalWealth);
    assert.deepEqual(streamed.firstGridHit, result.firstGridHit);
  }

  assert.equal(tf.memory().numTensors, before);
});

test("snapshot copies and freezes inputs and rejects changed markets and unsupported projection", async () => {
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
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.market.covariance[0]));
  assert.throws(() =>
    Object.defineProperty(snapshot.market.covariance[0], "0", { value: 0 }),
  );
  const tiny = createRunSnapshot({
    ...input,
    numerical: { ...input.numerical, horizonYears: 0.25, batchSize: 3 },
  });
  assert.equal(simulateWealthBatch(tiny).paths.length, 3);
  const stream = createRandomStream(tiny.numerical.seed);
  const tensorCountBefore = tf.memory().numTensors;
  const firstBatch = await simulateTensorBatch(tiny, 3, stream);
  const secondBatch = await simulateTensorBatch(tiny, 2, stream);
  assert.equal(firstBatch.finalWealth.length, 3);
  assert.equal(secondBatch.finalWealth.length, 2);
  assert.notEqual(firstBatch.finalWealth[0], secondBatch.finalWealth[0]);

  // Independently correlate the same draws with the scalar matrix helper.
  const referenceStream = createRandomStream(tiny.numerical.seed);
  const scalarCorrelation = await simulateTensorWealthBatch({
    market: tiny.market,
    mortality: tiny.mortality.ce.parameters,
    annualWithdrawal: tiny.resolvedAnnualWithdrawal,
    investor: tiny.options.investor,
    pathCount: 3,
    times: generateTimeGrid(
      tiny.numerical.horizonYears,
      tiny.options.numerical.timeStep,
    ),
    increments: (_step, dt) => {
      const draws: number[] = [];

      for (let path = 0; path < 3; path += 1) {
        const normals = tiny.market.assetNames.map(() =>
          referenceStream.nextStandardNormal(),
        );
        draws.push(
          ...correlatePreparedIncrement(
            tiny.market.covarianceFactor,
            normals,
            dt,
          ),
        );
      }

      return draws;
    },
  });
  firstBatch.finalWealth.forEach((wealth, i) => {
    assert.ok(Math.abs(wealth - scalarCorrelation.finalWealth[i]) < 0.1);
    assert.equal(firstBatch.firstGridHit[i], scalarCorrelation.firstGridHit[i]);
  });

  const replay = createRandomStream(tiny.numerical.seed);
  assert.deepEqual(
    (await simulateTensorBatch(tiny, 3, replay)).finalWealth,
    firstBatch.finalWealth,
  );
  assert.deepEqual(
    (await simulateTensorBatch(tiny, 2, replay)).finalWealth,
    secondBatch.finalWealth,
  );
  assert.equal(tf.memory().numTensors, tensorCountBefore);
  assert.throws(() => simulateWealthBatch(structuredClone(tiny)), /validated/);
  await assert.rejects(
    simulateTensorBatch(structuredClone(tiny), 1, createRandomStream("test")),
    /validated/,
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
  const changedFactor = market.covarianceFactor.map((row) => [...row]);
  changedFactor[0][0] *= 2;
  assert.throws(
    () =>
      createRunSnapshot({
        ...input,
        market: { ...market, covarianceFactor: changedFactor },
      }),
    /does not match/,
  );
});
