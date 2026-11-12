"use client";

import { useEffect, useRef, useState } from "react";
import type { SimulationOptions } from "../../lib/options/simulation-options";
import type {
  RunConfigurationInput,
  RunNumerics,
} from "../../lib/model/simulation/run-configuration";
import type { TensorBackend } from "../../lib/model/simulation/tensorflow/backend";
import type {
  CompactifiedExponentialParameters,
  GompertzMakehamParameters,
} from "../../lib/mortality/mortality-models";
import type { MortalityRiskResults } from "../../lib/model/simulation/risk-estimate";
import type { RunProgress } from "../../lib/model/simulation/tensorflow/run-scheduler";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "../../lib/model/simulation/worker-protocol";
import { useSimulationDraft } from "../SimulationDraftContext";
import { prepareEvaluationRun } from "./evaluation-run-input";

/** Captured evaluation run and its latest worker state. */
export interface EvaluationRun {
  signature: string;
  /** Display name captured when the run was started. */
  setupName?: string;
  phase:
    "starting" | "running" | "cancelling" | "complete" | "cancelled" | "error";
  options: SimulationOptions;
  numerical: RunNumerics;
  /** Captured validated-worker input, including fitted parameters and provenance. */
  capturedInput?: RunConfigurationInput;
  backend?: TensorBackend;
  /** Resolved real annual withdrawal captured by the worker. */
  annualWithdrawal?: number;
  progress?: RunProgress;
  /** Elapsed processing time after backend initialization. */
  batchElapsedMs?: number;
  risk?: MortalityRiskResults;
  /** GM-weighted first-borrowing probability within the captured horizon. */
  borrowingProbability?: import("../../lib/model/simulation/risk-estimate").RiskEstimate;
  /** Unconstrained GM-weighted borrowing occupation within the captured horizon. */
  borrowingOccupation?: import("../../lib/model/simulation/tensorflow/run-scheduler").RunSchedulerResult["borrowingOccupation"];
  /** Sample paths retained only if the trajectory visual was enabled at run start. */
  trajectories?: import("../../lib/model/simulation/tensorflow/run-scheduler").TrajectorySamples;
  /** Run-captured mortality and first hits for the optional timing visual. */
  timing?: {
    gm: GompertzMakehamParameters;
    firstHitTimes: Float32Array;
    projectedFirstHitTimes?: Float32Array;
    /** Market and compatible CE fit captured alongside the simulated paths. */
    durbin: {
      realRiskFreeRate: number;
      rho: number;
      ce: CompactifiedExponentialParameters;
    };
  };
  message?: string;
}

/**
 * Own the evaluation worker, captured inputs and lifecycle. Editing inputs does
 * not alter a running snapshot; requesting a replacement requires confirmation.
 * Late messages are ignored and the worker is disposed when this view unmounts.
 */
export function useEvaluationRun() {
  const {
    draft,
    mortalityFits,
    setPrepared,
    registerRunGuard,
    setEvaluationResult,
    setupName,
  } = useSimulationDraft();
  const [run, setRun] = useState<EvaluationRun | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const signature = JSON.stringify({ draft, mortalityFits });
  const stale = run !== null && run.signature !== signature;
  const running =
    run?.phase === "starting" ||
    run?.phase === "running" ||
    run?.phase === "cancelling";

  // Publish only complete results; progress updates must not rerender all panels.
  useEffect(() => {
    setEvaluationResult(run?.phase === "complete" ? run : null);
  }, [run?.phase, setEvaluationResult]);

  useEffect(
    () => registerRunGuard(() => workerRef.current !== null),
    [registerRunGuard],
  );

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  /** Capture current settings and start a worker, confirming any replacement. */
  function start(recordTrajectories = false) {
    const prepared = prepareEvaluationRun(
      draft,
      mortalityFits,
      recordTrajectories,
    );
    if (!prepared.ok) {
      setErrors(prepared.errors);
      return;
    }

    if (
      workerRef.current &&
      !window.confirm(
        "A simulation is still running. Interrupt it and start a new run with the current settings?",
      )
    )
      return;

    workerRef.current?.terminate();
    workerRef.current = null;
    setErrors([]);
    let worker: Worker;

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      worker = new Worker(`${basePath}/workers/financial-simulation.worker.js`);
    } catch {
      setErrors(["Could not start the simulation worker."]);
      return;
    }

    // Capture the fit independently of later draft or calibration edits.
    const gm = structuredClone(prepared.input.mortality.gm.parameters);
    const durbin = {
      realRiskFreeRate: prepared.input.market.realRiskFreeRate,
      rho: prepared.input.market.rho,
      ce: structuredClone(prepared.input.mortality.ce.parameters),
    };
    const runId = ++runIdRef.current;
    workerRef.current = worker;
    setPrepared({ draft, options: prepared.input.options });
    setRun({
      signature,
      setupName,
      phase: "starting",
      options: prepared.input.options,
      numerical: prepared.input.numerical,
      capturedInput: structuredClone(prepared.input),
    });

    /** Terminate this worker and avoid clearing a newer worker reference. */
    function finish() {
      if (workerRef.current === worker) workerRef.current = null;
      worker.terminate();
    }

    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      const message = event.data;
      if (workerRef.current !== worker || message.runId !== runId) return;

      if (message.type === "prepared")
        setRun(
          (current) =>
            current && {
              ...current,
              annualWithdrawal: message.annualWithdrawal,
            },
        );
      else if (message.type === "backend")
        setRun(
          (current) =>
            current && {
              ...current,
              phase: current.phase === "cancelling" ? "cancelling" : "running",
              backend: message.backend,
            },
        );
      else if (message.type === "progress")
        setRun(
          (current) =>
            current && {
              ...current,
              progress: message.progress,
              batchElapsedMs: message.batchElapsedMs,
            },
        );
      else if (message.type === "complete") {
        finish();
        setRun(
          (current) =>
            current && {
              ...current,
              phase: "complete",
              risk: message.risk,
              borrowingOccupation: message.result.borrowingOccupation,
              borrowingProbability: message.result.borrowingProbability,
              trajectories: message.result.trajectories,
              timing: {
                gm,
                durbin,
                firstHitTimes: message.result.firstHitTimes,
                projectedFirstHitTimes: message.result.projected?.firstHitTimes,
              },
            },
        );
      } else if (message.type === "cancelled") {
        finish();
        setRun((current) => current && { ...current, phase: "cancelled" });
      } else if (message.type === "error") {
        finish();
        setRun(
          (current) =>
            current && { ...current, phase: "error", message: message.message },
        );
      }
    };
    worker.onerror = () => {
      if (workerRef.current !== worker) return;
      finish();
      setRun(
        (current) =>
          current && {
            ...current,
            phase: "error",
            message: "The simulation worker failed to load or run.",
          },
      );
    };

    const request: SimulationWorkerRequest = {
      type: "start",
      runId,
      input: prepared.input,
    };
    try {
      worker.postMessage(request);
    } catch {
      finish();
      setRun(
        (current) =>
          current && {
            ...current,
            phase: "error",
            message: "Could not send the settings to the simulation worker.",
          },
      );
    }
  }

  /** Ask the worker to cancel after its current batch. */
  function cancel() {
    if (!workerRef.current || !running) return;
    const request: SimulationWorkerRequest = {
      type: "cancel",
      runId: runIdRef.current,
    };
    workerRef.current.postMessage(request);
    setRun((current) => current && { ...current, phase: "cancelling" });
  }

  return { run, errors, stale, running, start, cancel };
}
