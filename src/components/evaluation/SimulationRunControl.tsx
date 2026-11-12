"use client";

import type { EvaluationRun } from "./useEvaluationRun";

/** Inputs and callbacks for the shared evaluation simulation control. */
interface SimulationRunControlProps {
  run: EvaluationRun | null;
  stale: boolean;
  errors: readonly string[];
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onStart: () => void;
  onCancel: () => void;
}

/** Format a batch-based remaining-time estimate for the shared run control. */
function formatRemainingTime(milliseconds: number): string {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `About ${seconds} s remaining`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `About ${minutes} min${remainder ? ` ${remainder} s` : ""} remaining`;
}

/**
 * Display simulation settings and run controls inside the setup summary.
 * Progress and the remaining-time estimate are updated after each batch.
 */
export function SimulationRunControl({
  run,
  stale,
  errors,
  settingsOpen,
  onToggleSettings,
  onStart,
  onCancel,
}: SimulationRunControlProps) {
  const running =
    run?.phase === "starting" ||
    run?.phase === "running" ||
    run?.phase === "cancelling";
  const progress = run?.progress;
  const remainingMs =
    progress && progress.completedPaths > 0 && run?.batchElapsedMs !== undefined
      ? (run.batchElapsedMs / progress.completedPaths) *
        (progress.totalPaths - progress.completedPaths)
      : null;

  return (
    <section className="simulation-control" aria-label="Simulation control">
      <div className="simulation-run-row">
        <button
          type="button"
          className="button button-light"
          aria-expanded={settingsOpen}
          aria-controls={settingsOpen ? "evaluation-settings" : undefined}
          onClick={onToggleSettings}
        >
          ☷ &nbsp; Simulation settings
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={running ? onCancel : onStart}
          disabled={run?.phase === "cancelling"}
        >
          {running ? "Cancel simulation" : "▶  Run simulation"}
        </button>
        {running && (
          <div
            className="simulation-run-progress"
            role="status"
            aria-live="polite"
          >
            <progress
              aria-label="Simulation progress"
              max={progress?.totalPaths ?? 1}
              value={progress?.completedPaths}
            />
            <div className="simulation-run-progress-labels">
              <span>
                {run?.phase === "cancelling"
                  ? "Stopping after the current batch…"
                  : progress
                    ? `${progress.completedPaths.toLocaleString("en-US")} / ${progress.totalPaths.toLocaleString("en-US")} paths`
                    : "Preparing simulation…"}
              </span>
              {run?.phase !== "cancelling" && (
                <span>
                  {remainingMs !== null && remainingMs > 0
                    ? formatRemainingTime(remainingMs)
                    : progress
                      ? "Finishing…"
                      : "ETA after the first batch"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      {errors.length > 0 && (
        <div className="simulation-run-message" role="alert">
          <strong>Check your inputs</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {run?.phase === "error" && run.message && (
        <p className="simulation-run-message" role="alert">
          {run.message}
        </p>
      )}
      {run?.phase === "cancelled" && (
        <p className="simulation-run-message" role="status">
          Simulation cancelled. No partial result was saved.
        </p>
      )}
      {run?.phase === "complete" && run.risk && (
        <details className="borrowing-details diagnostic-details">
          <summary>Settings used for this run</summary>
          {stale && (
            <p role="status">
              Inputs changed since this run. These are the settings used for its
              results.
            </p>
          )}
          <dl>
            <div>
              <dt>Policy</dt>
              <dd>
                {run.options.policy.projected
                  ? "Unconstrained and projected CE (paired)"
                  : "Unconstrained CE"}
              </dd>
            </div>
            <div>
              <dt>Annual withdrawal</dt>
              <dd>
                {run.annualWithdrawal === undefined
                  ? "—"
                  : `€${Math.round(run.annualWithdrawal).toLocaleString("en-US")} / year`}
              </dd>
            </div>
            <div>
              <dt>Starting capital / impoverishment level</dt>
              <dd>
                €{run.options.investor.initialCapital.toLocaleString("en-US")} /
                €
                {run.options.investor.impoverishmentLevel.toLocaleString(
                  "en-US",
                )}
              </dd>
            </div>
            <div>
              <dt>Mortality cohort</dt>
              <dd>
                {run.options.investor.birthYear} · retirement{" "}
                {run.options.investor.retirementYear} ·{" "}
                {run.options.investor.mortality.table} ·{" "}
                {run.options.investor.mortality.longevity}
                {run.options.investor.mortality.table === "custom" &&
                  ` · male weight ${run.options.investor.mortality.maleWeight}`}
              </dd>
            </div>
            <div>
              <dt>Market assets</dt>
              <dd>
                {run.options.market.assets
                  .map((asset) => asset.name)
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt>Paths / time step</dt>
              <dd>
                {run.options.numerical.paths.toLocaleString("en-US")} /{" "}
                {run.options.numerical.timeStep}
              </dd>
            </div>
            <div>
              <dt>Batch size / seed</dt>
              <dd>
                {run.numerical.batchSize.toLocaleString("en-US")} /{" "}
                {run.numerical.seed}
              </dd>
            </div>
          </dl>
        </details>
      )}
    </section>
  );
}
