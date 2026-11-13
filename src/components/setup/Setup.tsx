"use client";

import { useLanguage } from "../LanguageContext";
import { validationMessage } from "../../lib/i18n/validation";
import { marketPlaceholderMessages } from "../../lib/i18n/market-placeholders";
import { setupMessages } from "../../lib/i18n/setup";
import { PanelHelp } from "../PanelHelp";

import { useState } from "react";
import { StatusBadge } from "../StatusBadge";
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
} from "../../lib/market/market-calibration";
import {
  DEFAULT_SETUP_NAME,
  useSimulationDraft,
} from "../SimulationDraftContext";
import { MarketEditor } from "./MarketEditor";
import { MarketAssumptionChecks } from "./MarketAssumptionChecks";
import { MarketValidation } from "./MarketValidation";
import { MortalityDataInfo } from "./MortalityDataInfo";
import { MarketDataInfo } from "./MarketDataInfo";
import { SetupFileActions } from "../SetupFileActions";
import {
  initialSimulationDraft,
  parseAmount,
  type SimulationDraft,
} from "../../lib/options/simulation-options";
import { CohortChart } from "./CohortChart";
import type { CeFitStatus } from "../../lib/mortality/fit-status";
import {
  FIRST_COHORT_YEAR,
  LAST_COHORT_YEAR,
  LAST_SUPPORTED_RETIREMENT_AGE,
  validateCohortYears,
} from "../../lib/mortality/cohort-survival";

/**
 * Market tab: coordinates edits, CSV replacement and reset/undo through the
 * shared draft. The historical stress-test display remains a placeholder.
 */
