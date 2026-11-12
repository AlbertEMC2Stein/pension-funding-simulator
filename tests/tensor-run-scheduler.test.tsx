import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { safeBoundaryValue } from "../src/lib/model/analytical/safe-boundary";
import { prepareGompertzMakehamSurvival } from "../src/lib/mortality/mortality-models";
import { calibrateMarket } from "../src/lib/market/calibrate-market";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";
import {
  createRunSnapshot,
  type RunConfigurationInput,
} from "../src/lib/model/simulation/run-configuration";
import { prepareBorrowingOccupation } from "../src/lib/model/simulation/borrowing-occupation";
import { createRandomStream } from "../src/lib/model/simulation/random";
import { simulateTensorBatch } from "../src/lib/model/simulation/tensorflow/wealth-batch";
import {
  runScheduler,
  type RunProgress,
} from "../src/lib/model/simulation/tensorflow/run-scheduler";

/** Create a small valid CE run with a final partial batch. */
function exampleSnapshot(
  recordTrajectories = false,
  projected = false,
  initiallyBorrowing = false,
) {
  const draft = initialSimulationDraft();
  draft.simulation.paths = 5;
  draft.simulation.projected = projected;
  if (initiallyBorrowing) {
    draft.investor.initialCapital = "110,000";
    draft.simulation.withdrawalMode = "customAmount";
    draft.simulation.withdrawalEuros = 500000;
  }
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
  const occupationSteps = prepareBorrowingOccupation({
    market: snapshot.market,
    mortality: snapshot.mortality.ce.parameters,
    gm: snapshot.mortality.gm.parameters,
    annualWithdrawal: snapshot.resolvedAnnualWithdrawal,
    impoverishmentLevel: snapshot.options.investor.impoverishmentLevel,
    times: result.times,
  });
  const occupations: number[] = [];
  const borrowingTimes: number[] = [];

  for (const count of [2, 2, 1]) {
    const batch = await simulateTensorBatch(
      snapshot,
      count,
      stream,
      undefined,
      occupationSteps ?? undefined,
    );
    occupations.push(...(batch.borrowingOccupation ?? Array(count).fill(0)));
    borrowingTimes.push(...(batch.firstBorrowingTime ?? Array(count).fill(-1)));
    for (const index of batch.firstHitStep)
      if (index >= 0) expected[index] += 1;
  }

  assert.ok(result.borrowingOccupation && result.borrowingProbability);
  assert.ok(
    Math.abs(
      result.borrowingOccupation.estimateYears -
        occupations.reduce((a, b) => a + b, 0) / occupations.length,
    ) < 1e-10,
  );
  const survival = prepareGompertzMakehamSurvival(
    snapshot.mortality.gm.parameters,
  );
  const probability =
    borrowingTimes.reduce(
      (sum, time) => sum + (time < 0 ? 0 : survival(time)),
      0,
    ) / borrowingTimes.length;
  assert.ok(
    Math.abs(result.borrowingProbability.estimate - probability) < 1e-10,
  );
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

test("scheduler retains selected stopped paths across batches without changing the run", async () => {
  const before = tf.memory().numTensors;
  const ordinary = await runScheduler(exampleSnapshot(), {
    backendOrder: ["cpu"],
  });
  const recorded = await runScheduler(exampleSnapshot(true), {
    backendOrder: ["cpu"],
  });
  assert.deepEqual(recorded.firstHitTimes, ordinary.firstHitTimes);
  assert.ok(recorded.trajectories);
  assert.equal(recorded.trajectories.count, 5);
  assert.equal(recorded.trajectories.projected, false);
  const snapshot = exampleSnapshot(true);
  const expectedBoundary = safeBoundaryValue({
    realRiskFreeRate: snapshot.market.realRiskFreeRate,
    annualWithdrawal: snapshot.resolvedAnnualWithdrawal,
    impoverishmentLevel: snapshot.options.investor.impoverishmentLevel,
    mortalityEndpoint: snapshot.mortality.ce.parameters.tau,
    time: 0,
  });
  assert.equal(recorded.trajectories.safeBoundary[0], expectedBoundary);
  assert.equal(
    recorded.trajectories.safeBoundary.at(-1),
    snapshot.options.investor.impoverishmentLevel,
  );
  assert.equal(recorded.trajectories.values.length, 5 * recorded.times.length);
  assert.deepEqual(recorded.trajectories.firstHitTimes, recorded.firstHitTimes);
  for (let path = 0; path < 5; path += 1) {
    const offset = path * recorded.times.length;
    assert.equal(recorded.trajectories.values[offset], 500000);
    const hit = recorded.firstHitTimes[path];
    for (let step = 1; step < recorded.times.length; step += 1)
      if (hit >= 0 && recorded.times[step] >= hit)
        assert.equal(recorded.trajectories.values[offset + step], 100000);
  }
  assert.equal(tf.memory().numTensors, before);
});

test("scheduler rejects unvalidated snapshots", async () => {
  await assert.rejects(
    runScheduler(structuredClone(exampleSnapshot()), { backendOrder: ["cpu"] }),
    /validated/,
  );
});

test("paired trajectory samples use the selected projected policy", async () => {
  const result = await runScheduler(exampleSnapshot(true, true), {
    backendOrder: ["cpu"],
  });
  assert.ok(result.trajectories && result.projected);
  assert.equal(result.trajectories.projected, true);
  assert.equal(result.trajectories.borrowingBoundary, undefined);
  assert.deepEqual(
    result.trajectories.firstHitTimes,
    result.projected.firstHitTimes,
  );
});

test("paired batches retain matching observations without altering the unconstrained stream", async () => {
  const before = tf.memory().numTensors;
  const single = await runScheduler(exampleSnapshot(), {
    backendOrder: ["cpu"],
  });
  const paired = await runScheduler(exampleSnapshot(false, true), {
    backendOrder: ["cpu"],
  });

  assert.ok(paired.projected);
  assert.equal(paired.projected.firstHitTimes.length, 5);
  assert.deepEqual(paired.firstHitTimes, single.firstHitTimes);
  assert.deepEqual(paired.firstHitCounts, single.firstHitCounts);
  assert.equal(
    paired.projected.observedHits,
    paired.projected.firstHitCounts.reduce((sum, count) => sum + count, 0),
  );
  assert.equal(tf.memory().numTensors, before);
});

test("initial borrowing is survival-weighted and aggregated across batches", async () => {
  const result = await runScheduler(exampleSnapshot(false, false, true), {
    backendOrder: ["cpu"],
  });

  assert.ok(result.borrowingProbability && result.borrowingOccupation);
  assert.equal(result.borrowingProbability.estimate, 1);
  assert.equal(result.borrowingProbability.standardError, 0);
  assert.equal(result.borrowingProbability.interval95, null);
  assert.ok(result.borrowingOccupation.estimateYears > 0);
});

test("trajectory shading follows the unconstrained borrowing boundary", async () => {
  const snapshot = exampleSnapshot(true, false, true);
  const result = await runScheduler(snapshot, { backendOrder: ["cpu"] });
  const sample = result.trajectories;
  assert.ok(sample?.borrowingBoundary);
  const mertonSum = snapshot.market.mertonDirection.reduce(
    (sum, value) => sum + value,
    0,
  );
  const scale =
    mertonSum / (mertonSum + snapshot.mortality.ce.parameters.p - 1);
  assert.equal(sample.borrowingBoundary[0], sample.safeBoundary[0] * scale);
  assert.equal(
    sample.borrowingBoundary.at(-1),
    snapshot.options.investor.impoverishmentLevel,
  );
});

test("risk-only runs omit borrowing diagnostics", async () => {
  const result = await runScheduler(exampleSnapshot(), {
    backendOrder: ["cpu"],
    riskOnly: true,
  });
  assert.equal(result.borrowingProbability, undefined);
  assert.equal(result.borrowingOccupation, undefined);
  assert.equal(result.completedPaths, 5);
  assert.equal(result.firstHitTimes.length, 5);
});
