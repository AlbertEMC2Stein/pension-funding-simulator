"use client";

import { useMemo, useRef, useState } from "react";
import { AllocationCard } from "./AllocationCard";
import { useEvaluationRun, type EvaluationRun } from "./useEvaluationRun";
import { FeasibilityControls } from "./FeasibilityControls";
import { useSimulationDraft } from "../SimulationDraftContext";
import {
  RiskWithdrawalChart,
  useRiskWithdrawalResult,
} from "./RiskWithdrawalChart";
import {
  evaluateGlobalFeasibility,
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
  const status = running
    ? "RUNNING"
    : stale && risk
      ? "NEEDS UPDATING"
      : run?.phase === "error"
        ? "ERROR"
        : run?.phase === "cancelled"
          ? "CANCELLED"
          : risk
            ? "CALCULATED"
            : "NOT CALCULATED";
  const difference = risk ? (risk.gm.estimate - risk.ceBenchmark) * 100 : null;
  const remainingMs =
    run?.progress && run.batchElapsedMs !== undefined
      ? (run.batchElapsedMs / run.progress.completedPaths) *
        (run.progress.totalPaths - run.progress.completedPaths)
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
        <span className="chip">{status}</span>
      </div>
      {running && (
        <div className="risk-run-progress" role="status">
          <span className="risk-spinner" aria-hidden="true" />
          {run?.phase === "cancelling"
            ? "Stopping after the current batch…"
            : run?.progress
              ? `${run.progress.completedPaths.toLocaleString("en-US")} / ${run.progress.totalPaths.toLocaleString("en-US")} paths${remainingMs !== null && remainingMs > 0 ? ` · approximately ${Math.max(1, Math.ceil(remainingMs / 1000))} seconds remaining` : ""}`
              : "Preparing simulation…"}
        </div>
      )}
      {stale && (
        <p role="status">
          Settings changed since this run started. Its results belong to the
          earlier settings.
        </p>
      )}
      {run?.message && <p role="alert">{run.message}</p>}
      {run?.phase === "cancelled" && (
        <p role="status">The simulation was cancelled.</p>
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
          {run && (
            <details className="borrowing-details diagnostic-details">
              <summary>Settings used for this run</summary>
              <dl>
                <div>
                  <dt>Policy</dt>
                  <dd>Unconstrained CE</dd>
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
                    €
                    {run.options.investor.initialCapital.toLocaleString(
                      "en-US",
                    )}{" "}
                    / €
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
        </>
      )}
      {projected && (
        <div className="projection-risk-result">
          <div className="result-subheading">
            <span className="tiny-label">
              PROJECTED POLICY · PAIRED COMPARISON
            </span>
            <span className="chip">NOT CALCULATED</span>
          </div>
          <div className="diagnostic-metrics">
            <Metric
              label="Estimated projected GM risk"
              note="Monte Carlo estimate"
            />
            <Metric
              label="Projection contribution"
              note="Projected minus unconstrained GM risk · percentage points"
            />
            <Metric
              label="Total difference from target"
              note="Projected GM risk minus α · percentage points"
            />
          </div>
          <p className="chart-disclaimer">
            Paired estimates and their uncertainty will be shown after a run.
          </p>
        </div>
      )}
      <p className="chart-disclaimer">
        When projection is selected, a paired policy comparison will also appear
        here. Estimates depend on the model and are not known future risks.
      </p>
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
        <span className="chip">
          {available ? "CALCULATED" : "NOT AVAILABLE"}
        </span>
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

/**
 * Demonstrate the age, perspective and chart-type controls using fixed SVG
 * shapes. The conditional curve and probabilities are not calculated yet.
 */
function TimingCard() {
  const [age, setAge] = useState(67);
  const [conditional, setConditional] = useState(false);
  const [cumulative, setCumulative] = useState(false);
  // Map the example age range 67–100 to the SVG's horizontal span 48–735.
  // These numbers describe the mock chart coordinates, not model parameters.
  const x = 48 + ((age - 67) / 33) * 687;

  return (
    <article className="chart-card timing-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">OPTIONAL VISUAL</span>
          <h3>When might impoverishment occur?</h3>
          <p className="timing-intro">
            Explore risk across attained ages under the selected policy and
            mortality assumptions.
          </p>
        </div>
        <span className="chip">NOT CALCULATED</span>
      </div>
      <div className="timing-controls">
        <fieldset>
          <legend>Perspective</legend>
          <div className="segmented timing-switch">
            <button
              type="button"
              className={!conditional ? "selected" : ""}
              aria-pressed={!conditional}
              onClick={() => setConditional(false)}
            >
              Forecast
            </button>
            <button
              type="button"
              className={conditional ? "selected" : ""}
              aria-pressed={conditional}
              onClick={() => setConditional(true)}
            >
              Conditional update
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>Chart</legend>
          <div className="segmented timing-switch">
            <button
              type="button"
              className={!cumulative ? "selected" : ""}
              aria-pressed={!cumulative}
              onClick={() => setCumulative(false)}
            >
              Density
            </button>
            <button
              type="button"
              className={cumulative ? "selected" : ""}
              aria-pressed={cumulative}
              onClick={() => setCumulative(true)}
            >
              Cumulative
            </button>
          </div>
        </fieldset>
      </div>
      <div className="timing-chart">
        <svg
          viewBox="0 0 760 210"
          role="img"
          aria-label={`Illustrative ${cumulative ? "cumulative probability" : "density"} by attained age`}
        >
          <defs>
            <clipPath id="timing-tail">
              <rect x={x} y="0" width={735 - x} height="180" />
            </clipPath>
          </defs>
          <g className="timing-grid">
            <path d="M48 30H735 M48 78H735 M48 126H735 M48 174H735" />
          </g>
          {cumulative ? (
            <path
              className="timing-curve"
              d="M48 174 C150 172 220 157 290 125 C365 90 430 59 505 47 C580 37 655 34 735 34"
            />
          ) : (
            <>
              <path
                className="timing-tail"
                clipPath="url(#timing-tail)"
                d="M48 174 C140 171 200 159 267 116 C335 66 390 51 445 70 C512 93 570 141 635 162 C680 172 710 174 735 174 L735 174 Z"
              />
              <path
                className="timing-curve"
                d="M48 174 C140 171 200 159 267 116 C335 66 390 51 445 70 C512 93 570 141 635 162 C680 172 710 174 735 174"
              />
            </>
          )}
          <line className="timing-age-line" x1={x} x2={x} y1="25" y2="174" />
          <g className="timing-axis">
            <text x="48" y="198">
              67
            </text>
            <text x="360" y="198">
              82
            </text>
            <text x="710" y="198">
              100
            </text>
          </g>
        </svg>
        <div className="chart-foot">
          <span>{cumulative ? "CUMULATIVE PROBABILITY" : "DENSITY"}</span>
          <span>ATTAINED AGE →</span>
        </div>
      </div>
      <label className="field-label timing-age-label" htmlFor="timing-age">
        Selected age <b>{age} years</b>
      </label>
      <input
        id="timing-age"
        className="timing-age-slider"
        type="range"
        min="67"
        max="100"
        value={age}
        onChange={(event) => setAge(Number(event.target.value))}
      />
      <p className="timing-explanation">
        {conditional
          ? "Conditional update: risk after the selected age, given survival without impoverishment to that age. The actual conditional curve requires calculation."
          : cumulative
            ? "Forecast: the curve would show the cumulative probability of impoverishment before death by each age, assessed at retirement."
            : "Forecast: the shaded tail represents impoverishment after the selected age and before death, assessed at retirement."}
      </p>
      <p className="chart-disclaimer">
        Illustrative shapes only. Switching views demonstrates the layout; no
        risk or conditional density is calculated.
      </p>
    </article>
  );
}

/** Display analytical global feasibility alongside borrowing simulation placeholders. */
function BorrowingCard({ feasibility }: { feasibility: FeasibilityResult }) {
  return (
    <article className="chart-card borrowing-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">UNPROJECTED POLICY</span>
          <h3>Borrowing exposure</h3>
          <p className="timing-intro">
            Borrowing is possible when the risky allocation requires a negative
            risk-free position.
          </p>
        </div>
        <span className="chip">NOT CALCULATED</span>
      </div>
      <div className="borrowing-metrics">
        <Metric
          label="Probability of ever borrowing"
          note="While alive and before impoverishment"
        />
        <Metric
          label="Expected time borrowing"
          note="Total time alive while borrowing"
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
          Simulation uncertainty and numerical approximations will be reported
          with calculated results. Some diagnostics require additional
          assumptions.
        </p>
      </details>
      <p className="chart-disclaimer">
        Borrowing exposure is not calculated yet. The global feasibility
        diagnostic is analytical when available.
      </p>
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
  const { run, errors, stale, running, start, cancel } = useEvaluationRun();
  const ceResult = useRiskWithdrawalResult();
  const feasibility = evaluateGlobalFeasibility(ceResult);
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
      >
        <div className="heading-actions">
          <button
            type="button"
            className="button button-light"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            ☷ &nbsp; Simulation settings
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={start}
          >
            ▶ &nbsp; {running ? "Run again" : "Run simulation"}
          </button>
          {running && (
            <button
              type="button"
              className="button button-light"
              disabled={run?.phase === "cancelling"}
              onClick={cancel}
            >
              Cancel run
            </button>
          )}
        </div>
      </PageHeading>
      <PreviewBanner>
        <strong>You&apos;re exploring a design draft.</strong> The CE withdrawal
        chart, allocation, capital comparison and feasibility diagnostic use
        your current inputs. The GM risk card shows the latest simulation when
        available; other results remain illustrative placeholders.
      </PreviewBanner>
      {errors.length > 0 && (
        <div className="form-card" role="alert">
          <strong>Check your inputs</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {running && !visuals.gm && (
        <div className="form-card risk-run-progress" role="status">
          <span className="risk-spinner" aria-hidden="true" />
          {run?.phase === "cancelling"
            ? "Stopping after the current batch…"
            : run?.progress
              ? `Simulating ${run.progress.completedPaths.toLocaleString("en-US")} / ${run.progress.totalPaths.toLocaleString("en-US")} paths.`
              : "Preparing simulation…"}
        </div>
      )}
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
                calculated when available. Other results remain illustrative
                placeholders.
              </p>
            </div>
          )}
          {visuals.withdrawal && <RiskWithdrawalChart result={ceResult} />}
          {visuals.gm && (
            <GmRiskCard
              projected={projected}
              run={run}
              stale={stale}
              custom={custom}
            />
          )}
          {visuals.capital && (
            <CapitalCard
              comparison={calculateCapitalComparison(ceResult, projected)}
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
                  <span className="chip">NOT CALCULATED</span>
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
                description="Explore possible outcomes and the borrowing exposure of the unprojected policy."
              />
              <div className="risk-section-grid">
                {visuals.timing && <TimingCard />}
                {visuals.borrowing && (
                  <BorrowingCard feasibility={feasibility} />
                )}
              </div>
            </section>
          )}
        </div>
        {settingsOpen && (
          <aside className="settings-panel">
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
