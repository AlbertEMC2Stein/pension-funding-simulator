"use client";

import { useMemo, useRef, useState } from "react";
import { AllocationCard } from "./AllocationCard";
import { TimingCard } from "./TimingCard";
import { SimulationRunControl } from "./SimulationRunControl";
import { StatusBadge, type ResultStatus } from "../StatusBadge";
import { useEvaluationRun, type EvaluationRun } from "./useEvaluationRun";
import { FeasibilityControls } from "./FeasibilityControls";
import { useSimulationDraft } from "../SimulationDraftContext";
import {
  RiskWithdrawalChart,
  useRiskWithdrawalResult,
} from "./RiskWithdrawalChart";
import {
  evaluateGlobalFeasibility,
  feasibilityForCurrentMarket,
  type FeasibilityResult,
} from "./global-feasibility";
import { findFeasibilityThreshold } from "./feasibility-threshold";
import {
  calculateCapitalComparison,
  type CapitalComparison,
} from "./capital-comparison";
import {
  MANUAL_BATCH_SIZES,
  type BatchSizeChoice,
} from "../../lib/options/batch-size";
import {
  Metric,
  PageHeading,
  PreviewBanner,
  SectionHeading,
  TermLink,
  useDraft,
} from "../common";

/** IDs for optional evaluation cards, used as keys in the visibility state. */
type Visual =
  | "withdrawal"
  | "gm"
  | "capital"
  | "allocation"
  | "timing"
  | "borrowing"
  | "trajectories";
/** Labels and ordering for the visual-selection panel. */
const visualGroups: {
  title: string;
  entries: { id: Visual; label: string }[];
}[] = [
  {
    title: "Withdrawal & capital",
    entries: [
      { id: "withdrawal", label: "Withdrawal & risk" },
      { id: "gm", label: "Estimated GM risk" },
      { id: "capital", label: "Value of risk-taking" },
    ],
  },
  {
    title: "Portfolio & policies",
    entries: [{ id: "allocation", label: "Portfolio allocation" }],
  },
  {
    title: "Impoverishment & borrowing",
    entries: [
      { id: "timing", label: "Impoverishment timing" },
      { id: "borrowing", label: "Borrowing exposure" },
    ],
  },
  {
    title: "Other",
    entries: [{ id: "trajectories", label: "Illustrative trajectories" }],
  },
];

/**
 * Show the captured GM estimate and its CE reference without attributing an
 * unconstrained estimate to the projected policy.
 */
