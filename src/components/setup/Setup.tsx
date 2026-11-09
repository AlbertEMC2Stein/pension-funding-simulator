"use client";

import { useState } from "react";
import {
  DemoAction,
  PageHeading,
  PreviewBanner,
  SectionHeading,
  TermLink,
} from "../common";
import {
  nominalRiskFreeRateError,
  inflationRateError,
  realRateFromNominal,
  isEditableDecimal,
  initialMarketCalibration,
  updateMarketWithUndo,
  type MarketEditAction,
  type MarketCalibrationDraft,
} from "../../lib/market-calibration";
import { useSimulationDraft } from "../SimulationDraftContext";
import { MarketEditor } from "./MarketEditor";
import { parseAmount } from "../../lib/simulation-options";
import { CohortChart } from "./CohortChart";
import type { CeFitStatus } from "../../lib/fit-status";
import {
  FIRST_COHORT_YEAR,
  LAST_COHORT_YEAR,
  LAST_SUPPORTED_RETIREMENT_AGE,
  validateCohortYears,
} from "../../lib/cohort-survival";

/**
 * Market tab: owns the temporary editable market and shows calibration and
 * stress-test placeholders. Importing market data is not wired yet.
 */
function MarketSetup() {
  const [undo, setUndo] = useState<MarketCalibrationDraft | null>(null);
  const [stress, setStress] = useState(false);
  const { draft, setDraft } = useSimulationDraft();
  const market = draft.market;
  const riskFreeError = nominalRiskFreeRateError(
    market.nominalRiskFreePercent,
    market.inflationPercent,
  );
  const realRate = realRateFromNominal(
    market.nominalRiskFreePercent,
    market.inflationPercent,
  );
  const inflationError = inflationRateError(market.inflationPercent);
  // Enable only after a CSV time-series import has successfully been calibrated.
  // The import placeholder alone does not create a calibration.
  const hasHistoricalCsvCalibration = false;
  function applyMarketAction(action: MarketEditAction) {
    const next = updateMarketWithUndo(market, undo, action);
    setUndo(next.undo);
    if (next.market !== market)
      setDraft((current) => ({ ...current, market: next.market }));
  }
  function editMarket(next: MarketCalibrationDraft) {
    applyMarketAction({ type: "edit", market: next });
  }
  const isExample =
    JSON.stringify(market) === JSON.stringify(initialMarketCalibration());
  return (
    <div className="setup-layout">
      <aside className="insight-card">
        <div className="insight-art">
          <span>✳</span>
          <div className="orbit one" />
          <div className="orbit two" />
        </div>
        <span className="tiny-label">A NOTE ON CALIBRATION</span>
        <h3>Good inputs make better questions.</h3>
        <p>
          Historical estimates are a starting point. Review the period,
          currency, and assumptions before using them.
        </p>
        <div className="insight-divider" />
        <DemoAction message="Market data sources are not connected in this draft.">
          Market data sources
        </DemoAction>
      </aside>
      <div>
        <SectionHeading
          eyebrow="THE INVESTMENT UNIVERSE"
          title="Market assumptions"
          description="Define up to 10 assets and how they move together."
        />
        <div className="form-card market-input-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">YOUR MARKET</span>
              <h3>Market inputs</h3>
            </div>
            <div className="market-actions">
              <button
                type="button"
                className="button button-light"
                onClick={() => applyMarketAction({ type: "reset" })}
                disabled={isExample}
              >
                ↺ &nbsp; Reset to example
              </button>
              {undo && (
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => applyMarketAction({ type: "undo" })}
                >
                  Undo reset
                </button>
              )}
              <DemoAction message="Price data import is not connected yet.">
                ↥ &nbsp; Import price data
              </DemoAction>
            </div>
          </div>
          <p>Enter your own assumptions or restore the two-asset example.</p>
          {undo && (
            <p role="status">
              Example restored. You can undo the reset until you edit another
              input.
            </p>
          )}
          <p className="mortality-market-note">
            Market assumptions can affect the fitted mortality model. After
            changing them, check the fit under Investor &amp; mortality. The
            underlying cohort data do not change.
          </p>
          <div className="input-grid market-input-grid">
            <label>
              Base currency
              <select defaultValue="EUR">
                <option value="EUR">EUR — Euro</option>
              </select>
            </label>
            <label>
              Nominal risk-free rate
              <div
                className={`input-suffix${riskFreeError ? " input-suffix-invalid" : ""}`}
              >
                <input
                  value={market.nominalRiskFreePercent}
                  aria-invalid={!!riskFreeError}
                  aria-describedby="risk-free-rate-hint risk-free-rate-error"
                  onChange={(event) => {
                    if (isEditableDecimal(event.target.value))
                      editMarket({
                        ...market,
                        nominalRiskFreePercent: event.target.value,
                      });
                  }}
                  inputMode="decimal"
                />
                <span>% / year</span>
              </div>
              <small id="risk-free-rate-hint" className="cohort-input-hint">
                {realRate === null
                  ? "Enter a valid rate and inflation assumption."
                  : `Real rate after inflation: ${Number((realRate * 100).toPrecision(4))}% / year (continuously compounded).`}
              </small>
              <small
                id="risk-free-rate-error"
                className="field-error"
                aria-live="polite"
              >
                {riskFreeError}
              </small>
            </label>
            <label>
              Inflation assumption
              <div
                className={`input-suffix${inflationError ? " input-suffix-invalid" : ""}`}
              >
                <input
                  value={market.inflationPercent}
                  aria-invalid={!!inflationError}
                  aria-describedby="inflation-error"
                  onChange={(event) => {
                    if (isEditableDecimal(event.target.value))
                      editMarket({
                        ...market,
                        inflationPercent: event.target.value,
                      });
                  }}
                  inputMode="decimal"
                />
                <span>% / year</span>
              </div>
              <small
                id="inflation-error"
                className="field-error"
                aria-live="polite"
              >
                {inflationError}
              </small>
            </label>
          </div>
        </div>
        <MarketEditor market={market} onChange={editMarket} />
        {hasHistoricalCsvCalibration && (
          <div className="form-card diagnostic-card">
            <div className="card-heading">
              <div>
                <span className="tiny-label">HISTORICAL CALIBRATION</span>
                <h3>Estimation uncertainty</h3>
                <p>
                  Available after calibration from historical API or uploaded
                  data.
                </p>
              </div>
              <span className="chip">NOT CALCULATED</span>
            </div>
            <div className="diagnostic-meta">
              {[
                "Period",
                "Frequency",
                "Currency",
                "Observations",
                "Method",
              ].map((label) => (
                <span key={label}>
                  {label} <b>—</b>
                </span>
              ))}
            </div>
            <div className="capital-table-wrap">
              <table className="capital-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Annual return</th>
                    <th>95% confidence interval</th>
                    <th>Volatility</th>
                  </tr>
                </thead>
                <tbody>
                  {market.assets.map((asset, index) => (
                    <tr key={asset.id}>
                      <td>{asset.name.trim() || `Asset ${index + 1}`}</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="borrowing-details diagnostic-details">
              <summary>Covariance & correlation details</summary>
              <dl>
                <div>
                  <dt>Widest individual covariance interval</dt>
                  <dd>—</dd>
                </div>
                <div>
                  <dt>Asset pair</dt>
                  <dd>—</dd>
                </div>
                <div>
                  <dt>Matrix conditioning</dt>
                  <dd>Not evaluated</dd>
                </div>
              </dl>
              <p>
                The widest individual interval is not a confidence bound for the
                whole matrix. A near-singular covariance warning will appear
                when applicable.
              </p>
            </details>
            <p className="chart-disclaimer">
              Intervals describe historical-parameter estimation uncertainty,
              not guaranteed future return ranges.
            </p>
          </div>
        )}
        <div className="form-card diagnostic-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">SCENARIO COMPARISON</span>
              <h3>Recalibrated market scenarios</h3>
              <p>
                Compare estimated return assumptions with covariance held fixed.
              </p>
            </div>
            <span className="chip">NOT CALCULATED</span>
          </div>
          <label className="check-card scenario-toggle">
            <input
              type="checkbox"
              checked={stress}
              onChange={(event) => setStress(event.target.checked)}
            />
            <span>
              <strong>Explore return scenarios</strong>
              <small>
                Recalculate the policy and compatible mortality calibration for
                each scenario.
              </small>
            </span>
          </label>
          {stress && (
            <>
              <div className="capital-table-wrap">
                <table className="capital-table">
                  <thead>
                    <tr>
                      <th>Scenario</th>
                      <th>Return assumptions</th>
                      <th>Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Baseline", "Historical estimates"],
                      ["Lower returns", "Individual lower bounds"],
                      ["Higher returns", "Individual upper bounds"],
                    ].map(([name, assumption]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{assumption}</td>
                        <td>Not evaluated</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="chart-disclaimer">
                Individual interval endpoints are not a joint confidence region
                or guaranteed worst- and best-case outcomes.
              </p>
            </>
          )}
        </div>
        <div className="feasibility-status market-assumptions" role="status">
          <strong>
            Assumption checks <span>Not evaluated</span>
          </strong>
          <p>
            Each result will be checked separately. Negative Merton-direction
            components can restrict feasibility and borrowing diagnostics
            without disabling every calculation.
          </p>
          <small>
            Affected assets and unavailable results will be identified when
            evaluated.
          </small>
        </div>
      </div>
    </div>
  );
}

/**
 * Investor tab with preview-only inputs and mortality fit. `mix` is the male
 * survival-curve weight in [0, 1] when the custom mixture is selected.
 */
function InvestorSetup({
  ceFitStatus,
  onCeFitStatusChange,
  active,
}: {
  ceFitStatus: CeFitStatus;
  onCeFitStatusChange: (status: CeFitStatus) => void;
  active: boolean;
}) {
  const { draft, setDraft } = useSimulationDraft();
  const { investor } = draft;
  const mortality = investor.mortality;
  const mix = investor.maleWeight;
  const cohortYears = validateCohortYears(
    investor.birthYear,
    investor.retirementYear,
  );
  const initialCapital = parseAmount(investor.initialCapital);
  const threshold = parseAmount(investor.impoverishmentLevel);
  const thresholdPercent =
    initialCapital !== null &&
    initialCapital > 0 &&
    threshold !== null &&
    threshold >= 1 &&
    threshold < initialCapital
      ? (threshold / initialCapital) * 100
      : null;
  function updateInvestor(change: Partial<typeof investor>) {
    setDraft((current) => ({
      ...current,
      investor: { ...current.investor, ...change },
    }));
  }
  return (
    <div className="setup-layout">
      <aside className="insight-card">
        <div className="insight-art mortality-art">
          <span>✳</span>
          <div className="orbit one" />
          <div className="orbit two" />
        </div>
        <span className="tiny-label">MORTALITY DATA</span>
        <h3>Built around your cohort.</h3>
        <p>
          The intended design uses birth year, retirement age, and a selected
          longevity scenario to calibrate mortality.
        </p>
        <div className="insight-divider" />
        <DemoAction message="Mortality data information is not connected in this draft.">
          About the data
        </DemoAction>
      </aside>
      <div>
        <SectionHeading
          eyebrow="YOUR RETIREMENT PROFILE"
          title="Investor & mortality"
          description="Set the person and retirement context for your scenario."
        />
        <div className="form-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">RETIREMENT PROFILE</span>
              <h3>A few details about you</h3>
            </div>
          </div>
          <div className="input-grid">
            <label>
              Birth year
              <input
                type="number"
                min={FIRST_COHORT_YEAR}
                max={LAST_COHORT_YEAR}
                step={1}
                aria-invalid={!!cohortYears.birthError}
                aria-describedby="birth-year-hint"
                value={investor.birthYear}
                onChange={(event) =>
                  updateInvestor({ birthYear: event.target.value })
                }
              />
              <small id="birth-year-hint" className="cohort-input-hint">
                {cohortYears.birthError ??
                  `Available cohorts: ${FIRST_COHORT_YEAR}–${LAST_COHORT_YEAR}.`}
              </small>
            </label>
            <label>
              Expected retirement year
              <input
                type="number"
                min={cohortYears.birthError ? undefined : cohortYears.birthYear}
                max={
                  cohortYears.birthError
                    ? undefined
                    : cohortYears.birthYear + LAST_SUPPORTED_RETIREMENT_AGE
                }
                step={1}
                aria-invalid={!!cohortYears.retirementError}
                aria-describedby="retirement-year-hint"
                value={investor.retirementYear}
                onChange={(event) =>
                  updateInvestor({ retirementYear: event.target.value })
                }
              />
              <small id="retirement-year-hint" className="cohort-input-hint">
                {cohortYears.retirementError ??
                  "Supported retirement ages: 0–99."}
              </small>
            </label>
            <label>
              Mortality table
              <select
                value={mortality}
                onChange={(event) =>
                  updateInvestor({
                    mortality: event.target.value as typeof investor.mortality,
                  })
                }
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="custom">Custom mixture</option>
              </select>
            </label>
            <label>
              Longevity scenario
              <select
                value={investor.longevity}
                onChange={(event) =>
                  updateInvestor({
                    longevity: event.target.value as typeof investor.longevity,
                  })
                }
              >
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Initial capital
              <div className="input-suffix">
                <input
                  value={investor.initialCapital}
                  onChange={(event) =>
                    updateInvestor({ initialCapital: event.target.value })
                  }
                />
                <span>EUR</span>
              </div>
            </label>
            <div className="input-with-help">
              <div className="input-label-row">
                <label htmlFor="impoverishment-input">
                  Impoverishment level
                </label>
                <TermLink term="impoverishment">?</TermLink>
              </div>
              <div className="input-suffix">
                <input
                  id="impoverishment-input"
                  aria-describedby="impoverishment-percentage"
                  value={investor.impoverishmentLevel}
                  onChange={(event) =>
                    updateInvestor({ impoverishmentLevel: event.target.value })
                  }
                />
                <span>EUR</span>
              </div>
              <small id="impoverishment-percentage" className="input-hint">
                {thresholdPercent === null
                  ? "Enter at least €1 and less than your initial capital."
                  : `${thresholdPercent < 0.01 ? "Less than 0.01" : new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(thresholdPercent)}% of initial capital`}
              </small>
            </div>
          </div>
          {mortality === "custom" && (
            <div className="mortality-mixture">
              <label className="field-label" htmlFor="mortality-mix">
                Male weight <b>{mix.toFixed(2)}</b>
              </label>
              <input
                id="mortality-mix"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mix}
                onChange={(event) =>
                  updateInvestor({ maleWeight: Number(event.target.value) })
                }
                aria-describedby="mix-description"
              />
              <div className="range-ends">
                <span>0 · Female</span>
                <span>1 · Male</span>
              </div>
              <p id="mix-description">
                Weights the female and male survival curves; 0.50 gives an equal
                mixture.
              </p>
            </div>
          )}
        </div>
        <div className="form-card mortality-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">MORTALITY CALIBRATION</span>
              <h3>Survival curve & model fit</h3>
            </div>
          </div>
          <p>
            Explore cohort survival from your expected retirement age and fit
            mortality models.
          </p>
          <p className="mortality-market-note" role="status">
            {ceFitStatus === "needs-update"
              ? "The compatible CE fit needs updating after an input change."
              : "The compatible CE fit depends on market assumptions. Check the fit again after changing them."}{" "}
            The cohort data themselves do not change.
          </p>
          <CohortChart
            birthYear={investor.birthYear}
            retirementYear={investor.retirementYear}
            mortality={mortality}
            longevity={investor.longevity}
            maleWeight={mix}
            active={active}
            onCeFitStatusChange={onCeFitStatusChange}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Switch between market and investor tabs. Both remain mounted so locally
 * edited values survive tab changes, but they do not survive a page reload.
 */
export function Setup() {
  const [tab, setTab] = useState<"market" | "investor">("market");
  const [ceFitStatus, setCeFitStatus] = useState<CeFitStatus>("not-fitted");
  return (
    <section className="view active">
      <PageHeading
        eyebrow="BUILD YOUR SCENARIO"
        title="The foundations"
        description="Set the market and investor assumptions behind your analysis."
      >
        <DemoAction message="Scenario import is not connected in this draft.">
          ↥ &nbsp; Import scenario
        </DemoAction>
      </PageHeading>
      <PreviewBanner>
        <strong>Design preview.</strong> Cohort data and mortality fits can be
        explored. Settings are not saved, and simulations are not connected yet.
      </PreviewBanner>
      <div className="tabs" role="tablist" aria-label="Setup sections">
        <button
          type="button"
          className={`tab ${tab === "market" ? "active" : ""}`}
          role="tab"
          aria-selected={tab === "market"}
          onClick={() => setTab("market")}
        >
          01 &nbsp; Market
        </button>
        <button
          type="button"
          className={`tab ${tab === "investor" ? "active" : ""}`}
          role="tab"
          aria-selected={tab === "investor"}
          onClick={() => setTab("investor")}
        >
          02 &nbsp; Investor & mortality
          {ceFitStatus === "needs-update" && " · Review fit"}
        </button>
      </div>
      <div hidden={tab !== "market"}>
        <MarketSetup />
      </div>
      <div hidden={tab !== "investor"}>
        <InvestorSetup
          ceFitStatus={ceFitStatus}
          onCeFitStatusChange={setCeFitStatus}
          active={tab === "investor"}
        />
      </div>
    </section>
  );
}
