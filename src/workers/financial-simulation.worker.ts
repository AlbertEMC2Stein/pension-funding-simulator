import { createRunSnapshot } from "../lib/model/simulation/run-configuration";
import { runScheduler } from "../lib/model/simulation/tensorflow/run-scheduler";
import { estimateMortalityRisk } from "../lib/model/simulation/risk-estimate";
import { compatibleRisk } from "../lib/model/analytical/compatible-policy";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "../lib/model/simulation/worker-protocol";

/** Browser worker surface used to receive requests and post typed responses. */
const worker = self as unknown as {
  onmessage: ((event: MessageEvent<SimulationWorkerRequest>) => void) | null;
  postMessage: (value: SimulationWorkerResponse) => void;
};

let active: { runId: number; controller: AbortController } | null = null;

/**
 * Validate captured inputs inside the worker and run one simulation at a time.
 * Cancellation is cooperative between batches; every response carries the
 * original ID so the caller can ignore messages from an obsolete worker.
 */
worker.onmessage = ({ data }) => {
  if (data.type === "cancel") {
    if (active?.runId === data.runId) active.controller.abort();
    return;
  }

  if (data.type !== "start") return;
  if (active) {
    worker.postMessage({
      type: "error",
      runId: data.runId,
      message: "A simulation is already running in this worker.",
    });
    return;
  }

  const { runId, input, backendOrder } = data;
  const controller = new AbortController();
  active = { runId, controller };
  const started = performance.now();

  void (async () => {
    try {
      // Structured cloning across workers removes snapshot identity, so the
      // input boundary is checked and frozen in this execution context.
      const snapshot = createRunSnapshot(input);
      worker.postMessage({
        type: "prepared",
        runId,
        annualWithdrawal: snapshot.resolvedAnnualWithdrawal,
      });

      let batchStarted = 0;
      const result = await runScheduler(snapshot, {
        backendOrder,
        signal: controller.signal,
        onBackendReady: (backend) => {
          batchStarted = performance.now();
          worker.postMessage({ type: "backend", runId, backend });
        },
        onProgress: (progress) =>
          worker.postMessage({
            type: "progress",
            runId,
            progress,
            batchElapsedMs: performance.now() - batchStarted,
          }),
      });
      const ceBenchmark = compatibleRisk(
        {
          market: snapshot.market,
          mortality: snapshot.mortality.ce.parameters,
          impoverishmentLevel: snapshot.options.investor.impoverishmentLevel,
        },
        snapshot.options.investor.initialCapital,
        snapshot.resolvedAnnualWithdrawal,
      );
      const risk = estimateMortalityRisk({
        firstHitTimes: result.firstHitTimes,
        gm: snapshot.mortality.gm.parameters,
        ce: snapshot.mortality.ce.parameters,
        horizonYears: snapshot.numerical.horizonYears,
        ceBenchmark,
      });
      worker.postMessage({
        type: "complete",
        runId,
        result,
        risk,
        elapsedMs: performance.now() - started,
      });
    } catch (error) {
      if (
        controller.signal.aborted &&
        error instanceof Error &&
        error.name === "AbortError"
      )
        worker.postMessage({ type: "cancelled", runId });
      else
        worker.postMessage({
          type: "error",
          runId,
          message:
            error instanceof Error ? error.message : "Simulation failed.",
        });
    } finally {
      if (active?.runId === runId) active = null;
    }
  })();
};
