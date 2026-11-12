import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ComparisonQueue,
  comparisonBatchProgress,
  comparisonQueueRemaining,
  comparisonRowRemaining,
  type ComparisonQueueState,
  type ComparisonWorker,
} from "../src/components/comparison/comparison-queue";
import type { ComparisonRunRow } from "../src/components/comparison/comparison-run";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "../src/lib/model/simulation/worker-protocol";
import type { RunConfigurationInput } from "../src/lib/model/simulation/run-configuration";

/** Controllable worker that records requests and emits the production protocol. */
class FakeWorker implements ComparisonWorker {
  onmessage: ((event: MessageEvent<SimulationWorkerResponse>) => void) | null =
    null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: SimulationWorkerRequest[] = [];
  terminated = false;
  /** Capture a request so the test can inspect scheduling and cancellation. */
  postMessage(message: SimulationWorkerRequest) {
    this.messages.push(message);
  }
  /** Record cleanup after a terminal event. */
  terminate() {
    this.terminated = true;
  }
  /** Deliver a typed worker response to the queue. */
  emit(message: SimulationWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<SimulationWorkerResponse>);
  }
}

/** Create a queued test job; the fake worker never reads its input. */
function row(
  id: number,
  policy: "Unconstrained" | "Projected" = "Unconstrained",
): ComparisonRunRow {
  return {
    id,
    policy,
    rowSignature: String(id),
    status: "queued",
    input: {} as RunConfigurationInput,
  };
}

/** Make a terminal worker message with distinct policy estimates. */
function complete(id: number): SimulationWorkerResponse {
  const estimate = (value: number) => ({
    estimate: value,
    standardError: 0.01,
    interval95: null,
  });
  return {
    type: "complete",
    runId: id,
    elapsedMs: 1000,
    result: {} as never,
    risk: {
      gm: estimate(0.1),
      ce: estimate(0.05),
      ceBenchmark: 0.05,
      horizonYears: 10,
      ceEndpoint: 10,
      projected: {
        gm: estimate(0.2),
        ce: estimate(0.1),
        gmDifference: estimate(0.1),
        ceDifference: estimate(0.05),
      },
    },
  };
}

test("queue runs two rows, then starts the next and keeps policy results distinct", () => {
  const workers: FakeWorker[] = [];
  let state: ComparisonQueueState | null = null;
  const queue = new ComparisonQueue(
    [row(1), row(2, "Projected"), row(3)],
    () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    (next) => {
      state = next;
    },
  );
  queue.start();
  assert.equal(workers.length, 2);
  assert.deepEqual(
    state!.rows.map((item) => item.status),
    ["running", "running", "queued"],
  );
  assert.ok(
    workers.every(
      (worker) =>
        worker.messages[0].type === "start" && worker.messages[0].riskOnly,
    ),
  );
  workers[0].emit(complete(1));
  assert.equal(workers.length, 3);
  assert.equal(workers[0].terminated, true);
  workers[1].emit(complete(2));
  workers[2].emit(complete(3));
  assert.deepEqual(
    state!.rows.map((item) => item.gm?.estimate),
    [0.1, 0.2, 0.1],
  );
  assert.equal(state!.running, false);
});

test("cancellation stops queued rows immediately and active workers after acknowledgement", () => {
  const workers: FakeWorker[] = [];
  let state: ComparisonQueueState | null = null;
  const queue = new ComparisonQueue(
    [row(1), row(2), row(3)],
    () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    (next) => {
      state = next;
    },
  );
  queue.start();
  queue.cancel();
  assert.equal(state!.cancelling, true);
  assert.equal(state!.rows[2].status, "cancelled");
  assert.ok(
    workers.every((worker) => worker.messages.at(-1)?.type === "cancel"),
  );
  workers[0].emit({ type: "cancelled", runId: 1 });
  workers[1].emit(complete(2));
  assert.deepEqual(
    state!.rows.map((item) => item.status),
    ["cancelled", "cancelled", "cancelled"],
  );
  assert.equal(state!.running, false);
  assert.equal(workers.length, 2);
});

test("ETAs use batch throughput and schedule queued rows across two slots", () => {
  const first = {
    ...row(1),
    status: "running" as const,
    completedPaths: 50,
    totalPaths: 100,
    elapsedMs: 1000,
  };
  const second = {
    ...row(2, "Projected"),
    status: "running" as const,
    completedPaths: 50,
    totalPaths: 100,
    elapsedMs: 2000,
  };
  assert.equal(comparisonRowRemaining(first), 1000);
  assert.equal(comparisonQueueRemaining([first, second, row(3)]), 3000);
  assert.equal(
    comparisonQueueRemaining([{ ...first, completedPaths: 0 }, second]),
    4000,
  );
  assert.equal(
    comparisonQueueRemaining([
      { ...first, completedPaths: 0 },
      { ...second, completedPaths: 0 },
    ]),
    null,
  );
});

test("overall ETA estimates a first batch using previous same-policy rows", () => {
  const completed = {
    ...row(1),
    status: "calculated" as const,
    elapsedMs: 8000,
  };
  const newlyStarted = {
    ...row(2),
    status: "running" as const,
    startedAtMs: 1000,
  };
  const projected = {
    ...row(3, "Projected"),
    status: "calculated" as const,
    elapsedMs: 20000,
  };
  const another = {
    ...row(4, "Projected"),
    status: "running" as const,
    startedAtMs: 2000,
  };

  assert.equal(comparisonQueueRemaining([completed, newlyStarted], 3000), 6000);
  assert.equal(
    comparisonQueueRemaining(
      [completed, projected, newlyStarted, another],
      3000,
    ),
    19000,
  );
  assert.equal(comparisonRowRemaining(newlyStarted), null);
  const measured = {
    ...newlyStarted,
    completedPaths: 50,
    totalPaths: 100,
    elapsedMs: 1000,
  };
  assert.equal(comparisonQueueRemaining([completed, measured], 3000), 1000);
});

test("table progress counts each scheduled batch and excludes reused results", () => {
  const workers: FakeWorker[] = [];
  let state: ComparisonQueueState | null = null;
  const jobs = [row(1), row(2), row(3)].map((item) => ({
    ...item,
    batchProgress: { completed: 0, total: 4 },
  }));
  const cached = { ...row(4), status: "calculated" as const, input: undefined };
  const queue = new ComparisonQueue(
    [...jobs, cached],
    () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    (next) => {
      state = next;
    },
  );
  queue.start();
  assert.deepEqual(comparisonBatchProgress(state!.rows), {
    completed: 0,
    total: 12,
  });
  workers[0].emit({
    type: "progress",
    runId: 1,
    batchElapsedMs: 100,
    progress: {
      completedPaths: 25,
      totalPaths: 100,
      completedBatches: 1,
      totalBatches: 4,
    },
  });
  workers[1].emit({
    type: "progress",
    runId: 2,
    batchElapsedMs: 200,
    progress: {
      completedPaths: 50,
      totalPaths: 100,
      completedBatches: 2,
      totalBatches: 4,
    },
  });
  assert.deepEqual(comparisonBatchProgress(state!.rows), {
    completed: 3,
    total: 12,
  });
  workers[0].emit(complete(1));
  assert.deepEqual(comparisonBatchProgress(state!.rows), {
    completed: 6,
    total: 12,
  });
  queue.dispose();
});
