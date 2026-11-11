"use client";

import { useEffect, useRef, useState } from "react";
import { calibrateMarket } from "../../lib/market/calibrate-market";
import { mortalityFitKeys } from "../../lib/mortality/fit-status";
import { buildSimulationOptions } from "../../lib/options/simulation-options";
import {
  MANUAL_BATCH_SIZES,
  resolveBatchSize,
  type BatchSizeChoice,
} from "../../lib/options/batch-size";
import type { RunConfigurationInput } from "../../lib/model/simulation/run-configuration";
import type {
  RunProgress,
  RunSchedulerResult,
} from "../../lib/model/simulation/tensorflow/run-scheduler";
import type { TensorBackend } from "../../lib/model/simulation/tensorflow/backend";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "../../lib/model/simulation/worker-protocol";
import { useSimulationDraft } from "../SimulationDraftContext";
import styles from "./developer.module.css";

/** Captured worker state and settings for one development-only check. */
interface CheckRun {
  signature: string;
  phase:
    "starting" | "running" | "cancelling" | "complete" | "cancelled" | "error";
  backend?: TensorBackend;
  annualWithdrawal?: number;
  progress?: RunProgress;
  /** Elapsed batch-processing time, excluding backend initialization. */
  batchElapsedMs?: number;
  result?: RunSchedulerResult;
  elapsedMs?: number;
  message?: string;
}

