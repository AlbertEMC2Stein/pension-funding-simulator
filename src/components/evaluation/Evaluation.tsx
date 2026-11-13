"use client";

import { useLanguage } from "../LanguageContext";
import { riskDetailMessages } from "../../lib/i18n/risk-details";
import { validationMessage } from "../../lib/i18n/validation";
import { evaluationCardMessages } from "../../lib/i18n/evaluation-cards";
import { evaluationMessages } from "../../lib/i18n/evaluation";
import { PanelHelp } from "../PanelHelp";

import { useMemo, useState } from "react";
import { AllocationCard } from "./AllocationCard";
import { TimingCard } from "./TimingCard";
import { TrajectoryCard } from "./TrajectoryCard";
import { SimulationRunControl } from "./SimulationRunControl";
import { StatusBadge, type ResultStatus } from "../StatusBadge";
import { useEvaluationRun, type EvaluationRun } from "./useEvaluationRun";
import {
  calculateBorrowingDiagnostics,
  type BorrowingDiagnostics,
} from "./borrowing-diagnostics";
import { FeasibilityControls } from "./FeasibilityControls";
import {
  DEFAULT_SETUP_NAME,
  useSimulationDraft,
} from "../SimulationDraftContext";
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
import { SimulationDetailFields } from "../SimulationDetailFields";
import {
  Metric,
  PageHeading,
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
    title: "Withdrawal & risk",
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
    title: "Wealth trajectories",
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
  const { language } = useLanguage();
  const copy = evaluationCardMessages[language];
  const detail = riskDetailMessages[language];
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
          <span className="tiny-label">{copy.referenceMortality}</span>
          <div className="panel-help-heading">
            <h3>{copy.gmTitle}</h3>
            <PanelHelp panel="gm" />
          </div>
          <p className="timing-intro">
            {detail.gmIntroBefore}{" "}
            <TermLink term="gm-risk">{detail.gmLink}</TermLink>.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {stale && <p role="status">{detail.stale}</p>}
      <div className="diagnostic-metrics">
        <div>
          <span>
            {targetMode ? (
              <TermLink term="target-risk">{copy.targetRisk}</TermLink>
            ) : (
              copy.ceRisk
            )}
          </span>
          <strong>
            {risk ? `${(risk.ceBenchmark * 100).toFixed(3)}%` : "—"}
          </strong>
          <small>{copy.ceNote}</small>
        </div>
        <div>
          <span>{copy.estimatedGM}</span>
          <strong>
            {risk ? `${(risk.gm.estimate * 100).toFixed(3)}%` : "—"}
          </strong>
          <small>{copy.unconstrainedEstimate}</small>
        </div>
        <div>
          <span>{targetMode ? copy.differenceTarget : copy.differenceCe}</span>
          <strong>
            {difference === null
              ? "—"
              : `${difference > 0 ? "+" : ""}${difference.toFixed(3)} pp`}
          </strong>
          <small>{copy.differenceNote}</small>
        </div>
      </div>
      {risk && (
        <>
          <p className="chart-disclaimer">
            {detail.approximate}
            {language === "en" ? " " : ""}
            <TermLink term="monte-carlo">{detail.mcInterval}</TermLink>:{" "}
            {risk.gm.interval95
              ? `${(risk.gm.interval95.lower * 100).toFixed(3)}% – ${(risk.gm.interval95.upper * 100).toFixed(3)}%`
              : detail.sampleUnavailable}
            . {detail.gmHorizon(risk.horizonYears.toFixed(2))}
          </p>
        </>
      )}
      {projected && (
        <div className="projection-risk-result">
          <div className="result-subheading">
            <span className="tiny-label">{copy.projectedComparison}</span>
            <StatusBadge status={projectedStatus} />
          </div>
          <div className="diagnostic-metrics">
            <div>
              <span>{copy.projectedGM}</span>
              <strong>
                {projectedRisk
                  ? `${(projectedRisk.gm.estimate * 100).toFixed(3)}%`
                  : "—"}
              </strong>
              <small>{copy.projectedEstimate}</small>
            </div>
            <div>
              <span>{copy.projectionContribution}</span>
              <strong>
                {projectedRisk
                  ? `${projectedRisk.gmDifference.estimate > 0 ? "+" : ""}${(projectedRisk.gmDifference.estimate * 100).toFixed(3)} pp`
                  : "—"}
              </strong>
              <small>
                {copy.projectedMinus} (
                <TermLink term="percentage-points">pp</TermLink>)
              </small>
            </div>
            <div>
              <span>{targetMode ? copy.totalTarget : copy.totalCe}</span>
              <strong>
                {projectedDifference === null
                  ? "—"
                  : `${projectedDifference > 0 ? "+" : ""}${projectedDifference.toFixed(3)} pp`}
              </strong>
              <small>{copy.projectedReference}</small>
            </div>
          </div>
          {projectedRisk ? (
            <p className="chart-disclaimer">
              {detail.projectedIntervals} {detail.projectedRisk}{" "}
              {projectedRisk.gm.interval95
                ? `${(projectedRisk.gm.interval95.lower * 100).toFixed(3)}% – ${(projectedRisk.gm.interval95.upper * 100).toFixed(3)}%`
                : detail.sampleUnavailable}
              ; {detail.pairedDifference}{" "}
              {projectedRisk.gmDifference.interval95
                ? `${(projectedRisk.gmDifference.interval95.lower * 100).toFixed(3)} pp – ${(projectedRisk.gmDifference.interval95.upper * 100).toFixed(3)} pp`
                : detail.sampleUnavailable}
              . {detail.projectedMethod}
            </p>
          ) : (
            <p className="chart-disclaimer">{detail.awaitingProjected}</p>
          )}
        </div>
      )}
      {!projected && (
        <p className="chart-disclaimer">{detail.offerProjected}</p>
      )}
    </article>
  );
}

