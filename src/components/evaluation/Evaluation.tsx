"use client";

import { useRef, useState } from "react";
import { useSimulationDraft } from "../SimulationDraftContext";
import { buildSimulationOptions } from "../../lib/options/simulation-options";
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
  | "comparison"
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
    entries: [
      { id: "allocation", label: "Portfolio allocation" },
      { id: "comparison", label: "Policy comparison" },
    ],
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

/** Draw the illustrative withdrawal/risk curve; its values are not calculated. */
function WithdrawalChart() {
  return (
    <div className="chart-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">YOUR WITHDRAWAL</span>
          <div className="big-value">
            €24,800 <span>/ year</span>
          </div>
          <div className="value-note">
            <span className="mini-dot" /> Example amount at your target risk
          </div>
        </div>
        <span className="chip">NOT CALCULATED</span>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox="0 0 760 245"
          role="img"
          aria-label="Illustrative withdrawal versus risk curve"
        >
          <defs>
            <linearGradient id="withdrawal-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#74b5a7" stopOpacity=".3" />
              <stop offset="100%" stopColor="#74b5a7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="grid-lines">
            <path d="M48 28H735 M48 76H735 M48 124H735 M48 172H735" />
          </g>
          <g className="axis-text">
            <text x="20" y="32">
              €40k
            </text>
            <text x="20" y="80">
              €30k
            </text>
            <text x="20" y="128">
              €20k
            </text>
            <text x="20" y="176">
              €10k
            </text>
            <text x="44" y="206">
              0%
            </text>
            <text x="206" y="206">
              2.5%
            </text>
            <text x="379" y="206">
              5%
            </text>
            <text x="548" y="206">
              7.5%
            </text>
            <text x="716" y="206">
              10%
            </text>
          </g>
          <text
            className="plot-axis-title"
            x="10"
            y="102"
            textAnchor="middle"
            transform="rotate(-90 10 102)"
          >
            ANNUAL WITHDRAWAL
          </text>
          <text className="plot-axis-title" x="391" y="235" textAnchor="middle">
            LIFETIME IMPOVERISHMENT RISK
          </text>
          <path
            d="M48 169 C160 164 243 153 325 132 S500 89 570 67 S685 38 735 28 L735 172 L48 172 Z"
            fill="url(#withdrawal-area)"
          />
          <path
            d="M48 169 C160 164 243 153 325 132 S500 89 570 67 S685 38 735 28"
            fill="none"
            stroke="#347d70"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M389 116 V172"
            stroke="#347d70"
            strokeWidth="1.3"
            strokeDasharray="4 5"
          />
          <circle
            cx="389"
            cy="116"
            r="8"
            fill="#fff"
            stroke="#347d70"
            strokeWidth="3"
          />
          <circle cx="389" cy="116" r="2.5" fill="#347d70" />
        </svg>
      </div>
      <div className="chart-disclaimer">
        Illustrative curve · not calculated from your inputs
      </div>
    </div>
  );
}

/**
 * Placeholder GM-risk comparison. `projected` only reveals the additional
 * projected-policy row; no risk or uncertainty is computed here.
 */
