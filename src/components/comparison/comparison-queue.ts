import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "../../lib/model/simulation/worker-protocol";
import type { ComparisonRunRow } from "./comparison-run";

/** Current queue state as exposed to the table. */
export interface ComparisonQueueState {
  rows: ComparisonRunRow[];
  running: boolean;
  cancelling: boolean;
}

/** The browser worker surface required by the queue, injectable for tests. */
export interface ComparisonWorker {
  onmessage: ((event: MessageEvent<SimulationWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: SimulationWorkerRequest): void;
  terminate(): void;
}

/**
 * Schedule at most two captured rows concurrently. Every worker owns a single
 * run, sends batch-level progress, and is terminated after its terminal message.
 * Cancellation stops queued rows immediately and asks active workers to stop
 * between batches; no partial estimates are published as completed results.
 */
export class ComparisonQueue {
  private rows: ComparisonRunRow[];
  private readonly active = new Map<number, ComparisonWorker>();
  private cancelling = false;
  private disposed = false;

  /** Create a queue from captured rows and an injectable worker factory. */
  constructor(
    rows: ComparisonRunRow[],
    private readonly createWorker: () => ComparisonWorker,
    private readonly onChange: (state: ComparisonQueueState) => void,
  ) {
    this.rows = rows.map((row) => ({ ...row }));
  }

  /** Start the initial workers and report the first queue state. */
  start(): void {
    this.schedule();
  }

  /** Stop queued work and request cooperative cancellation of active workers. */
  cancel(): void {
    this.cancelling = true;
    this.rows = this.rows.map((row) =>
      row.status === "queued" ? { ...row, status: "cancelled" } : row,
    );
    for (const [id, worker] of this.active)
      worker.postMessage({ type: "cancel", runId: id });
    this.publish();
  }

  /** Terminate all workers without publishing after the owning component unmounts. */
  dispose(): void {
    this.disposed = true;
    for (const worker of this.active.values()) worker.terminate();
    this.active.clear();
  }

  /** Replace one row without mutating previously published React state. */
  private update(id: number, change: Partial<ComparisonRunRow>): void {
    this.rows = this.rows.map((row) =>
      row.id === id ? { ...row, ...change } : row,
    );
  }

  /** Notify the caller using immutable row copies and the current queue status. */
  private publish(): void {
    if (this.disposed) return;
    this.onChange({
      rows: this.rows.map((row) => ({ ...row })),
      running:
        this.active.size > 0 ||
        this.rows.some((row) => row.status === "queued"),
      cancelling: this.cancelling && this.active.size > 0,
    });
  }

  /** Start queued work in top-to-bottom order while a worker slot is free. */
  private schedule(): void {
    if (this.disposed) return;

    while (!this.cancelling && this.active.size < 2) {
      const row = this.rows.find((item) => item.status === "queued");
      if (!row?.input) break;

      try {
        const worker = this.createWorker();
        this.active.set(row.id, worker);
        this.update(row.id, {
          status: "running",
          startedAtMs: performance.now(),
        });
        worker.onmessage = (event) => this.receive(row.id, event.data);
        worker.onerror = () =>
          this.finish(row.id, {
            status: "error",
            message: "The simulation worker failed.",
          });
        worker.postMessage({
          type: "start",
          runId: row.id,
          input: row.input,
          riskOnly: row.kind !== "feasibility",
        });
      } catch (error) {
        this.finish(
          row.id,
          {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not start the simulation worker.",
          },
          false,
        );
      }
    }
    this.publish();
  }

