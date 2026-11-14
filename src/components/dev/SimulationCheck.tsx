"use client";

import { useEffect, useRef, useState } from "react";
import { StatusBadge, type ResultStatus } from "../StatusBadge";
import { calibrateMarket } from "../../lib/market/calibrate-market";
import { resourceLoadError } from "../../lib/network/resource-errors";
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
  MortalityRiskResults,
  RiskEstimate,
} from "../../lib/model/simulation/risk-estimate";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "../../lib/model/simulation/worker-protocol";
import { useSimulationDraft } from "../SimulationDraftContext";
import styles from "./developer.module.css";
import { makeDevelopmentDraft } from "./development-draft";
import type { SimulationDraft } from "../../lib/options/simulation-options";

/** Maximum path count for an interactive development run. */
const MAX_DEVELOPMENT_PATHS = 250_000;

/** Captured worker state and settings for one development-only check. */
interface CheckRun {
  signature: string;
  phase:
    "starting" | "running" | "cancelling" | "complete" | "cancelled" | "error";
  backend?: TensorBackend;
  annualWithdrawal?: number;
  /** Actual run horizon, capped at the fitted CE endpoint. */
  horizonYears?: number;
  horizonCapped?: boolean;
  progress?: RunProgress;
  /** Elapsed batch-processing time, excluding backend initialization. */
  batchElapsedMs?: number;
  result?: RunSchedulerResult;
  risk?: MortalityRiskResults;
  elapsedMs?: number;
  message?: string;
}

/** Present a probability as a percentage for the developer's run summary. */
function percentage(value: number): string {
  return `${(value * 100).toFixed(3)}%`;
}