/** Format a rough batch-based estimate without implying subsecond precision. */
function formatRemainingTime(milliseconds: number): string {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));

  if (seconds < 60) return `about ${seconds} s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `about ${minutes} min${remainder ? ` ${remainder} s` : ""}`;
}

/**
 * Run the grid-only prototype from current inputs and current mortality fits.
 * The worker owns the validated snapshot; later edits only mark its result old.
 */
export function SimulationCheck() {
  const { draft, setDraft, mortalityFits } = useSimulationDraft();
  const [seed, setSeed] = useState("development-check");
  const [paths, setPaths] = useState("1000");
  const [horizon, setHorizon] = useState("10");
  const batch = draft.simulation.batchSize;
  const [backend, setBackend] = useState<"auto" | TensorBackend>("auto");
  const [run, setRun] = useState<CheckRun | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const running =
    run?.phase === "starting" ||
    run?.phase === "running" ||
    run?.phase === "cancelling";
  const signature = JSON.stringify({
    draft,
    mortalityFits,
    seed,
    paths,
    horizon,
    batch,
    backend,
  });
  const outdated = !!run && run.signature !== signature;
  const remainingMs =
    run?.progress && run.batchElapsedMs !== undefined
      ? (run.batchElapsedMs / run.progress.completedPaths) *
        (run.progress.totalPaths - run.progress.completedPaths)
      : null;

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  /** Capture the current settings and start a fresh worker without replacing an active run. */
  function startCheck() {
    if (workerRef.current) return;

    /** Display a preparation error without creating a worker. */
    const fail = (message: string) =>
      setRun({ signature, phase: "error", message });
    const options = buildSimulationOptions(draft);
    if (!options.ok) return fail(options.errors.join(" "));

    const market = calibrateMarket(options.options.market);
    if (!market.ok) return fail(market.error);

    const usableMarket = market.market.paperAssumptions.positiveRho
      ? market.market
      : null;
    const keys = mortalityFitKeys({ ...draft.investor, market: usableMarket });
    if (
      !keys.ce ||
      mortalityFits.gm?.key !== keys.gm ||
      mortalityFits.ce?.key !== keys.ce
    )
      return fail(
        "Fit both mortality models for the current investor and market settings first.",
      );
    if (!mortalityFits.gm.fit.converged || !mortalityFits.ce.fit.converged)
      return fail(
        "Both current mortality fits must have converged before running this check.",
      );

    const pathCount = Number(paths);
    const horizonYears = Number(horizon);
    if (!Number.isSafeInteger(pathCount) || pathCount <= 0)
      return fail("Enter a positive whole number of paths.");
    if (
      !Number.isFinite(horizonYears) ||
      horizonYears <= 0 ||
      horizonYears > mortalityFits.ce.fit.parameters.tau
    )
      return fail(
        `Horizon must be positive and at most the fitted CE endpoint (${mortalityFits.ce.fit.parameters.tau.toFixed(2)} years).`,
      );
    if (!seed.trim()) return fail("Enter a seed for the development check.");

    // The check uses the shared selection with its own development path count.
    const batchSize = resolveBatchSize(
      options.options.numerical.batchSize,
      pathCount,
    );
    const input: RunConfigurationInput = {
      options: {
        ...options.options,
        numerical: { ...options.options.numerical, paths: pathCount },
      },
      market: market.market,
      mortality: { gm: mortalityFits.gm.fit, ce: mortalityFits.ce.fit },
      numerical: { seed, horizonYears, batchSize, recordTrajectories: false },
      versions: {
        schema: "prototype-1",
        model: "compatible-ce-grid-1",
        randomGenerator: "cyrb128-sfc32-box-muller-1",
        simulationAlgorithm: "tensorflow-grid-1",
      },
      provenance: {
        mortalityData: `Current cohort fit: ${keys.gm}`,
        marketData:
          "Current market inputs; historical source is not retained in this prototype.",
      },
    };
    let worker: Worker;

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      worker = new Worker(`${basePath}/workers/financial-simulation.worker.js`);
    } catch {
      return fail("Could not start the simulation worker.");
    }

    const runId = ++runIdRef.current;
    workerRef.current = worker;
    setRun({ signature, phase: "starting" });

    /** Finish the active worker without affecting a newer run. */
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
              backend: message.backend,
              phase: current.phase === "cancelling" ? "cancelling" : "running",
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
              result: message.result,
              elapsedMs: message.elapsedMs,
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
      input,
      backendOrder: backend === "auto" ? undefined : [backend],
    };
    try {
      worker.postMessage(request);
    } catch {
      finish();
      setRun({
        signature,
        phase: "error",
        message: "Could not send the captured settings to the worker.",
      });
    }
  }

  /** Ask the active worker to stop after its current batch. */
  function cancelCheck() {
    if (!workerRef.current || !running) return;
    const request: SimulationWorkerRequest = {
      type: "cancel",
      runId: runIdRef.current,
    };
    workerRef.current.postMessage(request);
    setRun((current) => current && { ...current, phase: "cancelling" });
  }

  return (
    <article className={`form-card ${styles.wide}`}>
      <div className="card-heading">
        <div>
          <span className="tiny-label">DEVELOPMENT · GRID-ONLY PROTOTYPE</span>
          <h3>Simulation worker check</h3>
        </div>
        {run && (
          <span className="chip">
            {outdated ? "INPUTS CHANGED" : run.phase.toUpperCase()}
          </span>
        )}
      </div>
      <p>
        Runs the current market and investor settings with their current GM and
        CE fits. Grid hits ignore mortality and between-step crossings; they are
        not lifetime-risk estimates.
      </p>
      <div className={styles.simulationForm}>
        <label>
          Paths
          <input
            type="number"
            min="1"
            step="1"
            value={paths}
            onChange={(event) => setPaths(event.target.value)}
          />
        </label>
        <label>
          Horizon · years
          <input
            type="number"
            min="0.01"
            step="any"
            value={horizon}
            onChange={(event) => setHorizon(event.target.value)}
          />
        </label>
        <label>
          Seed
          <input
            type="text"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
          />
        </label>
        <label>
          Batch size
          <select
            value={batch}
            onChange={(event) => {
              const batchSize =
                event.target.value === "auto"
                  ? "auto"
                  : (Number(event.target.value) as BatchSizeChoice);
              setDraft((current) => ({
                ...current,
                simulation: { ...current.simulation, batchSize },
              }));
            }}
          >
            <option value="auto">Automatic (up to 32,768)</option>
            {MANUAL_BATCH_SIZES.map((size) => (
              <option key={size} value={size}>
                {size.toLocaleString("en-US")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Backend
          <select
            value={backend}
            onChange={(event) =>
              setBackend(event.target.value as "auto" | TensorBackend)
            }
          >
            <option value="auto">Automatic</option>
            <option value="webgpu">WebGPU only</option>
            <option value="webgl">WebGL only</option>
            <option value="cpu">CPU only</option>
          </select>
        </label>
      </div>
      <p className={styles.hint}>
        Uses the shared time step and batch-size selection. Automatic batch size
        aims for four batches and is capped at 32,768 paths. Manual batch sizes
        are capped at the requested path count.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className="button button-primary"
          onClick={startCheck}
          disabled={!!running}
        >
          Run check
        </button>
        {running && (
          <button
            type="button"
            className="button button-light"
            onClick={cancelCheck}
            disabled={run?.phase === "cancelling"}
          >
            Cancel after batch
          </button>
        )}
      </div>
      {run && (
        <div className={styles.runStatus} aria-live="polite">
          {outdated && (
            <p>
              Inputs changed since this check started. Its result belongs to the
              captured settings.
            </p>
          )}
          {run.phase === "starting" && (
            <p>Preparing snapshot and initializing the backend…</p>
          )}
          {run.phase === "cancelling" && (
            <p>Stopping after the current batch…</p>
          )}
          {run.backend && (
            <p>
              Backend: {run.backend}
              {run.annualWithdrawal !== undefined && (
                <> · Withdrawal: €{run.annualWithdrawal.toFixed(2)} / year</>
              )}
            </p>
          )}
          {run.progress && (
            <>
              <progress
                value={run.progress.completedPaths}
                max={run.progress.totalPaths}
                aria-label="Simulation progress"
              />
              <p>
                {run.progress.completedPaths.toLocaleString("en-US")} /{" "}
                {run.progress.totalPaths.toLocaleString("en-US")} paths ·{" "}
                {run.progress.completedBatches} / {run.progress.totalBatches}{" "}
                batches
              </p>
            </>
          )}
          {run.phase === "running" &&
            (remainingMs === null ? (
              <p>Estimated time remaining: available after the first batch.</p>
            ) : remainingMs > 0 ? (
              <p>
                Estimated time remaining: {formatRemainingTime(remainingMs)}.
              </p>
            ) : null)}
          {run.phase === "cancelled" && (
            <p>Check cancelled. No partial result was saved.</p>
          )}
          {run.message && <p role="alert">{run.message}</p>}
          {run.result && (
            <p>
              {run.result.completedPaths.toLocaleString("en-US")} paths
              completed · {run.result.observedGridHits.toLocaleString("en-US")}{" "}
              observed grid hits · {((run.elapsedMs ?? 0) / 1000).toFixed(2)}{" "}
              seconds. This count is not a lifetime-risk estimate.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