function GmRiskCard({ projected }: { projected: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { navigate } = useDraft();

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
            Compare the policy&apos;s calibration target with its estimated risk
            under the fitted GM model.
          </p>
        </div>
        <span className="chip">NOT CALCULATED</span>
      </div>
      <div className="diagnostic-metrics">
        <Metric
          label="Target risk α"
          note="Unconstrained policy, own mortality model"
        />
        <Metric
          label="Estimated GM risk"
          note="Unconstrained policy · Monte Carlo estimate"
        />
        <Metric
          label="Difference from target"
          note="Percentage points · uncertainty shown after a run"
        />
      </div>
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
          This card compares the chosen risk target with an estimate using the
          fitted Gompertz–Makeham mortality model. The estimate may differ from
          the target.
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

/** Placeholder for the unconstrained capital-relief comparison. */
function CapitalCard() {
  return (
    <article className="chart-card capital-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">
            THE VALUE OF RISK-TAKING · UNCONSTRAINED POLICY
          </span>
          <h3>What does accepting risk change?</h3>
          <p className="timing-intro">
            Compare your starting capital with the risk-free capital needed for
            your setup&apos;s annual withdrawal.
          </p>
        </div>
        <span className="chip">NOT CALCULATED</span>
      </div>
      <div className="capital-summary">
        <Metric
          label="Risk-free capital"
          note={
            <>
              <TermLink term="safe-boundary">Safe boundary</TermLink> at
              retirement
            </>
          }
        />
        <Metric
          label="Starting capital"
          note="The initial capital in your setup"
        />
        <Metric label="Capital relief" note="Difference in euros and percent" />
      </div>
      <div className="capital-table-wrap">
        <table className="capital-table">
          <thead>
            <tr>
              <th>Target lifetime risk</th>
              <th>Capital required</th>
              <th>Change from target</th>
            </tr>
          </thead>
          <tbody>
            {[
              "0.95 α · 5% lower",
              "α · selected target",
              "1.05 α · 5% higher",
            ].map((label) => (
              <tr key={label}>
                <td>{label}</td>
                <td>—</td>
                <td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="chart-disclaimer">
        Illustrative layout · sensitivity holds the setup&apos;s withdrawal
        fixed and compares nearby target or implied risk levels.
      </p>
    </article>
  );
}

/** Draw the example allocation graphic, independent of market editor inputs. */
function AllocationCard() {
  return (
    <article className="small-card">
      <div className="card-heading">
        <div>
          <span className="tiny-label">AT A GLANCE</span>
          <h3>Portfolio allocation</h3>
        </div>
        <span className="chip">NOT CALCULATED</span>
      </div>
      <p>How the allocation may change with wealth.</p>
      <svg
        className="mini-chart"
        viewBox="0 0 350 95"
        role="img"
        aria-label="Illustrative allocation chart"
      >
        <path
          d="M0 18 H350 M0 48 H350 M0 78 H350"
          stroke="#e8eeea"
          fill="none"
        />
        <path
          d="M0 80 C75 79 115 69 170 58 S275 34 350 22 L350 80Z"
          fill="#82b8aa"
        />
        <path
          d="M0 80 C85 79 130 75 190 66 S290 53 350 49 L350 80Z"
          fill="#275e59"
        />
      </svg>
      <div className="legend">
        <span>
          <i className="teal" /> Equities
        </span>
        <span>
          <i className="sage" /> Bonds
        </span>
        <span>
          <i className="pale" /> Risk-free
        </span>
      </div>
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

/** Placeholder for unprojected-policy borrowing and feasibility diagnostics. */
function BorrowingCard() {
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
            ["Global no-borrowing feasibility", "Not evaluated"],
            ["Relative bandwidth multiplier ζ", "—"],
            ["Borrowing at retirement", "Not evaluated"],
            ["Last possible borrowing time", "—"],
          ].map(([a, b]) => (
            <div key={a}>
              <dt>{a}</dt>
              <dd>{b}</dd>
            </div>
          ))}
        </dl>
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
        Placeholders only · no exposure has been calculated.
      </p>
    </article>
  );
}

/**
 * Evaluation dashboard and its local display controls. Scenario summary,
 * plots and result values are illustrative; Run simulation is a placeholder.
 */
export function Evaluation() {
  const { navigate } = useDraft();
  const { draft, setDraft, prepared, setPrepared } = useSimulationDraft();
  const simulation = draft.simulation;
  const [errors, setErrors] = useState<string[]>([]);
  /** Merge a partial control edit into the shared simulation draft while retaining the other settings. */
  function updateSimulation(change: Partial<typeof simulation>) {
    setDraft((current) => ({
      ...current,
      simulation: { ...current.simulation, ...change },
    }));
  }
  /** Validate the current draft and capture its options for inspection. Report errors or a debug event; this does not run a simulation. */
  function prepareSimulation() {
    const result = buildSimulationOptions(draft);

    if (!result.ok) {
      setPrepared(null);
      setErrors(result.errors);

      if (process.env.NODE_ENV === "development") {
        window.dispatchEvent(
          new CustomEvent("simulation-debug-event", {
            detail: {
              level: "error",
              message: `Options validation failed (${result.errors.length} issues).`,
            },
          }),
        );
      }

      return;
    }

    setErrors([]);
    setPrepared({ draft, options: result.options });

    if (process.env.NODE_ENV === "development") {
      window.dispatchEvent(
        new CustomEvent("simulation-debug-event", {
          detail: {
            level: "info",
            message:
              "Simulation options prepared; simulation is not connected.",
          },
        }),
      );
    }
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
    comparison: true,
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
            onClick={prepareSimulation}
          >
            ▶ &nbsp; Run simulation
          </button>
        </div>
      </PageHeading>
      <PreviewBanner>
        <strong>You&apos;re exploring a design draft.</strong> Values and charts
        below are illustrative placeholders, not simulation results.
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
      {prepared && (
        <div className="form-card" role="status">
          {prepared.draft === draft
            ? "Simulation options prepared."
            : "Prepared options need updating."}{" "}
          No simulation has run yet.
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
                Mortality fit is shown in Investor & mortality. All results are
                illustrative placeholders.
              </p>
            </div>
          )}
          {visuals.withdrawal && <WithdrawalChart />}
          {visuals.gm && <GmRiskCard projected={projected} />}
          {visuals.capital && <CapitalCard />}
          <div className="lower-grid">
            {visuals.allocation && <AllocationCard />}
            {visuals.comparison && (
              <article className="small-card">
                <div className="card-heading">
                  <div>
                    <span className="tiny-label">SIDE BY SIDE</span>
                    <h3>Policy comparison</h3>
                  </div>
                  <span className="chip">NOT CALCULATED</span>
                </div>
                <p>Compare the unconstrained and projected policies.</p>
                <div className="bar-row">
                  <span>Unconstrained</span>
                  <div>
                    <i style={{ width: "63%" }} />
                  </div>
                  <b>—</b>
                </div>
                <div className="bar-row">
                  <span>Projected</span>
                  <div>
                    <i className="alt" style={{ width: "48%" }} />
                  </div>
                  <b>—</b>
                </div>
                <div className="small-note">
                  Illustrative only · run a simulation to compare
                </div>
              </article>
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
                {visuals.borrowing && <BorrowingCard />}
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
                    — <small>{custom ? "%" : "/ year"}</small>
                  </div>
                  <span className="withdrawal-status">
                    ○ &nbsp; Not calculated yet
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
              <div className="feasibility-status" role="status">
                <strong>
                  Global feasibility <span>Not evaluated</span>
                </strong>
                <p>
                  When the model&apos;s sufficient condition holds, this will
                  confirm that the unconstrained strategy satisfies the
                  no-short-selling and no-borrowing constraints throughout its
                  relevant state space.
                </p>
                <small>
                  If the condition cannot be verified or does not hold, the
                  message will explain what is known.
                </small>
              </div>
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
            </div>
            <div className="settings-footer">
              ◷ &nbsp; Results appear here after a run.
              <br />
              <small>Settings are placeholders in this draft.</small>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