/** Describe the approximate 95% Monte Carlo interval or why it is unavailable. */
function riskInterval(estimate: RiskEstimate): string {
  if (!estimate.interval95) return "Not available";

  return `${percentage(estimate.interval95.lower)} – ${percentage(estimate.interval95.upper)}`;
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
 * Run the bridge-corrected prototype from current inputs and current mortality fits.
 * The worker owns the validated snapshot; later edits only mark its result old.
 */
export function SimulationCheck() {
  const { draft, mortalityFits, registerRunGuard } = useSimulationDraft();
  const [seed, setSeed] = useState("development-check");
  const [paths, setPaths] = useState("1000");
  const [horizon, setHorizon] = useState("10");
  const [timeStep, setTimeStep] =
    useState<SimulationDraft["simulation"]["timeStep"]>("monthly");
  const [batch, setBatch] = useState<BatchSizeChoice>("auto");
  const [backend, setBackend] = useState<"auto" | TensorBackend>("auto");
  const [run, setRun] = useState<CheckRun | null>(null);
  const workerRef = useRef<Worker | null>(null);
  useEffect(
    () => registerRunGuard(() => workerRef.current !== null),
    [registerRunGuard],
  );
  const runIdRef = useRef(0);
  const running =
    run?.phase === "starting" ||
    run?.phase === "running" ||
    run?.phase === "cancelling";
  const checkDraft = makeDevelopmentDraft(draft, {
    paths: Number(paths),
    timeStep,
    batchSize: batch,
    seed,
  });
  const signature = JSON.stringify({
    draft: checkDraft,
    mortalityFits,
    seed,
    paths,
    horizon,
    batch,
    backend,
  });
  const outdated = !!run && run.signature !== signature;
  const runStatus: ResultStatus =
    run?.phase === "error"
      ? "error"
      : run?.phase === "cancelled"
        ? "cancelled"
        : running
          ? "running"
          : outdated
            ? "needs-updating"
            : "calculated";
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
    const pathCount = Number(paths);
    const horizonYears = Number(horizon);

    if (
      !Number.isSafeInteger(pathCount) ||
      pathCount < 1 ||
      pathCount > MAX_DEVELOPMENT_PATHS
    )
      return fail(
        `Enter a whole number of paths between 1 and ${MAX_DEVELOPMENT_PATHS.toLocaleString("en-US")}.`,
      );
    if (!Number.isFinite(horizonYears) || horizonYears <= 0)
      return fail("Enter a positive maximum horizon.");
    if (!seed.trim()) return fail("Enter a seed for the development check.");

    const options = buildSimulationOptions(checkDraft);
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

    const effectiveHorizon = Math.min(
      horizonYears,
      mortalityFits.ce.fit.parameters.tau,
    );

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
      numerical: {
        seed,
        horizonYears: effectiveHorizon,
        batchSize,
        recordTrajectories: false,
      },
      versions: {
        schema: "prototype-1",
        model: "compatible-ce-1",
        randomGenerator: "cyrb128-sfc32-box-muller-1",
        simulationAlgorithm: options.options.policy.projected
          ? "tensorflow-paired-euler-1"
          : "tensorflow-bridge-2",
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
      return fail(resourceLoadError("Could not start the simulation worker."));
    }

    const runId = ++runIdRef.current;
    let workerResponded = false;
    workerRef.current = worker;
    setRun({
      signature,
      phase: "starting",
      horizonYears: effectiveHorizon,
      horizonCapped: effectiveHorizon < horizonYears,
    });

    /** Finish the active worker without affecting a newer run. */
    function finish() {
      if (workerRef.current === worker) workerRef.current = null;
      worker.terminate();
    }

    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      const message = event.data;
      if (workerRef.current !== worker || message.runId !== runId) return;
      workerResponded = true;

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
              risk: message.risk,
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
            message: workerResponded
              ? "The simulation worker failed."
              : resourceLoadError(
                  "The simulation worker failed to load or run.",
                ),
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
          <span className="tiny-label">DEVELOPMENT · WORKER CHECK</span>
          <h3>Simulation worker check</h3>
        </div>
        {run && <StatusBadge status={runStatus} />}
      </div>
      <p>
        Runs the current market and investor settings with their current GM and
        CE fits. Approximate bridge hit times are weighted by CE and GM survival
        to estimate impoverishment before death within the run horizon.
      </p>
      <div className={styles.simulationForm}>
        <label>
          Paths (maximum {MAX_DEVELOPMENT_PATHS.toLocaleString("en-US")})
          <input
            type="number"
            min="1"
            max={MAX_DEVELOPMENT_PATHS}
            step="1"
            value={paths}
            onChange={(event) => setPaths(event.target.value)}
          />
        </label>
        <label>
          Maximum horizon · years
          <input
            type="number"
            min="0.01"
            step="any"
            value={horizon}
            onChange={(event) => setHorizon(event.target.value)}
          />
        </label>
        <label>
          Time step
          <select
            value={timeStep}
            onChange={(event) =>
              setTimeStep(
                event.target.value as SimulationDraft["simulation"]["timeStep"],
              )
            }
          >
            <option value="monthly">Monthly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="weekly">Weekly</option>
          </select>
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
            onChange={(event) =>
              setBatch(
                event.target.value === "auto"
                  ? "auto"
                  : (Number(event.target.value) as BatchSizeChoice),
              )
            }
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
        These controls apply only to this worker check. Market, investor and
        policy inputs are shared with Evaluation. Automatic batch size aims for
        four batches and is capped at 32,768 paths; the horizon is capped at the
        CE endpoint.
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
          {run.horizonYears !== undefined && (
            <p>
              Run horizon:{" "}
              {run.horizonYears.toLocaleString("en-US", {
                maximumFractionDigits: 6,
              })}{" "}
              years
              {run.horizonCapped && " (capped at the CE mortality endpoint)"}.
            </p>
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
              completed · {run.result.observedHits.toLocaleString("en-US")}{" "}
              approximate unconstrained bridge hits ·{" "}
              {((run.elapsedMs ?? 0) / 1000).toFixed(2)} seconds. This count is
              not a lifetime-risk estimate.
            </p>
          )}
          {run.risk && (
            <div className={styles.riskSummary}>
              <section className={styles.riskSection}>
                <h4>
                  Unconstrained mortality-weighted risk by the run horizon
                </h4>
                <div className={styles.riskTableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Mortality</th>
                        <th>Estimate</th>
                        <th>Monte Carlo SE</th>
                        <th>Approx. 95% MC interval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ["CE", run.risk.ce],
                          ["GM", run.risk.gm],
                        ] as const
                      ).map(([name, estimate]) => (
                        <tr key={name}>
                          <th scope="row">{name}</th>
                          <td>{percentage(estimate.estimate)}</td>
                          <td>
                            {estimate.standardError === null
                              ? "Not available"
                              : percentage(estimate.standardError)}
                          </td>
                          <td>{riskInterval(estimate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              {run.risk.projected && (
                <section className={styles.riskSection}>
                  <h4>Projected policy and paired differences</h4>
                  <div className={styles.riskTableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>Result</th>
                          <th>Estimate</th>
                          <th>Monte Carlo SE</th>
                          <th>Approx. 95% MC interval</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            ["CE projected", run.risk.projected.ce, false],
                            ["GM projected", run.risk.projected.gm, false],
                            [
                              "CE projected − unconstrained",
                              run.risk.projected.ceDifference,
                              true,
                            ],
                            [
                              "GM projected − unconstrained",
                              run.risk.projected.gmDifference,
                              true,
                            ],
                          ] as const
                        ).map(([name, estimate, difference]) => (
                          <tr key={name}>
                            <th scope="row">{name}</th>
                            <td>
                              {difference
                                ? `${(estimate.estimate * 100).toFixed(3)} pp`
                                : percentage(estimate.estimate)}
                            </td>
                            <td>
                              {estimate.standardError === null
                                ? "Not available"
                                : difference
                                  ? `${(estimate.standardError * 100).toFixed(3)} pp`
                                  : percentage(estimate.standardError)}
                            </td>
                            <td>
                              {difference && estimate.interval95
                                ? `${(estimate.interval95.lower * 100).toFixed(3)} pp – ${(estimate.interval95.upper * 100).toFixed(3)} pp`
                                : riskInterval(estimate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p>
                    Differences and their Monte Carlo uncertainty use matched
                    paths. The projected policy uses Euler steps and a
                    frozen-variance bridge; check time-step sensitivity.
                  </p>
                </section>
              )}
              <div className={styles.riskNotes}>
                <p>
                  Analytical CE risk over the full CE horizon:{" "}
                  {percentage(run.risk.ceBenchmark)}.
                  {run.risk.horizonYears < run.risk.ceEndpoint &&
                    " The run ends earlier, so its CE estimate is truncated and is not directly comparable to this benchmark."}
                  {run.risk.horizonYears >= run.risk.ceEndpoint &&
                    ` CE estimate minus benchmark: ${((run.risk.ce.estimate - run.risk.ceBenchmark) * 100).toFixed(3)} percentage points.`}
                </p>
                <p>
                  Intervals use a normal approximation and describe Monte Carlo
                  sampling only. They are not reported when sample variation is
                  zero or there are fewer than two paths; rare events may
                  require more paths.
                </p>
                <p>
                  Estimates exclude hits after the run horizon and depend on the
                  approximate bridge and time step. GM mortality can extend
                  beyond the CE endpoint; outcomes after the run horizon are not
                  included.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
