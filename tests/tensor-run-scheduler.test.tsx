import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { calibrateMarket } from "../src/lib/market/calibrate-market";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";
import {
  createRunSnapshot,
  type RunConfigurationInput,
} from "../src/lib/model/simulation/run-configuration";
import { createRandomStream } from "../src/lib/model/simulation/random";
import { simulateTensorBatch } from "../src/lib/model/simulation/tensorflow/wealth-batch";
import {
  runScheduler,
  type RunProgress,
} from "../src/lib/model/simulation/tensorflow/run-scheduler";

/** Create a small valid CE run with a final partial batch. */
function exampleSnapshot(recordTrajectories = false) {
  const draft = initialSimulationDraft();
  draft.simulation.paths = 5;
  const built = buildSimulationOptions(draft);
  assert.ok(built.ok);
  const calibrated = calibrateMarket(built.options.market);
  assert.ok(calibrated.ok);

  const market = calibrated.market;
  const tau = 1;
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
      seed: "scheduler-example",
      horizonYears: tau,
      batchSize: 2,
      recordTrajectories,
    },
    versions: {
      schema: "test",
      model: "test",
      randomGenerator: "test",
      simulationAlgorithm: "test",
    },
    provenance: { mortalityData: "test", marketData: "test" },
  };

  return createRunSnapshot(input);
}

test("scheduler runs all paths, reports partial-batch progress and aggregates bridge hits", async () => {
  const snapshot = exampleSnapshot();
  const progress: RunProgress[] = [];
  const before = tf.memory().numTensors;
  const result = await runScheduler(snapshot, {
    backendOrder: ["cpu"],
    onProgress: (value) => progress.push(value),
  });

  assert.equal(result.backend, "cpu");
  assert.equal(result.completedPaths, 5);
  assert.equal(result.completedBatches, 3);
  assert.deepEqual(
    progress.map(({ completedPaths }) => completedPaths),
    [2, 4, 5],
  );
  assert.deepEqual(
    progress.map(({ totalBatches }) => totalBatches),
    [3, 3, 3],
  );
  assert.equal(result.times[0], 0);
  assert.equal(result.times.at(-1), 1);

  // Replay the same stream and batch sizes to independently check aggregation.
  const stream = createRandomStream(snapshot.numerical.seed);
  const expected = Array<number>(result.times.length).fill(0);

  for (const count of [2, 2, 1]) {
    const batch = await simulateTensorBatch(snapshot, count, stream);
    for (const index of batch.firstHitStep)
      if (index >= 0) expected[index] += 1;
  }

  assert.deepEqual(result.firstHitCounts, expected);
  assert.equal(
    result.observedHits,
    expected.reduce((sum, count) => sum + count, 0),
  );
  assert.equal(result.observedHits, 5);
  assert.equal(tf.memory().numTensors, before);
});

test("scheduler is reproducible for the same snapshot and batch sequence", async () => {
  const snapshot = exampleSnapshot();
  const first = await runScheduler(snapshot, { backendOrder: ["cpu"] });
  const second = await runScheduler(snapshot, { backendOrder: ["cpu"] });

  assert.deepEqual(second, first);
});

test("scheduler stops between batches when cancelled", async () => {
  const controller = new AbortController();
  const progress: number[] = [];

  await assert.rejects(
    runScheduler(exampleSnapshot(), {
      backendOrder: ["cpu"],
      signal: controller.signal,
      onProgress: ({ completedPaths }) => {
        progress.push(completedPaths);
        setTimeout(() => controller.abort(), 0);
      },
    }),
    { name: "AbortError" },
  );
  assert.deepEqual(progress, [2]);
});

test("scheduler rejects unsupported trajectory recording and unvalidated snapshots", async () => {
  await assert.rejects(
    runScheduler(exampleSnapshot(true), { backendOrder: ["cpu"] }),
    /Trajectory recording is not supported/,
  );
  await assert.rejects(
    runScheduler(structuredClone(exampleSnapshot()), { backendOrder: ["cpu"] }),
    /validated/,
  );
});
