import type { RunConfigurationInput } from "./run-configuration";
import type {
  RunProgress,
  RunSchedulerResult,
} from "./tensorflow/run-scheduler";
import type { TensorBackend } from "./tensorflow/backend";

/** Messages sent to the financial-simulation worker. Each start has a unique ID. */
export type SimulationWorkerRequest =
  | {
      type: "start";
      runId: number;
      input: RunConfigurationInput;
      backendOrder?: readonly TensorBackend[];
    }
  | { type: "cancel"; runId: number };

/** Worker lifecycle messages; results are grid observations, not lifetime risk. */
export type SimulationWorkerResponse =
  | { type: "prepared"; runId: number; annualWithdrawal: number }
  | { type: "backend"; runId: number; backend: TensorBackend }
  | {
      type: "progress";
      runId: number;
      progress: RunProgress;
      /** Milliseconds since backend initialization, including completed batches. */
      batchElapsedMs: number;
    }
  | {
      type: "complete";
      runId: number;
      result: RunSchedulerResult;
      elapsedMs: number;
    }
  | { type: "cancelled"; runId: number }
  | { type: "error"; runId: number; message: string };