function MarketSetup() {
  const { language } = useLanguage();
  const text = setupMessages[language];
  const placeholder = marketPlaceholderMessages[language];
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
  /** Apply a market edit, reset, import or undo while keeping the matching undo state. */
  function applyMarketAction(action: MarketEditAction) {
    const next = updateMarketWithUndo(market, undo, action);
    setUndo(next.undo);

    if (next.market !== market)
      setDraft((current) => ({ ...current, market: next.market }));
  }
  /** Route an edited market draft through the shared undo-aware action handler. */
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
        <span className="tiny-label">{text.calibrationNote}</span>
        <h3>{text.calibrationHeadline}</h3>
        <p>{text.calibrationDescription}</p>
        <div className="insight-divider" />
        <MarketDataInfo />
      </aside>
      <div>
        <div className="market-heading">
          <SectionHeading
            eyebrow={text.investmentEyebrow}
            title={text.marketTitle}
            description={text.marketDescription}
          >
            <div className="market-actions">
              <button
                type="button"
                className="button button-light"
                onClick={() => applyMarketAction({ type: "reset" })}
                disabled={isExample}
              >
                ↺ &nbsp; {text.reset}
              </button>
              <button
                type="button"
                className="button button-light"
                onClick={() => applyMarketAction({ type: "undo" })}
                disabled={!undo}
              >
                {text.undo}
              </button>
            </div>
          </SectionHeading>
        </div>
        <div className="form-card market-input-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">{text.yourMarket}</span>
              <h3>{text.marketInputs}</h3>
            </div>
          </div>
          <p>
            {text.marketFitBefore}{" "}
            <TermLink term="mortality-fit">{text.mortalityModel}</TermLink>
            {language === "en" ? ". " : " "}
            {text.marketFitAfter}
          </p>
          <div className="input-grid market-input-grid">
            <label>
              {text.currency}
              <select defaultValue="EUR">
                <option value="EUR">EUR — Euro</option>
              </select>
            </label>
            <label>
              {text.riskFree}
              <div
                className={`input-suffix${riskFreeError ? " input-suffix-invalid" : ""}`}
              >
                <input
                  value={market.nominalRiskFreePercent}
                  aria-invalid={!!riskFreeError}
                  aria-describedby="risk-free-rate-hint market-validation-messages"
                  onChange={(event) => {
                    if (isEditableDecimal(event.target.value))
                      editMarket({
                        ...market,
                        nominalRiskFreePercent: event.target.value,
                      });
                  }}
                  inputMode="decimal"
                />
                <span>{text.perYear}</span>
              </div>
              <small id="risk-free-rate-hint" className="cohort-input-hint">
                {realRate === null
                  ? text.invalidRates
                  : text.realRateLabel(
                      Number((realRate * 100).toPrecision(4)).toLocaleString(
                        language === "de" ? "de-DE" : "en-US",
                        { maximumSignificantDigits: 4 },
                      ),
                    )}
              </small>
            </label>
            <label>
              {text.inflation}
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
                <span>{text.perYear}</span>
              </div>
              <small
                id="inflation-error"
                className="field-error"
                aria-live="polite"
              >
                {inflationError && validationMessage(inflationError, language)}
              </small>
            </label>
          </div>
        </div>
        <MarketEditor
          market={market}
          onChange={editMarket}
          onImport={(next) =>
            applyMarketAction({ type: "replace", market: next })
          }
        />
        {hasHistoricalCsvCalibration && (
          <div className="form-card diagnostic-card">
            <div className="card-heading">
              <div>
                <span className="tiny-label">{placeholder.historical}</span>
                <h3>{placeholder.uncertainty}</h3>
                <p>{placeholder.available}</p>
              </div>
              <StatusBadge status="not-calculated" />
            </div>
            <div className="diagnostic-meta">
              {placeholder.meta.map((label) => (
                <span key={label}>
                  {label} <b>—</b>
                </span>
              ))}
            </div>
            <div className="capital-table-wrap">
              <table className="capital-table">
                <thead>
                  <tr>
                    <th>{placeholder.asset}</th>
                    <th>{placeholder.annualReturn}</th>
                    <th>{placeholder.confidence}</th>
                    <th>{placeholder.volatility}</th>
                  </tr>
                </thead>
                <tbody>
                  {market.assets.map((asset, index) => (
                    <tr key={asset.id}>
                      <td>
                        {asset.name.trim() ||
                          `${placeholder.assetFallback} ${index + 1}`}
                      </td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="borrowing-details diagnostic-details">
              <summary>{placeholder.covariance}</summary>
              <dl>
                <div>
                  <dt>{placeholder.widest}</dt>
                  <dd>—</dd>
                </div>
                <div>
                  <dt>{placeholder.pair}</dt>
                  <dd>—</dd>
                </div>
                <div>
                  <dt>{placeholder.conditioning}</dt>
                  <dd>{placeholder.notEvaluated}</dd>
                </div>
              </dl>
              <p>{placeholder.widestNote}</p>
            </details>
            <p className="chart-disclaimer">{placeholder.intervalNote}</p>
          </div>
        )}
        {hasHistoricalCsvCalibration && (
          <div className="form-card diagnostic-card">
            <div className="card-heading">
              <div>
                <span className="tiny-label">{placeholder.comparison}</span>
                <h3>{placeholder.scenarios}</h3>
                <p>{placeholder.scenarioIntro}</p>
              </div>
              <StatusBadge status="not-calculated" />
            </div>
            <label className="check-card scenario-toggle">
              <input
                type="checkbox"
                checked={stress}
                onChange={(event) => setStress(event.target.checked)}
              />
              <span>
                <strong>{placeholder.explore}</strong>
                <small>{placeholder.recalculate}</small>
              </span>
            </label>
            {stress && (
              <>
                <div className="capital-table-wrap">
                  <table className="capital-table">
                    <thead>
                      <tr>
                        <th>{placeholder.scenario}</th>
                        <th>{placeholder.assumptions}</th>
                        <th>{placeholder.diagnostics}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placeholder.rows.map(([name, assumption]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>{assumption}</td>
                          <td>{placeholder.notEvaluated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="chart-disclaimer">{placeholder.scenarioNote}</p>
              </>
            )}
          </div>
        )}
        <MarketValidation market={market} />
        <MarketAssumptionChecks market={market} />
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
  const { language } = useLanguage();
  const text = setupMessages[language];
  const { draft, setDraft } = useSimulationDraft();
  const { investor } = draft;
  const [undoInvestor, setUndoInvestor] = useState<
    SimulationDraft["investor"] | null
  >(null);
  const exampleInvestor = initialSimulationDraft().investor;
  const isExample =
    JSON.stringify(investor) === JSON.stringify(exampleInvestor);
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
  /** Merge a partial investor-input edit into the shared draft without changing the market or simulation settings. */
  function updateInvestor(change: Partial<typeof investor>) {
    setDraft((current) => ({
      ...current,
      investor: { ...current.investor, ...change },
    }));
  }

  /** Restore the example investor and retain the current inputs for one undo. */
  function resetInvestor() {
    setUndoInvestor({ ...investor });
    setDraft((current) => ({ ...current, investor: exampleInvestor }));
  }

  /** Restore the saved pre-reset investor, including edits made before reset. */
  function undoInvestorReset() {
    if (!undoInvestor) return;

    setDraft((current) => ({ ...current, investor: undoInvestor }));
    setUndoInvestor(null);
  }

  return (
    <div className="setup-layout">
      <aside className="insight-card">
        <div className="insight-art mortality-art">
          <span>✳</span>
          <div className="orbit one" />
          <div className="orbit two" />
        </div>
        <span className="tiny-label">{text.mortalityData}</span>
        <h3>{text.cohortHeadline}</h3>
        <p>{text.cohortDescription}</p>
        <div className="insight-divider" />
        <MortalityDataInfo />
      </aside>
      <div>
        <SectionHeading
          eyebrow={text.retirementProfile}
          title={text.investorTitle}
          description={text.investorDescription}
        >
          <div className="market-actions">
            <button
              type="button"
              className="button button-light"
              onClick={resetInvestor}
              disabled={isExample}
            >
              ↺ &nbsp; {text.reset}
            </button>
            <button
              type="button"
              className="button button-light"
              onClick={undoInvestorReset}
              disabled={!undoInvestor}
            >
              {text.undo}
            </button>
          </div>
        </SectionHeading>
        <div className="form-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">{text.retirementProfile}</span>
              <h3>{text.details}</h3>
            </div>
          </div>
          <div className="input-grid">
            <label>
              {text.birthYear}
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
                {cohortYears.birthError
                  ? validationMessage(cohortYears.birthError, language)
                  : `${text.availableCohorts}: ${FIRST_COHORT_YEAR}–${LAST_COHORT_YEAR}.`}
              </small>
            </label>
            <label>
              {text.retirementYear}
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
                {cohortYears.retirementError
                  ? validationMessage(cohortYears.retirementError, language)
                  : text.supportedAges}
              </small>
            </label>
            <label>
              {text.mortalityTable}
              <select
                value={mortality}
                onChange={(event) =>
                  updateInvestor({
                    mortality: event.target.value as typeof investor.mortality,
                  })
                }
              >
                <option value="female">{text.female}</option>
                <option value="male">{text.male}</option>
                <option value="custom">{text.mixture}</option>
              </select>
            </label>
            <label>
              {text.longevity}
              <select
                value={investor.longevity}
                onChange={(event) =>
                  updateInvestor({
                    longevity: event.target.value as typeof investor.longevity,
                  })
                }
              >
                <option value="medium">{text.medium}</option>
                <option value="low">{text.low}</option>
                <option value="high">{text.high}</option>
              </select>
            </label>
            <label>
              {text.initialCapital}
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
                  {text.impoverishment}
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
                  ? text.thresholdError
                  : `${thresholdPercent < 0.01 ? text.lessThan : new Intl.NumberFormat(language === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 2 }).format(thresholdPercent)}% ${text.ofCapital}`}
              </small>
            </div>
          </div>
          {mortality === "custom" && (
            <div className="mortality-mixture">
              <label className="field-label" htmlFor="mortality-mix">
                {text.maleWeight} <b>{mix.toFixed(2)}</b>
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
                <span>0 · {text.female}</span>
                <span>1 · {text.male}</span>
              </div>
              <p id="mix-description">{text.mixtureDescription}</p>
            </div>
          )}
        </div>
        <div className="form-card mortality-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">{text.mortalityCalibration}</span>
              <div className="panel-help-heading">
                <h3>{text.survivalFit}</h3>
                <PanelHelp panel="mortality" />
              </div>
            </div>
          </div>
          <p>
            {language === "de" ? (
              <>
                {text.cohortIntro}{" "}
                <TermLink term="survival">{text.survivalLink}</TermLink> Ihrer{" "}
                <TermLink term="cohort">{text.cohortLink}</TermLink>{" "}
              </>
            ) : (
              <>
                {text.cohortIntro}{" "}
                <TermLink term="cohort">{text.cohortLink}</TermLink>{" "}
                <TermLink term="survival">{text.survivalLink}</TermLink>{" "}
              </>
            )}
            {text.fitModelsIntro}{" "}
            <TermLink term="mortality-models">{text.modelsLink}</TermLink>.{" "}
            <span role="status">
              {ceFitStatus === "needs-update" ? text.fitStale : text.fitReview}{" "}
              {text.cohortUnchanged}
            </span>
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
 * Switch between market and investor tabs. Both remain mounted across tab
 * changes; the shared draft separately restores editable values on reload.
 */
export function Setup() {
  const { language } = useLanguage();
  const text = setupMessages[language];
  const [tab, setTab] = useState<"market" | "investor">("market");
  const [ceFitStatus, setCeFitStatus] = useState<CeFitStatus>("not-fitted");
  const { setupName, setSetupName } = useSimulationDraft();

  return (
    <section className="view active">
      <PageHeading
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      >
        <div className="heading-actions">
          <SetupFileActions />
        </div>
      </PageHeading>
      <PreviewBanner>
        <strong>{text.preview}</strong> {text.previewDescription}
      </PreviewBanner>
      <div className="form-card setup-name-card">
        <div className="card-heading">
          <div>
            <span className="tiny-label">{text.yourSetup}</span>
            <h3>{text.nameSetup}</h3>
            <p>{text.savedNote}</p>
          </div>
        </div>
        <div className="input-grid">
          <label>
            {text.setupName}
            <input
              type="text"
              value={setupName}
              maxLength={20}
              onChange={(event) => setSetupName(event.target.value)}
              onBlur={() => {
                if (!setupName.trim()) setSetupName(DEFAULT_SETUP_NAME);
              }}
            />
          </label>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label={text.tabs}>
        <button
          type="button"
          className={`tab ${tab === "market" ? "active" : ""}`}
          role="tab"
          aria-selected={tab === "market"}
          onClick={() => setTab("market")}
        >
          01 &nbsp; {text.market}
        </button>
        <button
          type="button"
          className={`tab ${tab === "investor" ? "active" : ""}`}
          role="tab"
          aria-selected={tab === "investor"}
          onClick={() => setTab("investor")}
        >
          02 &nbsp; {text.investor}
          {ceFitStatus === "needs-update" && ` · ${text.reviewFit}`}
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