  /** Apply progress or a terminal message from the worker associated with a row. */
  private receive(id: number, message: SimulationWorkerResponse): void {
    if (this.disposed || !this.active.has(id) || message.runId !== id) return;
    if (message.type === "progress") {
      this.update(id, {
        batchProgress: {
          completed: message.progress.completedBatches,
          total: message.progress.totalBatches,
        },
        completedPaths: message.progress.completedPaths,
        totalPaths: message.progress.totalPaths,
        elapsedMs: message.batchElapsedMs,
      });
      this.publish();
    } else if (message.type === "complete") {
      const row = this.rows.find((item) => item.id === id)!;
      const gm =
        row.policy === "Projected"
          ? message.risk.projected?.gm
          : message.risk.gm;
      if (this.cancelling) this.finish(id, { status: "cancelled" });
      else if (row.kind === "feasibility") {
        const { borrowingProbability, borrowingOccupation } = message.result;
        if (!row.borrowing || !borrowingProbability || !borrowingOccupation)
          this.finish(id, {
            status: "error",
            message: "The borrowing results are missing.",
          });
        else
          this.finish(id, {
            status: "calculated",
            borrowing: {
              ...row.borrowing,
              probability: borrowingProbability,
              occupation: borrowingOccupation,
            },
            batchProgress: row.batchProgress
              ? {
                  completed: row.batchProgress.total,
                  total: row.batchProgress.total,
                }
              : undefined,
            elapsedMs: message.elapsedMs,
          });
      } else if (!gm)
        this.finish(id, {
          status: "error",
          message: "The projected GM result is missing.",
        });
      else
        this.finish(id, {
          status: "calculated",
          gm,
          batchProgress: row.batchProgress
            ? {
                completed: row.batchProgress.total,
                total: row.batchProgress.total,
              }
            : undefined,
          elapsedMs: message.elapsedMs,
        });
    } else if (message.type === "cancelled")
      this.finish(id, { status: "cancelled" });
    else if (message.type === "error")
      this.finish(id, { status: "error", message: message.message });
  }

  /** Release one worker and either start the next row or publish completion. */
  private finish(
    id: number,
    change: Partial<ComparisonRunRow>,
    reschedule = true,
  ): void {
    this.active.get(id)?.terminate();
    this.active.delete(id);
    this.update(id, change);
    if (reschedule) this.schedule();
  }
}

/** Sum completed and scheduled batches for this run, excluding reused results. */
export function comparisonBatchProgress(rows: readonly ComparisonRunRow[]): {
  completed: number;
  total: number;
} {
  return rows.reduce(
    (sum, row) => ({
      completed: sum.completed + (row.batchProgress?.completed ?? 0),
      total: sum.total + (row.batchProgress?.total ?? 0),
    }),
    { completed: 0, total: 0 },
  );
}

/** Estimate a running row's remaining time from its cumulative batch throughput. */
export function comparisonRowRemaining(row: ComparisonRunRow): number | null {
  if (
    row.status !== "running" ||
    !row.completedPaths ||
    !row.totalPaths ||
    row.elapsedMs === undefined
  )
    return null;
  return Math.max(
    0,
    (row.elapsedMs * (row.totalPaths - row.completedPaths)) /
      row.completedPaths,
  );
}

/**
 * Estimate the queue's makespan across two workers. Rows without a completed
 * batch use observed full-run times, preferring the same policy; subtract their
 * elapsed wall time when a start time is available. Queued rows use the same
 * estimates. Return null only when a needed estimate has no timing evidence.
 * Updates still occur at queue events and batch boundaries, not within batches.
 */
export function comparisonQueueRemaining(
  rows: readonly ComparisonRunRow[],
  nowMs = performance.now(),
): number | null {
  const running = rows.filter((row) => row.status === "running");
  const queued = rows.filter((row) => row.status === "queued");
  if (!running.length && !queued.length) return 0;

  const durations = rows.flatMap((row) => {
    if (row.analytical || row.elapsedMs === undefined) return [];
    if (row.status === "calculated")
      return [{ policy: row.policy, duration: row.elapsedMs }];
    if (row.status === "running" && row.completedPaths && row.totalPaths)
      return [
        {
          policy: row.policy,
          duration: (row.elapsedMs * row.totalPaths) / row.completedPaths,
        },
      ];
    return [];
  });

  /** Estimate a full row duration from same-policy samples, or all samples. */
  function estimatedDuration(row: ComparisonRunRow): number | null {
    const matching = durations.filter((item) => item.policy === row.policy);
    const source = matching.length ? matching : durations;
    return source.length
      ? source.reduce((sum, item) => sum + item.duration, 0) / source.length
      : null;
  }

  const slots: number[] = [];
  for (const row of running) {
    const ownEstimate = comparisonRowRemaining(row);
    if (ownEstimate !== null) {
      slots.push(ownEstimate);
      continue;
    }

    const estimate = estimatedDuration(row);
    if (estimate === null) return null;
    const elapsed =
      row.startedAtMs === undefined ? 0 : Math.max(0, nowMs - row.startedAtMs);
    slots.push(Math.max(0, estimate - elapsed));
  }

  while (slots.length < 2) slots.push(0);
  for (const row of queued) {
    const duration = estimatedDuration(row);
    if (duration === null) return null;
    const slot = slots[0] <= slots[1] ? 0 : 1;
    slots[slot] += duration;
  }

  return Math.max(...slots);
}
