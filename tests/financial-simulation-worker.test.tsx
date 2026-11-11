import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { calibrateMarket } from "../src/lib/market/calibrate-market";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";
import type { RunConfigurationInput } from "../src/lib/model/simulation/run-configuration";
import type { SimulationWorkerResponse } from "../src/lib/model/simulation/worker-protocol";

/** Construct a valid, small prototype run that crosses the worker boundary. */
function exampleInput(paths = 5): RunConfigurationInput {
  const draft = initialSimulationDraft();
  draft.simulation.paths = paths;
  const options = buildSimulationOptions(draft);
  assert.ok(options.ok);
  const calibrated = calibrateMarket(options.options.market);
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

  return {
    options: options.options,
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
      seed: "worker-test",
      horizonYears: tau,
      batchSize: 2,
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
}

/** Adapt Node's worker message transport to the bundled browser worker surface. */
function createTestWorker(): Worker {
  const scriptPath = fileURLToPath(
    new URL(
      "../public/workers/financial-simulation.worker.js",
      import.meta.url,
    ),
  );
  const adapter = `
    const { parentPort, workerData } = require("node:worker_threads");
    globalThis.self = globalThis;
    globalThis.process = undefined;
    globalThis.WorkerGlobalScope = class WorkerGlobalScope {};
    self.postMessage = (value) => parentPort.postMessage(value);
    require(workerData.scriptPath);
    parentPort.on("message", (data) => self.onmessage({ data }));
  `;

  return new Worker(adapter, { eval: true, workerData: { scriptPath } });
}

/** Collect messages until the worker completes, fails or acknowledges cancellation. */
async function runWorker(
  input: RunConfigurationInput,
  cancelAfterProgress = false,
): Promise<SimulationWorkerResponse[]> {
  const worker = createTestWorker();
  const messages: SimulationWorkerResponse[] = [];

  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Worker test timed out")),
        15000,
      );
      worker.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      worker.on("message", (message: SimulationWorkerResponse) => {
        messages.push(message);

        if (cancelAfterProgress && message.type === "progress")
          worker.postMessage({ type: "cancel", runId: 1 });

        if (["complete", "cancelled", "error"].includes(message.type)) {
          clearTimeout(timeout);
          resolve(messages);
        }
      });
      worker.postMessage({
        type: "start",
        runId: 1,
        input,
        backendOrder: ["cpu"],
      });
    });
  } finally {
    await worker.terminate();
  }
}

test("worker validates its cloned input and reports real batch progress", async () => {
  const messages = await runWorker(exampleInput());
  assert.notEqual(
    messages.at(-1)?.type,
    "error",
    JSON.stringify(messages.at(-1)),
  );
  assert.deepEqual(
    messages.map((message) => message.type),
    ["prepared", "backend", "progress", "progress", "progress", "complete"],
  );
  const progress = messages.filter((message) => message.type === "progress");
  assert.deepEqual(
    progress.map((message) => message.progress.completedPaths),
    [2, 4, 5],
  );
  const complete = messages.at(-1);
  assert.ok(complete?.type === "complete");
  assert.equal(complete.result.completedPaths, 5);
  assert.equal(complete.result.backend, "cpu");
});

test("worker acknowledges cancellation between batches", async () => {
  const messages = await runWorker(exampleInput(200), true);
  assert.equal(messages.at(-1)?.type, "cancelled");
});

test("worker rejects invalid input at its boundary", async () => {
  const input = exampleInput();
  input.numerical.horizonYears = -1;
  const messages = await runWorker(input);
  assert.equal(messages.at(-1)?.type, "error");
});