/** Show capital needed at nearby CE risk levels for the same withdrawal. */
export function CapitalCard({ comparison }: { comparison: CapitalComparison }) {
  const { language } = useLanguage();
  const copy = evaluationCardMessages[language];
  const detail = riskDetailMessages[language];
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
          <span className="tiny-label">{copy.valueRisk}</span>
          <div className="panel-help-heading">
            <h3>{copy.valueRiskTitle}</h3>
            <PanelHelp panel="capital" />
          </div>
          <p className="timing-intro">
            {detail.capitalIntro}{" "}
            <TermLink term="withdrawal">{detail.withdrawalLink}</TermLink>.{" "}
            {detail.capitalLearn}{" "}
            <TermLink term="capital-relief">{detail.reliefLink}</TermLink>.
          </p>
        </div>
        <StatusBadge status={available ? "calculated" : "not-available"} />
      </div>
      {!available ? (
        <p role="status">{validationMessage(comparison.message, language)}</p>
      ) : (
        <>
          <p className="timing-intro">
            {copy.withdrawalUsed} {euros(comparison.annualWithdrawal)} /{" "}
            {copy.year}
          </p>
          <div className="capital-summary">
            <div>
              <span>{copy.riskFreeCapital}</span>
              <strong>{euros(comparison.safeCapital)}</strong>
              <small>
                <TermLink term="safe-boundary">{copy.safeBoundary}</TermLink>{" "}
                {copy.atRetirement}
              </small>
            </div>
            <div>
              <span>{copy.capital}</span>
              <strong>{euros(comparison.initialCapital)}</strong>
              <small>{copy.initialNote}</small>
            </div>
            <div>
              <span>
                {comparison.zeroRisk ? copy.capitalSurplus : copy.capitalRelief}
              </span>
              <strong>{euros(relief!)}</strong>
              <small>
                {((relief! / comparison.safeCapital) * 100).toFixed(2)}%{" "}
                {copy.fractionOfSafe}
              </small>
            </div>
          </div>
          <div className="capital-table-wrap">
            <table className="capital-table">
              <thead>
                <tr>
                  <th>{copy.lifetimeCe}</th>
                  <th>{copy.capitalRequired}</th>
                  <th>{copy.changeFromCapital}</th>
                </tr>
              </thead>
              <tbody key={comparison.zeroRisk ? "zero-risk" : "positive-risk"}>
                {comparison.rows.map((row) => (
                  <tr key={`${row.label}/${row.risk}`}>
                    <td>
                      {detail.capitalRows[row.label] ?? row.label}{" "}
                      <span>({(row.risk * 100).toFixed(2)}%)</span>
                    </td>
                    <td>
                      {row.capital === null
                        ? copy.unavailable
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
            {detail.capitalNote}
            {comparison.zeroRisk && ` ${detail.capitalZeroNote}`}
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
  diagnostics,
}: {
  feasibility: FeasibilityResult;
  projected: boolean;
  run: EvaluationRun | null;
  stale: boolean;
  diagnostics: BorrowingDiagnostics;
}) {
  const { language } = useLanguage();
  const copy = evaluationCardMessages[language];
  const detail = riskDetailMessages[language];
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
          <span className="tiny-label">{copy.unconstrained}</span>
          <div className="panel-help-heading">
            <h3>{copy.borrowing}</h3>
            <PanelHelp panel="borrowing" />
          </div>
          <p className="timing-intro">
            {detail.borrowIntro}{" "}
            <TermLink term="borrowing">{detail.borrowLink}</TermLink>{" "}
            {detail.borrowIntroEnd}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {projected ? (
        <p role="status">{detail.projectedUnavailable}</p>
      ) : hasNegativeMerton ? (
        <p role="status">{detail.negativeUnavailable}</p>
      ) : (
        <>
          <div className="borrowing-metrics">
            <Metric
              label={copy.borrowingProbability}
              value={
                analyticalZero
                  ? "0%"
                  : probability
                    ? `${(100 * probability.estimate).toFixed(2)}%`
                    : "—"
              }
              note={copy.borrowingProbabilityNote}
            />
            <Metric
              label={copy.borrowingTime}
              value={
                analyticalZero
                  ? `0 ${detail.years}`
                  : occupation
                    ? `${occupation.estimateYears.toFixed(2)} ${detail.years}`
                    : "—"
              }
              note={copy.borrowingTimeNote}
            />
          </div>
          <details className="borrowing-details">
            <summary>{copy.borrowingDetails}</summary>
            <dl>
              {[
                [
                  detail.global,
                  feasibility.status === "feasible"
                    ? detail.feasible
                    : feasibility.status === "unavailable"
                      ? detail.unavailable
                      : detail.notFeasible,
                ],
                [
                  detail.relativeBandwidth,
                  "zeta" in feasibility
                    ? `${feasibility.zeta.toPrecision(6)} (${feasibility.zeta <= 1 ? "≤" : ">"} 1)`
                    : "—",
                ],
                [
                  detail.probabilitySE,
                  probability?.standardError != null
                    ? `${(100 * probability.standardError).toFixed(3)}%`
                    : "—",
                ],
                [
                  detail.probabilityInterval,
                  probability?.interval95
                    ? `${(100 * probability.interval95.lower).toFixed(3)}% – ${(100 * probability.interval95.upper).toFixed(3)}%`
                    : "—",
                ],
                [
                  detail.timeSE,
                  occupation?.standardErrorYears != null
                    ? `${occupation.standardErrorYears.toFixed(3)} ${detail.years}`
                    : "—",
                ],
                [
                  detail.timeInterval,
                  occupation?.interval95Years
                    ? `${occupation.interval95Years.lower.toFixed(3)} – ${occupation.interval95Years.upper.toFixed(3)} ${detail.years}`
                    : "—",
                ],
                [
                  detail.atRetirement,
                  diagnostics.available
                    ? diagnostics.borrowingAtRetirement
                      ? detail.yes
                      : detail.no
                    : detail.unavailable,
                ],
                [
                  detail.lastTime,
                  diagnostics.available
                    ? diagnostics.lastPossibleTimeYears === null
                      ? detail.notPossible
                      : `${diagnostics.lastPossibleTimeYears.toFixed(2)} ${detail.yearsAfter}`
                    : detail.unavailable,
                ],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt>{a}</dt>
                  <dd>{b}</dd>
                </div>
              ))}
            </dl>
            <p>{validationMessage(feasibility.message, language)}</p>
            <p>
              {detail.bandwidthBefore}{" "}
              <TermLink term="global-feasibility">ζ</TermLink>{" "}
              {detail.bandwidthAfter}{" "}
              {stale && occupation && detail.staleChecks}
            </p>
            <p>
              {analyticalZero
                ? detail.analyticalZeros
                : detail.simulationIntervals}
            </p>
          </details>
          <p className="chart-disclaimer">
            {analyticalZero ? (
              detail.noBorrow
            ) : (
              <>
                {occupation ? detail.timeEstimate : detail.timePending}{" "}
                {probability ? detail.firstEstimate : detail.firstPending}
              </>
            )}
          </p>
        </>
      )}
    </article>
  );
}

/**
 * Evaluation dashboard and its local display controls. Analytical views use
 * current inputs; simulation views retain their captured run and mark it stale.
 */
export function Evaluation() {
  const { language } = useLanguage();
  const text = evaluationMessages[language];
  const translatedVisuals: Record<Visual, string> = {
    withdrawal: text.withdrawal,
    gm: text.estimatedGM,
    capital: text.valueRisk,
    allocation: text.allocation,
    timing: text.timing,
    borrowing: text.borrowing,
    trajectories: text.illustrative,
  };
  const groupTitles: Record<string, string> = {
    "Withdrawal & risk": text.withdrawal,
    "Portfolio & policies": text.portfolioPolicies,
    "Impoverishment & borrowing": text.impoverishmentBorrowing,
    "Wealth trajectories": text.trajectories,
  };
  const { navigate } = useDraft();
  const { draft, setDraft, setupName, initialMortalityFit } =
    useSimulationDraft();
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

  const showWithdrawalSection =
    visuals.withdrawal || visuals.capital || visuals.gm;
  const visualPickerButton = (
    <button
      type="button"
      className="button button-light"
      aria-expanded={pickerOpen}
      onClick={() => setPickerOpen(!pickerOpen)}
    >
      ◫ &nbsp; {text.customize}
    </button>
  );

  return (
    <section className="view active">
      <PageHeading
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />
      {initialMortalityFit.phase === "checking-storage" && (
        <p className="initial-fit-status" role="status">
          {text.checkingStorage}
        </p>
      )}
      {(initialMortalityFit.phase === "loading" ||
        initialMortalityFit.phase === "running") && (
        <p className="initial-fit-status" role="status">
          {initialMortalityFit.phase === "loading"
            ? text.preparingMortality
            : `${text.fitting} · ${initialMortalityFit.model}: ${initialMortalityFit.completed} / ${initialMortalityFit.total} ${text.starts}`}
        </p>
      )}
      {initialMortalityFit.phase === "error" && (
        <p className="initial-fit-status initial-fit-error" role="alert">
          {validationMessage(initialMortalityFit.message, language)}{" "}
          {text.reviewMortality}
        </p>
      )}
      <div
        className={`workspace-grid evaluation-workspace ${settingsOpen ? "" : "settings-closed"}`}
      >
        <div className="scenario-strip">
          <div className="scenario-intro">
            <span className="tiny-label">{text.yourSetup}</span>
            <strong>
              {setupName.trim() || DEFAULT_SETUP_NAME} <span>✳</span>
            </strong>
          </div>
          <div className="scenario-item">
            <span>{text.retirementAge}</span>
            <strong>
              {/^\d{4}$/.test(draft.investor.birthYear) &&
              /^\d{4}$/.test(draft.investor.retirementYear)
                ? Number(draft.investor.retirementYear) -
                  Number(draft.investor.birthYear)
                : "—"}{" "}
              <small>{text.years}</small>
            </strong>
          </div>
          <div className="scenario-item">
            <span>{text.capital}</span>
            <strong>€{draft.investor.initialCapital || "—"}</strong>
          </div>
          <div className="scenario-item">
            <span>{text.impoverishment}</span>
            <strong>€{draft.investor.impoverishmentLevel || "—"}</strong>
          </div>
          <div className="scenario-item">
            <span>{custom ? text.annualWithdrawal : text.targetRisk}</span>
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
            {text.editSetup}
          </button>
          <SimulationRunControl
            run={run}
            stale={stale}
            errors={errors}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen(!settingsOpen)}
            onStart={() => start(visuals.trajectories)}
            onCancel={cancel}
          />
        </div>
        <div className="evaluation-content">
          <div className="visual-picker-trigger">{visualPickerButton}</div>
          {pickerOpen && (
            <div className="visual-options visual-picker">
              <div className="visual-picker-heading">
                <strong>{text.chooseVisuals}</strong>
                <p>{text.chooseDescription}</p>
              </div>
              <div className="visual-picker-groups">
                {visualGroups.map((group) => (
                  <fieldset key={group.title}>
                    <legend>{groupTitles[group.title]}</legend>
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
                        {translatedVisuals[entry.id]}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
              <p className="visual-picker-note">{text.visualNote}</p>
            </div>
          )}
          {showWithdrawalSection && (
            <SectionHeading
              eyebrow={text.decisionEyebrow}
              title={text.withdrawal}
              description={text.decisionDescription}
            />
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
          {visuals.allocation && (
            <section className="risk-section">
              <SectionHeading
                eyebrow={text.portfolioEyebrow}
                title={text.portfolioPolicies}
                description={text.portfolioDescription}
              />
              <AllocationCard
                result={ceResult}
                projected={projected}
                assetNames={assetNames}
              />
            </section>
          )}
          {(visuals.timing || visuals.borrowing) && (
            <section className="risk-section">
              <SectionHeading
                eyebrow={text.exposureEyebrow}
                title={text.impoverishmentBorrowing}
                description={
                  projected
                    ? text.projectedExposure
                    : text.unconstrainedExposure
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
                    diagnostics={calculateBorrowingDiagnostics(
                      ceResult,
                      feasibility,
                    )}
                  />
                )}
              </div>
            </section>
          )}
          {visuals.trajectories && (
            <section className="risk-section">
              <SectionHeading
                eyebrow={text.pathsEyebrow}
                title={text.trajectories}
                description={text.pathsDescription}
              />
              <TrajectoryCard run={run} stale={stale} />
            </section>
          )}
        </div>
        {settingsOpen && (
          <aside id="evaluation-settings" className="settings-panel">
            <div className="settings-heading">
              <div>
                <span className="tiny-label">{text.customizeEyebrow}</span>
                <h2>{text.settings}</h2>
              </div>
              <button
                type="button"
                className="close-settings"
                aria-label={text.close}
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="settings-lead">{text.settingsLead}</p>
            <div className="settings-group">
              <div className="group-title">
                <span>01</span> {text.withdrawalApproach}
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
                  {text.targetRisk}
                </button>
                <button
                  type="button"
                  className={custom ? "selected" : ""}
                  aria-pressed={custom}
                  onClick={() =>
                    updateSimulation({ withdrawalMode: "customAmount" })
                  }
                >
                  {text.customAmount}
                </button>
              </div>
              <label className="field-label" htmlFor="withdrawal-slider">
                {custom ? text.annualWithdrawal : text.targetLifetime}{" "}
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
                <span>{custom ? text.lowerWithdrawal : text.lowerRisk}</span>
                <span>{custom ? text.higherWithdrawal : text.higherRisk}</span>
              </div>
              <div className="setting-callout withdrawal-callout">
                <span aria-hidden="true">✳</span>
                <div>
                  <strong>
                    {custom ? text.impliedRisk : text.derivedWithdrawal}
                  </strong>
                  <div className="withdrawal-value">
                    {"data" in ceResult
                      ? custom
                        ? (ceResult.data.selectedRisk * 100).toFixed(2)
                        : `€${Math.round(ceResult.data.selectedWithdrawal).toLocaleString("en-US")}`
                      : "—"}{" "}
                    <small>{custom ? "%" : text.perYear}</small>
                  </div>
                  <span className="withdrawal-status" role="status">
                    {"data" in ceResult
                      ? text.ceModel
                      : validationMessage(ceResult.message, language)}
                  </span>
                </div>
              </div>
            </div>
            <div className="settings-group">
              <div className="group-title">
                <span>02</span> {text.portfolioPolicy}
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
                  <strong>{text.applyProjection}</strong>
                  <small>{text.projectionNote}</small>
                </span>
              </label>
              <div className="info-line">
                ⓘ &nbsp;{" "}
                <TermLink term="projection">{text.projection}</TermLink>{" "}
                {text.projectionInfo}
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
                <span>03</span> {text.simulationDetail}
              </div>
              <SimulationDetailFields
                simulation={simulation}
                onChange={updateSimulation}
                idPrefix="evaluation"
              />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
