"use client";

import { useLanguage } from "../LanguageContext";
import {
  simulationRunMessages,
  type SimulationRunMessages,
} from "../../lib/i18n/simulation-run";
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
function formatRemainingTime(
  milliseconds: number,
  text: SimulationRunMessages,
): string {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${text.about} ${seconds} s ${text.remaining}`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${text.about} ${minutes} min${remainder ? ` ${remainder} s` : ""} ${text.remaining}`;
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
  const { language } = useLanguage();
  const text = simulationRunMessages[language];
  const locale = language === "de" ? "de-DE" : "en-US";
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
    <section
      className="simulation-control"
      aria-label={text.control}
      lang={language}
    >
      <div className="simulation-run-row">
        <button
          type="button"
          className="button button-light"
          aria-expanded={settingsOpen}
          aria-controls={settingsOpen ? "evaluation-settings" : undefined}
          onClick={onToggleSettings}
        >
          ☷ &nbsp; {text.settings}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={running ? onCancel : onStart}
          disabled={run?.phase === "cancelling"}
        >
          {running ? text.cancel : text.run}
        </button>
        {running && (
          <div
            className="simulation-run-progress"
            role="status"
            aria-live="polite"
          >
            <progress
              aria-label={text.progress}
              max={progress?.totalPaths ?? 1}
              value={progress?.completedPaths}
            />
            <div className="simulation-run-progress-labels">
              <span>
                {run?.phase === "cancelling"
                  ? text.stopping
                  : progress
                    ? `${progress.completedPaths.toLocaleString(locale)} / ${progress.totalPaths.toLocaleString(locale)} ${text.paths}`
                    : text.preparing}
              </span>
              {run?.phase !== "cancelling" && (
                <span>
                  {remainingMs !== null && remainingMs > 0
                    ? formatRemainingTime(remainingMs, text)
                    : progress
                      ? text.finishing
                      : text.etaAfterBatch}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      {errors.length > 0 && (
        <div className="simulation-run-message" role="alert">
          <strong>{text.checkInputs}</strong>
          <ul lang="en">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {run?.phase === "error" && run.message && (
        <p className="simulation-run-message" role="alert" lang="en">
          {run.message}
        </p>
      )}
      {run?.phase === "cancelled" && (
        <p className="simulation-run-message" role="status">
          {text.cancelled}
        </p>
      )}
      {run?.phase === "complete" && run.risk && (
        <details className="borrowing-details diagnostic-details">
          <summary>{text.usedSettings}</summary>
          {stale && <p role="status">{text.stale}</p>}
          <dl>
            <div>
              <dt>{text.policy}</dt>
              <dd>
                {run.options.policy.projected
                  ? text.pairedPolicy
                  : text.unconstrained}
              </dd>
            </div>
            <div>
              <dt>{text.withdrawal}</dt>
              <dd>
                {run.annualWithdrawal === undefined
                  ? "—"
                  : `€${Math.round(run.annualWithdrawal).toLocaleString(locale)} ${text.perYear}`}
              </dd>
            </div>
            <div>
              <dt>{text.wealth}</dt>
              <dd>
                €{run.options.investor.initialCapital.toLocaleString(locale)} /
                €
                {run.options.investor.impoverishmentLevel.toLocaleString(
                  locale,
                )}
              </dd>
            </div>
            <div>
              <dt>{text.cohort}</dt>
              <dd>
                {run.options.investor.birthYear} · {text.retirement}{" "}
                {run.options.investor.retirementYear} ·{" "}
                {text.sex[run.options.investor.mortality.table]} ·{" "}
                {text.longevity[run.options.investor.mortality.longevity]}
                {run.options.investor.mortality.table === "custom" &&
                  ` · ${text.maleWeight} ${run.options.investor.mortality.maleWeight}`}
              </dd>
            </div>
            <div>
              <dt>{text.market}</dt>
              <dd>
                {run.options.market.assets
                  .map((asset) => asset.name)
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt>{text.pathsStep}</dt>
              <dd>
                {run.options.numerical.paths.toLocaleString(locale)} /{" "}
                {text.step[run.options.numerical.timeStep]}
              </dd>
            </div>
            <div>
              <dt>{text.batchSeed}</dt>
              <dd>
                {run.numerical.batchSize.toLocaleString(locale)} /{" "}
                {run.numerical.seed}
              </dd>
            </div>
          </dl>
        </details>
      )}
    </section>
  );
}