export function GmRiskCard({
  projected,
  run,
  stale,
  custom,
}: {
  projected: boolean;
  run: EvaluationRun | null;
  stale: boolean;
  custom: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { navigate } = useDraft();
  const running =
    run?.phase === "starting" ||
    run?.phase === "running" ||
    run?.phase === "cancelling";
  const risk = run?.risk;
  const targetMode = run
    ? run.options.policy.withdrawal.mode === "targetRisk"
    : !custom;
  const status: ResultStatus = running
    ? "running"
    : stale && risk
      ? "needs-updating"
      : run?.phase === "error"
        ? "error"
        : run?.phase === "cancelled"
          ? "cancelled"
          : risk
            ? "calculated"
            : "not-calculated";
  const difference = risk ? (risk.gm.estimate - risk.ceBenchmark) * 100 : null;
  const projectedRisk = run?.options.policy.projected
    ? risk?.projected
    : undefined;
  const projectedStatus: ResultStatus = run?.options.policy.projected
    ? projectedRisk ||
      running ||
      run.phase === "error" ||
      run.phase === "cancelled"
      ? status
      : "not-calculated"
    : "not-calculated";
  const projectedDifference =
    projectedRisk && risk
      ? (projectedRisk.gm.estimate - risk.ceBenchmark) * 100
      : null;

  return (
    <article className="chart-card diagnostic-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">
            REFERENCE MORTALITY · SIMULATION RESULT
          </span>
          <h3>
            Risk under Gompertz–Makeham mortality{" "}
            <button
              type="button"
              className="card-help"
              aria-label="Explain the GM risk card"
              onClick={() => dialog.current?.showModal()}
            >
              ?
            </button>
          </h3>
          <p className="timing-intro">
            Compare the CE-model reference with the estimated risk under the
            fitted GM model.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {stale && (
        <p role="status">
          Settings changed since this run started. Its results belong to the
          earlier settings.
        </p>
      )}
      <div className="diagnostic-metrics">
        <div>
          <span>{targetMode ? "Target risk α" : "CE-model risk"}</span>
          <strong>
            {risk ? `${(risk.ceBenchmark * 100).toFixed(3)}%` : "—"}
          </strong>
          <small>Unconstrained CE policy · full CE horizon</small>
        </div>
        <div>
          <span>Estimated GM risk</span>
          <strong>
            {risk ? `${(risk.gm.estimate * 100).toFixed(3)}%` : "—"}
          </strong>
          <small>Unconstrained policy · Monte Carlo estimate</small>
        </div>
        <div>
          <span>
            {targetMode ? "Difference from target" : "Difference from CE risk"}
          </span>
          <strong>
            {difference === null
              ? "—"
              : `${difference > 0 ? "+" : ""}${difference.toFixed(3)} pp`}
          </strong>
          <small>GM estimate minus CE reference</small>
        </div>
      </div>
      {risk && (
        <>
          <p className="chart-disclaimer">
            Approximate 95% Monte Carlo interval:{" "}
            {risk.gm.interval95
              ? `${(risk.gm.interval95.lower * 100).toFixed(3)}% – ${(risk.gm.interval95.upper * 100).toFixed(3)}%`
              : "not available for this sample"}
            . The estimate includes hits within {risk.horizonYears.toFixed(2)}{" "}
            years; GM mortality may extend beyond the CE endpoint. Bridge,
            time-step and horizon errors are not included in the interval.
          </p>
        </>
      )}
      {projected && (
        <div className="projection-risk-result">
          <div className="result-subheading">
            <span className="tiny-label">
              PROJECTED POLICY · PAIRED COMPARISON
            </span>
            <StatusBadge status={projectedStatus} />
          </div>
          <div className="diagnostic-metrics">
            <div>
              <span>Estimated projected GM risk</span>
              <strong>
                {projectedRisk
                  ? `${(projectedRisk.gm.estimate * 100).toFixed(3)}%`
                  : "—"}
              </strong>
              <small>Projected policy · Monte Carlo estimate</small>
            </div>
            <div>
              <span>Projection contribution</span>
              <strong>
                {projectedRisk
                  ? `${projectedRisk.gmDifference.estimate > 0 ? "+" : ""}${(projectedRisk.gmDifference.estimate * 100).toFixed(3)} pp`
                  : "—"}
              </strong>
              <small>Projected minus unconstrained GM risk</small>
            </div>
            <div>
              <span>
                {targetMode
                  ? "Total difference from target"
                  : "Total difference from CE risk"}
              </span>
              <strong>
                {projectedDifference === null
                  ? "—"
                  : `${projectedDifference > 0 ? "+" : ""}${projectedDifference.toFixed(3)} pp`}
              </strong>
              <small>Projected GM risk minus unconstrained CE reference</small>
            </div>
          </div>
          {projectedRisk ? (
            <p className="chart-disclaimer">
              Approximate 95% Monte Carlo intervals: projected GM risk{" "}
              {projectedRisk.gm.interval95
                ? `${(projectedRisk.gm.interval95.lower * 100).toFixed(3)}% – ${(projectedRisk.gm.interval95.upper * 100).toFixed(3)}%`
                : "not available for this sample"}
              ; paired difference{" "}
              {projectedRisk.gmDifference.interval95
                ? `${(projectedRisk.gmDifference.interval95.lower * 100).toFixed(3)} pp – ${(projectedRisk.gmDifference.interval95.upper * 100).toFixed(3)} pp`
                : "not available for this sample"}
              . The projected policy uses Euler steps and a frozen-variance
              bridge; time-step and bridge errors are not included in the
              intervals.
            </p>
          ) : (
            <p className="chart-disclaimer">
              Paired estimates and their uncertainty will be shown after a
              projected-policy run.
            </p>
          )}
        </div>
      )}
      {!projected && (
        <p className="chart-disclaimer">
          When projection is selected, a paired policy comparison will also
          appear here. Estimates depend on the model and are not known future
          risks.
        </p>
      )}
      <dialog
        ref={dialog}
        className="help-dialog"
        aria-labelledby="gm-help-title"
      >
        <div className="help-dialog-heading">
          <div>
            <span className="tiny-label">UNDERSTANDING THIS CARD</span>
            <h2 id="gm-help-title">Risk under GM mortality</h2>
          </div>
          <button
            type="button"
            className="close-settings"
            aria-label="Close help"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p>
          This card compares the CE-model risk with an estimate using the fitted
          Gompertz–Makeham mortality model. If a withdrawal amount was entered
          directly, the CE value is its model-implied risk.
        </p>
        <p>
          If projection is selected, the comparison also shows how projected and
          unprojected policies differ. Results are model-based estimates, not
          guaranteed outcomes.
        </p>
        <button
          type="button"
          className="term-link"
          onClick={() => {
            dialog.current?.close();
            navigate("help", "gm-risk");
          }}
        >
          Read the GM risk dictionary entry ↗
        </button>
      </dialog>
    </article>
  );
}

/** Show capital needed at nearby CE risk levels for the same withdrawal. */
export function CapitalCard({ comparison }: { comparison: CapitalComparison }) {
  const available = "rows" in comparison;
  const relief = available
    ? comparison.zeroRisk
      ? Math.max(0, comparison.initialCapital - comparison.safeCapital)
      : comparison.safeCapital - comparison.initialCapital
    : null;

  /** Format real euro amounts consistently across the comparison. */
  function euros(amount: number): string {
    return `€${Math.round(amount).toLocaleString("en-US")}`;
  }

  return (
    <article className="chart-card capital-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">
            THE VALUE OF RISK-TAKING · UNCONSTRAINED POLICY
          </span>
          <h3>What does accepting risk change?</h3>
          <p className="timing-intro">
            Compare your starting capital with the amount needed without
            investment risk for your setup&apos;s annual withdrawal.
          </p>
        </div>
        <StatusBadge status={available ? "calculated" : "not-available"} />
      </div>
      {!available ? (
        <p role="status">{comparison.message}</p>
      ) : (
        <>
          <p className="timing-intro">
            Annual withdrawal used: {euros(comparison.annualWithdrawal)} / year
          </p>
          <div className="capital-summary">
            <div>
              <span>Capital needed without risk-taking</span>
              <strong>{euros(comparison.safeCapital)}</strong>
              <small>
                <TermLink term="safe-boundary">Safe boundary</TermLink> at
                retirement
              </small>
            </div>
            <div>
              <span>Starting capital</span>
              <strong>{euros(comparison.initialCapital)}</strong>
              <small>The initial capital in your setup</small>
            </div>
            <div>
              <span>
                {comparison.zeroRisk ? "Capital surplus" : "Capital relief"}
              </span>
              <strong>{euros(relief!)}</strong>
              <small>
                {((relief! / comparison.safeCapital) * 100).toFixed(2)}% of
                capital needed without risk-taking
              </small>
            </div>
          </div>
          <div className="capital-table-wrap">
            <table className="capital-table">
              <thead>
                <tr>
                  <th>CE lifetime risk</th>
                  <th>Capital required</th>
                  <th>Change from starting capital</th>
                </tr>
              </thead>
              <tbody key={comparison.zeroRisk ? "zero-risk" : "positive-risk"}>
                {comparison.rows.map((row) => (
                  <tr key={`${row.label}/${row.risk}`}>
                    <td>
                      {row.label} <span>({(row.risk * 100).toFixed(2)}%)</span>
                    </td>
                    <td>
                      {row.capital === null
                        ? "Not available"
                        : euros(row.capital)}
                    </td>
                    <td>
                      {row.difference === null
                        ? "—"
                        : row.difference === 0
                          ? euros(0)
                          : `${row.difference > 0 ? "+" : "−"}${euros(Math.abs(row.difference))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-disclaimer">
            Unconstrained CE model · annual withdrawal is held fixed. Changes
            are relative to your starting capital; a target at or above 100% is
            outside the supported range.
            {comparison.zeroRisk &&
              " Your starting capital may exceed the minimum without risk-taking."}
          </p>
        </>
      )}
    </article>
  );
}

/** Show unconstrained borrowing diagnostics or explain why projection excludes borrowing. */
export function BorrowingCard({
  feasibility,
  projected,
  run,
  stale,
}: {
  feasibility: FeasibilityResult;
  projected: boolean;
  run: EvaluationRun | null;
  stale: boolean;
}) {
  const hasNegativeMerton = feasibility.status === "negative-merton";
  const analyticalZero = feasibility.status === "feasible";
  const occupation = analyticalZero ? undefined : run?.borrowingOccupation;
  const probability = analyticalZero ? undefined : run?.borrowingProbability;
  const running =
    run?.phase === "starting" ||
    run?.phase === "running" ||
    run?.phase === "cancelling";
  const status: ResultStatus =
    projected || hasNegativeMerton
      ? "not-available"
      : analyticalZero
        ? "calculated"
        : running
          ? "running"
          : stale && occupation
            ? "needs-updating"
            : run?.phase === "error"
              ? "error"
              : run?.phase === "cancelled"
                ? "cancelled"
                : occupation
                  ? "calculated"
                  : "not-calculated";

  return (
    <article className="chart-card borrowing-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">UNCONSTRAINED POLICY</span>
          <h3>Borrowing exposure</h3>
          <p className="timing-intro">
            Explore the chance that your portfolio borrows and how long
            borrowing may last.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {projected ? (
        <p role="status">
          This diagnostic is available for the unconstrained policy only. Turn
          off projection to view it. The projected policy prevents borrowing by
          keeping allocations within the simplex.
        </p>
      ) : hasNegativeMerton ? (
        <p role="status">
          This diagnostic is unavailable because a Merton-vector component is
          negative. The unconstrained strategy requires short selling whenever
          wealth is below the safe boundary, so it is not globally
          simplex-feasible.
        </p>
      ) : (
        <>
          <div className="borrowing-metrics">
            <Metric
              label="Probability of ever borrowing"
              value={
                analyticalZero
                  ? "0%"
                  : probability
                    ? `${(100 * probability.estimate).toFixed(2)}%`
                    : "—"
              }
              note="While alive and before impoverishment or the run horizon"
            />
            <Metric
              label="Expected time borrowing"
              value={
                analyticalZero
                  ? "0 years"
                  : occupation
                    ? `${occupation.estimateYears.toFixed(2)} years`
                    : "—"
              }
              note="Average time alive while borrowing before impoverishment or the run horizon"
            />
          </div>
          <details className="borrowing-details">
            <summary>View borrowing diagnostics</summary>
            <dl>
              {[
                [
                  "Global simplex feasibility",
                  feasibility.status === "feasible"
                    ? "Feasible"
                    : feasibility.status === "unavailable"
                      ? "Not available"
                      : "Not feasible",
                ],
                [
                  "Relative bandwidth multiplier ζ",
                  "zeta" in feasibility
                    ? `${feasibility.zeta.toPrecision(6)} (${feasibility.zeta <= 1 ? "≤" : ">"} 1)`
                    : "—",
                ],
                [
                  "Ever-borrowing MC standard error",
                  probability?.standardError != null
                    ? `${(100 * probability.standardError).toFixed(3)}%`
                    : "—",
                ],
                [
                  "Ever-borrowing 95% MC interval",
                  probability?.interval95
                    ? `${(100 * probability.interval95.lower).toFixed(3)}% – ${(100 * probability.interval95.upper).toFixed(3)}%`
                    : "—",
                ],
                [
                  "Borrowing time MC standard error",
                  occupation?.standardErrorYears != null
                    ? `${occupation.standardErrorYears.toFixed(3)} years`
                    : "—",
                ],
                [
                  "Borrowing time 95% MC interval",
                  occupation?.interval95Years
                    ? `${occupation.interval95Years.lower.toFixed(3)} – ${occupation.interval95Years.upper.toFixed(3)} years`
                    : "—",
                ],
                ["Borrowing at retirement", "Not evaluated"],
                ["Last possible borrowing time", "—"],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt>{a}</dt>
                  <dd>{b}</dd>
                </div>
              ))}
            </dl>
            <p>{feasibility.message}</p>
            <p>
              Where the model assumptions apply, ζ &gt; 1 indicates that the
              relative bandwidth exceeds the global no-borrowing threshold.
              Possibility does not imply borrowing on a particular path.
            </p>
            <p>
              {analyticalZero
                ? "Both zeros follow analytically from global feasibility, so Monte Carlo uncertainty does not apply."
                : "Monte Carlo intervals describe sampling uncertainty only; they do not cover numerical approximation or horizon effects."}
            </p>
          </details>
          <p className="chart-disclaimer">
            {analyticalZero ? (
              "The globally feasible unconstrained policy does not borrow. Both values are analytical and do not require a simulation."
            ) : (
              <>
                {occupation
                  ? "Borrowing time uses interpolated crossings and GM survival; short excursions can be missed. Monte Carlo uncertainty does not include time-step or bridge error."
                  : "Borrowing time has not been calculated. The global feasibility diagnostic is analytical when available."}{" "}
                {probability
                  ? "First borrowing uses a single-boundary bridge that does not condition on impoverishment or use a first-passage bridge."
                  : "The probability of ever borrowing is not calculated yet."}
              </>
            )}
          </p>
        </>
      )}
    </article>
  );
}

/**
 * Evaluation dashboard and its local display controls. Scenario summary,
 * The CE chart is analytical; remaining result cards and Run simulation are placeholders.
 */
export function Evaluation() {
  const { navigate } = useDraft();
  const { draft, setDraft } = useSimulationDraft();
  const { run, errors, stale, start, cancel } = useEvaluationRun();
  const ceResult = useRiskWithdrawalResult();
  const feasibility = useMemo(
    () =>
      feasibilityForCurrentMarket(
        draft.market,
        evaluateGlobalFeasibility(ceResult),
      ),
    [draft.market, ceResult],
  );
  const assetNames = useMemo(
    () => draft.market.assets.map((asset) => asset.name.trim()),
    [draft.market.assets],
  );
  const feasibilityThreshold = findFeasibilityThreshold(ceResult);
  const simulation = draft.simulation;
  /** Merge a partial control edit into the shared simulation draft while retaining the other settings. */
  function updateSimulation(change: Partial<typeof simulation>) {
    setDraft((current) => ({
      ...current,
      simulation: { ...current.simulation, ...change },
    }));
  }
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const projected = simulation.projected;
  // Keep both draft inputs when switching modes; neither triggers a calculation.
  const custom = simulation.withdrawalMode === "customAmount";
  const target = simulation.targetRiskPercent;
  const withdrawal = simulation.withdrawalEuros;
  // Default visible cards; wealth trajectories and timing are opt-in.
  const [visuals, setVisuals] = useState<Record<Visual, boolean>>({
    withdrawal: true,
    gm: true,
    capital: true,
    allocation: true,
    timing: false,
    borrowing: true,
    trajectories: false,
  });

  return (
    <section className="view active">
      <PageHeading
        eyebrow="YOUR RETIREMENT, EXPLORED"
        title="See the bigger picture"
        description="Explore how your choices shape the path ahead."
      />
      <PreviewBanner>
        <strong>You&apos;re exploring a design draft.</strong> The CE withdrawal
        chart, allocation, capital comparison and feasibility diagnostic use
        your current inputs. The GM risk card shows the latest simulation when
        available; other results remain illustrative placeholders.
      </PreviewBanner>
      <div
        className={`workspace-grid ${settingsOpen ? "" : "settings-closed"}`}
      >
        <div className="evaluation-content">
          <div className="scenario-strip">
            <div className="scenario-intro">
              <span className="tiny-label">YOUR SETUP</span>
              <strong>
                A thoughtful start <span>✳</span>
              </strong>
            </div>
            <div className="scenario-item">
              <span>Retirement age</span>
              <strong>
                {/^\d{4}$/.test(draft.investor.birthYear) &&
                /^\d{4}$/.test(draft.investor.retirementYear)
                  ? Number(draft.investor.retirementYear) -
                    Number(draft.investor.birthYear)
                  : "—"}{" "}
                <small>years</small>
              </strong>
            </div>
            <div className="scenario-item">
              <span>Starting capital</span>
              <strong>€{draft.investor.initialCapital || "—"}</strong>
            </div>
            <div className="scenario-item">
              <span>Impoverishment level</span>
              <strong>€{draft.investor.impoverishmentLevel || "—"}</strong>
            </div>
            <div className="scenario-item">
              <span>{custom ? "Annual withdrawal" : "Target risk"}</span>
              <strong>
                {custom
                  ? `€${withdrawal.toLocaleString("en-US")}`
                  : `${target.toFixed(1)}%`}
              </strong>
            </div>
            <button
              className="button button-light scenario-edit"
              type="button"
              onClick={() => navigate("setup")}
            >
              Edit setup
            </button>
            <SimulationRunControl
              run={run}
              stale={stale}
              errors={errors}
              settingsOpen={settingsOpen}
              onToggleSettings={() => setSettingsOpen(!settingsOpen)}
              onStart={start}
              onCancel={cancel}
            />
          </div>
          <SectionHeading
            eyebrow="01 / THE DECISION"
            title="Withdrawal & risk"
            description="Find a balance that feels right for your retirement."
          >
            <button
              type="button"
              className="button button-light"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen(!pickerOpen)}
            >
              ◫ &nbsp; Customize visuals
            </button>
          </SectionHeading>
          {pickerOpen && (
            <div className="visual-options visual-picker">
              <div className="visual-picker-heading">
                <strong>Choose your visuals</strong>
                <p>
                  Show the views you want to explore. Your choices only affect
                  the layout.
                </p>
              </div>
              <div className="visual-picker-groups">
                {visualGroups.map((group) => (
                  <fieldset key={group.title}>
                    <legend>{group.title}</legend>
                    {group.entries.map((entry) => (
                      <label key={entry.id}>
                        <input
                          type="checkbox"
                          checked={visuals[entry.id]}
                          onChange={(event) =>
                            setVisuals({
                              ...visuals,
                              [entry.id]: event.target.checked,
                            })
                          }
                        />{" "}
                        {entry.label}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
              <p className="visual-picker-note">
                Mortality fit is shown in Investor & mortality. The CE chart,
                allocation, capital comparison and global feasibility are
                calculated when available. GM risk is estimated when a
                simulation completes. The timing view uses the same run; other
                unfinished visuals remain illustrative placeholders.
              </p>
            </div>
          )}
          {visuals.withdrawal && <RiskWithdrawalChart result={ceResult} />}
          {visuals.capital && (
            <CapitalCard
              comparison={calculateCapitalComparison(ceResult, projected)}
            />
          )}
          {visuals.gm && (
            <GmRiskCard
              projected={projected}
              run={run}
              stale={stale}
              custom={custom}
            />
          )}
          <div className="lower-grid">
            {visuals.allocation && (
              <AllocationCard
                result={ceResult}
                projected={projected}
                assetNames={assetNames}
              />
            )}
            {visuals.trajectories && (
              <article className="small-card">
                <div className="card-heading">
                  <div>
                    <span className="tiny-label">OPTIONAL VISUAL</span>
                    <h3>Illustrative trajectories</h3>
                  </div>
                  <StatusBadge status="not-calculated" />
                </div>
                <p>Sample paths can be displayed here when enabled.</p>
                <div className="empty-visual">﹏　﹋　﹏</div>
                <div className="small-note">Placeholder · not a simulation</div>
              </article>
            )}
          </div>
          {(visuals.timing || visuals.borrowing) && (
            <section className="risk-section">
              <SectionHeading
                eyebrow="02 / UNDERSTANDING EXPOSURE"
                title="Impoverishment & borrowing"
                description={
                  projected
                    ? "Explore possible outcomes for the selected policy."
                    : "Explore possible outcomes and the borrowing exposure of the unconstrained policy."
                }
              />
              <div className="risk-section-grid">
                {visuals.timing && (
                  <TimingCard run={run} stale={stale} projected={projected} />
                )}
                {visuals.borrowing && (
                  <BorrowingCard
                    feasibility={feasibility}
                    projected={projected}
                    run={run}
                    stale={stale}
                  />
                )}
              </div>
            </section>
          )}
        </div>
        {settingsOpen && (
          <aside id="evaluation-settings" className="settings-panel">
            <div className="settings-heading">
              <div>
                <span className="tiny-label">MAKE IT YOURS</span>
                <h2>Simulation settings</h2>
              </div>
              <button
                type="button"
                className="close-settings"
                aria-label="Close simulation settings"
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="settings-lead">
              Adjust the details behind your view.
            </p>
            <div className="settings-group">
              <div className="group-title">
                <span>01</span> Withdrawal approach
              </div>
              <div className="segmented">
                <button
                  type="button"
                  className={!custom ? "selected" : ""}
                  aria-pressed={!custom}
                  onClick={() =>
                    updateSimulation({ withdrawalMode: "targetRisk" })
                  }
                >
                  Target risk
                </button>
                <button
                  type="button"
                  className={custom ? "selected" : ""}
                  aria-pressed={custom}
                  onClick={() =>
                    updateSimulation({ withdrawalMode: "customAmount" })
                  }
                >
                  Custom amount
                </button>
              </div>
              <label className="field-label" htmlFor="withdrawal-slider">
                {custom ? "Annual withdrawal" : "Target lifetime risk"}{" "}
                <b>
                  {custom
                    ? `€${withdrawal.toLocaleString("en-US")}`
                    : `${target.toFixed(1)}%`}
                </b>
              </label>
              <input
                id="withdrawal-slider"
                type="range"
                min={custom ? 5000 : 1}
                max={custom ? 60000 : 20}
                step={custom ? 500 : 0.5}
                value={custom ? withdrawal : target}
                onChange={(event) =>
                  custom
                    ? updateSimulation({
                        withdrawalEuros: Number(event.target.value),
                      })
                    : updateSimulation({
                        targetRiskPercent: Number(event.target.value),
                      })
                }
              />
              <div className="range-ends">
                <span>Lower {custom ? "withdrawal" : "risk"}</span>
                <span>Higher {custom ? "withdrawal" : "risk"}</span>
              </div>
              <div className="setting-callout withdrawal-callout">
                <span aria-hidden="true">✳</span>
                <div>
                  <strong>
                    {custom ? "Model-implied risk" : "Model-derived withdrawal"}
                  </strong>
                  <div className="withdrawal-value">
                    {"data" in ceResult
                      ? custom
                        ? (ceResult.data.selectedRisk * 100).toFixed(2)
                        : `€${Math.round(ceResult.data.selectedWithdrawal).toLocaleString("en-US")}`
                      : "—"}{" "}
                    <small>{custom ? "%" : "/ year"}</small>
                  </div>
                  <span className="withdrawal-status" role="status">
                    {"data" in ceResult
                      ? "Unconstrained CE model"
                      : ceResult.message}
                  </span>
                </div>
              </div>
            </div>
            <div className="settings-group">
              <div className="group-title">
                <span>02</span> Portfolio policy
              </div>
              <label className="check-card">
                <input
                  type="checkbox"
                  checked={projected}
                  onChange={(event) =>
                    updateSimulation({ projected: event.target.checked })
                  }
                />
                <span>
                  <strong>Apply projected policy</strong>
                  <small>Keep allocations long-only and avoid borrowing.</small>
                </span>
              </label>
              <div className="info-line">
                ⓘ &nbsp; <TermLink term="projection">Projection</TermLink> is a
                feasible comparison policy.
              </div>
              <FeasibilityControls
                projected={projected}
                custom={custom}
                feasibility={feasibility}
                threshold={feasibilityThreshold}
                onApply={(value) =>
                  setDraft((current) => ({
                    ...current,
                    investor: {
                      ...current.investor,
                      impoverishmentLevel: value,
                    },
                  }))
                }
              />
            </div>
            <div className="settings-group">
              <div className="group-title">
                <span>03</span> Simulation detail
              </div>
              <label className="field-label" htmlFor="paths">
                Number of paths
              </label>
              <select
                id="paths"
                value={simulation.paths}
                onChange={(event) =>
                  updateSimulation({ paths: Number(event.target.value) })
                }
              >
                <option value={10000}>10,000 paths</option>
                <option value={5000}>5,000 paths</option>
                <option value={50000}>50,000 paths</option>
                <option value={100000}>100,000 paths</option>
              </select>
              <label className="field-label" htmlFor="step">
                Time step
              </label>
              <select
                id="step"
                value={simulation.timeStep}
                onChange={(event) =>
                  updateSimulation({
                    timeStep: event.target.value as typeof simulation.timeStep,
                  })
                }
              >
                <option value="monthly">Monthly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="weekly">Weekly</option>
              </select>
              <label className="field-label" htmlFor="batch-size">
                Batch size
              </label>
              <select
                id="batch-size"
                value={simulation.batchSize}
                onChange={(event) =>
                  updateSimulation({
                    batchSize:
                      event.target.value === "auto"
                        ? "auto"
                        : (Number(event.target.value) as BatchSizeChoice),
                  })
                }
              >
                <option value="auto">Automatic</option>
                {MANUAL_BATCH_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size.toLocaleString("en-US")}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-footer">
              ◷ &nbsp; The CE chart responds to relevant settings.
              <br />
              <small>Run the simulation to estimate GM risk.</small>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
