"use client";

import { useLanguage } from "../LanguageContext";
import { validationMessage } from "../../lib/i18n/validation";
import { visualMessages } from "../../lib/i18n/visuals";
import { chartMessages } from "../../lib/i18n/charts";

import { PanelHelp } from "../PanelHelp";

import { TermLink } from "../common";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateImpoverishmentForecast,
  type ImpoverishmentForecastPoint,
} from "../../lib/model/simulation/impoverishment-forecast";
import { prepareConditionalImpoverishmentForecast } from "../../lib/model/simulation/conditional-impoverishment-forecast";
import {
  prepareDurbinApproximation,
  type DurbinApproximation,
  type DurbinView,
} from "../../lib/model/analytical/durbin-approximation";
import {
  compareDurbinConditionalCdf,
  type DurbinCdfComparison,
} from "../../lib/model/analytical/durbin-cdf-comparison";
import { StatusBadge, type ResultStatus } from "../StatusBadge";
import { ChartExport } from "../ChartExport";
import type { EvaluationRun } from "./useEvaluationRun";
import {
  forecastYAxisRange,
  includeSelectedRiskPoint,
  makeTimingDensityBins,
  remainingRiskAt,
  simplifyRemainingRiskCurve,
  timingDensityAt,
} from "./timing-curve";

/** Display a static Plotly step curve and mark the selected attained age. */
function TimingPlot({
  points,
  retirementAge,
  selectedTime,
  horizon,
  conditional,
  density,
  overlay,
  projected,
  stale,
}: {
  points: readonly ImpoverishmentForecastPoint[];
  retirementAge: number;
  selectedTime: number;
  horizon: number;
  conditional: boolean;
  density: boolean;
  overlay?: Extract<DurbinView, { available: true }>;
  projected: boolean;
  stale: boolean;
}) {
  const { language } = useLanguage();
  const copy = chartMessages[language];
  const element = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState("light");
  const [plotError, setPlotError] = useState(false);
  const simplified = useMemo(
    () => (density ? [] : simplifyRemainingRiskCurve(points)),
    [points, density],
  );
  const bins = useMemo(
    () =>
      density
        ? makeTimingDensityBins(
            points,
            conditional ? { binCount: 30 } : { widthYears: 1 },
          )
        : [],
    [points, density, conditional],
  );
  const displayPoints = useMemo(
    () =>
      density ? [] : includeSelectedRiskPoint(simplified, points, selectedTime),
    [simplified, points, selectedTime, density],
  );

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setTheme(document.documentElement.dataset.theme ?? "light"),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    setTheme(document.documentElement.dataset.theme ?? "light");

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    node.dataset.exportReady = "false";

    let disposed = false;
    let cleanup: (() => void) | undefined;
    setPlotError(false);

    void (async () => {
      const { default: plotly } = await import("plotly.js-basic-dist-min");
      if (disposed) return;

      const colors = getComputedStyle(document.documentElement);
      const text = colors.getPropertyValue("--text-secondary").trim();
      const grid = colors.getPropertyValue("--chart-grid").trim();
      const accent = colors.getPropertyValue("--accent").trim();
      const approximationColor = colors
        .getPropertyValue("--chart-asset-2")
        .trim();
      const chosenAge = retirementAge + selectedTime;
      const selectedRisk = density
        ? timingDensityAt(bins, selectedTime)
        : remainingRiskAt(points, selectedTime);
      const forecastRange = conditional
        ? undefined
        : forecastYAxisRange(
            density
              ? bins.map((bin) => bin.density)
              : [remainingRiskAt(points, points[0].timeYears)],
            overlay
              ? (density ? overlay.density : overlay.tail).map(
                  (point) => point.value,
                )
              : [],
          );

      await plotly.react(
        node,
        [
          ...(density
            ? [
                {
                  x: bins.map(
                    (bin) => retirementAge + (bin.startTime + bin.endTime) / 2,
                  ),
                  y: bins.map((bin) => bin.density),
                  width: bins.map((bin) => bin.endTime - bin.startTime),
                  type: "bar",
                  name: copy.simulation,
                  marker: { color: accent },
                  opacity: 0.65,
                  hoverinfo: "skip",
                },
              ]
            : [
                {
                  x: displayPoints.map(
                    (point) => retirementAge + point.timeYears,
                  ),
                  y: displayPoints.map((point) => point.cumulativeRisk),
                  type: "scatter",
                  mode: "lines",
                  name: copy.simulation,
                  line: { color: accent, width: 2.5, shape: "hv" },
                  hoverinfo: "skip",
                },
              ]),
          ...(overlay
            ? [
                {
                  x: (density ? overlay.density : overlay.tail).map(
                    (point) => retirementAge + point.timeYears,
                  ),
                  y: (density ? overlay.density : overlay.tail).map(
                    (point) => point.value,
                  ),
                  type: "scatter",
                  mode: "lines",
                  name: copy.durbin,
                  line: { color: approximationColor, width: 2, dash: "dash" },
                  hoverinfo: "skip",
                },
              ]
            : []),
          {
            x: [chosenAge],
            y: [selectedRisk],
            type: "scatter",
            mode: "markers",
            name: copy.selectedAge,
            marker: { color: accent, size: 9 },
            cliponaxis: false,
            showlegend: false,
            hoverinfo: "skip",
          },
        ],
        {
          autosize: true,
          height: 300,
          margin: { l: 72, r: 15, t: overlay ? 45 : 15, b: 60 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: text },
          xaxis: {
            title: { text: copy.attainedAge, standoff: 10 },
            range: [
              conditional ? chosenAge : retirementAge,
              retirementAge + horizon,
            ],
            showline: true,
            linecolor: text,
            gridcolor: grid,
            automargin: true,
          },
          yaxis: {
            title: {
              text: density ? copy.riskDensity : copy.riskAfterAge,
              standoff: 6,
            },
            tickformat: ".1%",
            ticklabelstandoff: 8,
            rangemode: "tozero",
            range: forecastRange,
            gridcolor: grid,
            automargin: true,
          },
          shapes: [
            ...(!conditional
              ? [
                  {
                    type: "rect",
                    xref: "x",
                    yref: "paper",
                    x0: chosenAge,
                    x1: retirementAge + horizon,
                    y0: 0,
                    y1: 1,
                    fillcolor: accent,
                    opacity: 0.07,
                    line: { width: 0 },
                    layer: "below",
                  },
                ]
              : []),
            ...(!conditional
              ? [
                  {
                    type: "line",
                    xref: "x",
                    yref: "y",
                    x0: retirementAge,
                    x1: chosenAge,
                    y0: selectedRisk,
                    y1: selectedRisk,
                    layer: "between",
                    line: { color: accent, width: 1, dash: "dash" },
                  },
                  {
                    type: "line",
                    xref: "x",
                    yref: "paper",
                    x0: chosenAge,
                    x1: chosenAge,
                    y0: 0,
                    y1: 1,
                    line: { color: text, width: 1.5, dash: "dot" },
                  },
                ]
              : []),
          ],
          showlegend: Boolean(overlay),
          legend: { orientation: "h", x: 0, y: 1.12 },
        },
        {
          responsive: true,
          staticPlot: true,
          displaylogo: false,
          displayModeBar: false,
        },
      );

      if (disposed) {
        plotly.purge(node);
        return;
      }

      node.dataset.exportReady = "true";

      const resize = new ResizeObserver(() => {
        if (node.clientWidth > 0) void plotly.Plots.resize(node);
      });
      resize.observe(node);
      cleanup = () => {
        resize.disconnect();
        plotly.purge(node);
      };
    })().catch(() => {
      if (!disposed) setPlotError(true);
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [
    points,
    displayPoints,
    bins,
    density,
    overlay,
    retirementAge,
    selectedTime,
    horizon,
    conditional,
    theme,
    language,
  ]);

  return (
    <>
      {plotError && <p role="alert">{copy.timingError}</p>}
      <div
        ref={element}
        role="img"
        aria-label={
          language === "en"
            ? `${conditional ? "Conditional" : "Forecast"} ${density ? "impoverishment risk density" : "remaining impoverishment risk"} by attained age`
            : `${conditional ? copy.conditional : copy.forecast}: ${density ? copy.densityTitle : copy.remainingRisk} · ${copy.attainedAge}`
        }
      />
      <ChartExport
        element={element}
        filename="impoverishment-timing"
        context={{
          title: density ? copy.densityTitle : copy.remainingRisk,
          xUnit: copy.attainedAgeUnit,
          yUnit: density ? copy.probabilityPerYear : copy.probability,
          view: `${projected ? copy.projected : copy.unconstrained} ${copy.policy}; ${conditional ? copy.conditional : copy.forecast}; ${copy.selectedAge} ${retirementAge + selectedTime}${stale ? `; ${copy.previousSettings}` : ""}`,
        }}
      />
    </>
  );
}

/** Show simulated GM-mortality forecast or conditional cumulative risk by age. */
export function TimingCard({
  run,
  stale,
  projected,
}: {
  run: EvaluationRun | null;
  stale: boolean;
  projected: boolean;
}) {
  const { language } = useLanguage();
  const text = visualMessages[language];
  const [conditional, setConditional] = useState(false);
  const [density, setDensity] = useState(false);
  const [showDurbin, setShowDurbin] = useState(false);
  const [selectedTime, setSelectedTime] = useState(0);
  const running =
    run?.phase === "starting" ||
    run?.phase === "running" ||
    run?.phase === "cancelling";
  const hits = projected
    ? run?.timing?.projectedFirstHitTimes
    : run?.timing?.firstHitTimes;
  const retirementAge = run
    ? run.options.investor.retirementYear - run.options.investor.birthYear
    : null;
  const horizon = run?.numerical.horizonYears ?? 0;
  // Keep the selected age before the endpoint, where the conditional law may be undefined.
  const latestTime = Math.max(
    0,
    horizon - Math.min(1 / 365.25, horizon / 1000),
  );
  const time = Math.min(selectedTime, latestTime);
  const prepared = useMemo(() => {
    if (!hits || !run?.timing) return null;
    const input = {
      firstHitTimes: hits,
      horizonYears: horizon,
      mortality: { model: "gm" as const, parameters: run.timing.gm },
    };

    return {
      forecast: calculateImpoverishmentForecast(input),
      conditional: prepareConditionalImpoverishmentForecast(input),
    };
  }, [hits, run?.timing, horizon]);
  const durbin = useMemo(():
    { approximation: DurbinApproximation } | { message: string } | null => {
    if (!showDurbin || projected || !run?.timing?.durbin || !run.risk)
      return null;

    try {
      return {
        approximation: prepareDurbinApproximation({
          ...run.timing.durbin,
          gm: run.timing.gm,
          ceRisk: run.risk.ceBenchmark,
          horizonYears: horizon,
        }),
      };
    } catch (error) {
      return {
        message:
          error instanceof Error
            ? error.message
            : "The Durbin approximation could not be calculated.",
      };
    }
  }, [showDurbin, projected, run?.timing, run?.risk, horizon]);
  const cdfComparison = useMemo(():
    DurbinCdfComparison | { message: string } | null => {
    if (!durbin || "message" in durbin || !run?.timing) return null;

    try {
      return compareDurbinConditionalCdf({
        firstHitTimes: run.timing.firstHitTimes,
        ce: run.timing.durbin.ce,
        horizonYears: horizon,
        approximation: durbin.approximation,
      });
    } catch (error) {
      return {
        message:
          error instanceof Error
            ? error.message
            : "The CDF comparison could not be calculated.",
      };
    }
  }, [durbin, run?.timing, horizon]);
  const durbinView = useMemo((): DurbinView | { message: string } | null => {
    if (!durbin || "message" in durbin) return durbin;

    try {
      return durbin.approximation.view(conditional ? time : null);
    } catch (error) {
      return {
        message:
          error instanceof Error
            ? error.message
            : "The Durbin approximation could not be evaluated.",
      };
    }
  }, [durbin, conditional, time]);
  const update = useMemo(
    () => (conditional ? prepared?.conditional.atTime(time) : undefined),
    [conditional, prepared, time],
  );
  const points = conditional
    ? update?.available
      ? update.points
      : null
    : prepared?.forecast.points;
  const status: ResultStatus = running
    ? "running"
    : hits && stale
      ? "needs-updating"
      : hits && points
        ? "calculated"
        : hits
          ? "not-available"
          : run?.phase === "error"
            ? "error"
            : run?.phase === "cancelled"
              ? "cancelled"
              : "not-calculated";
  const forecastRemaining = prepared
    ? remainingRiskAt(prepared.forecast.points, time)
    : null;
  const remainingRisk = conditional
    ? update?.available
      ? update.points[update.points.length - 1].cumulativeRisk
      : null
    : forecastRemaining;

  return (
    <article className="chart-card timing-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">
            {projected ? text.projectedPolicy : text.unconstrainedPolicy} ·{" "}
            {text.gmMortality}
          </span>
          <div className="panel-help-heading">
            <h3>{text.timingTitle}</h3>
            <PanelHelp panel="timing" />
          </div>
          <p className="timing-intro">
            {text.timingIntroStart}{" "}
            <TermLink term="timing">{text.timingLink}</TermLink>{" "}
            {text.timingIntroMiddle}{" "}
            <TermLink term="density">{text.densityLink}</TermLink>.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {stale && hits && <p role="status">{text.stale}</p>}
      <div className="timing-controls">
        <fieldset>
          <legend>{text.perspective}</legend>
          <div className="segmented timing-switch">
            <button
              type="button"
              className={!conditional ? "selected" : ""}
              aria-pressed={!conditional}
              onClick={() => setConditional(false)}
            >
              {text.forecast}
            </button>
            <button
              type="button"
              className={conditional ? "selected" : ""}
              aria-pressed={conditional}
              onClick={() => setConditional(true)}
            >
              {text.conditional}
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>{text.chart}</legend>
          <div className="segmented timing-switch">
            <button
              type="button"
              className={density ? "selected" : ""}
              aria-pressed={density}
              onClick={() => setDensity(true)}
            >
              {text.density}
            </button>
            <button
              type="button"
              className={!density ? "selected" : ""}
              aria-pressed={!density}
              onClick={() => setDensity(false)}
            >
              {text.remainingRisk}
            </button>
          </div>
        </fieldset>
      </div>
      {running && <p role="status">{text.running}</p>}
      {!running && !hits && (
        <p role="status">
          {projected && run?.timing ? text.runProjected : text.runSimulation}
        </p>
      )}
      {!running && prepared && retirementAge !== null && (
        <>
          {points && (
            <div className="timing-chart">
              <TimingPlot
                points={points}
                retirementAge={retirementAge}
                selectedTime={time}
                horizon={horizon}
                conditional={conditional}
                density={density}
                projected={projected}
                stale={stale}
                overlay={
                  durbinView &&
                  "available" in durbinView &&
                  durbinView.available
                    ? durbinView
                    : undefined
                }
              />
            </div>
          )}
          <label className="field-label timing-age-label" htmlFor="timing-age">
            {text.selectedAge}{" "}
            <b>
              {(retirementAge + time).toFixed(1)} {text.years}
            </b>
          </label>
          <input
            id="timing-age"
            className="timing-age-slider"
            type="range"
            min="0"
            max={latestTime}
            step="any"
            value={time}
            disabled={latestTime === 0}
            onChange={(event) => setSelectedTime(Number(event.target.value))}
          />
          {!running && hits && conditional && update && !update.available && (
            <p role="status">
              {update.reason === "no-eligible-paths"
                ? text.noPaths
                : update.reason === "no-mortality-survival"
                  ? text.noSurvival
                  : text.selectEarlier}
            </p>
          )}
          <p className="timing-explanation">
            {conditional ? text.conditionalRisk : text.forecastRisk}:{" "}
            <strong>
              {remainingRisk === null
                ? "—"
                : `${(Math.max(0, remainingRisk) * 100).toFixed(3)}%`}
            </strong>
            .
          </p>
          <p className="chart-disclaimer">
            <TermLink term="gm-risk">{text.gmLink}</TermLink> ·{" "}
            {text.timingNote(projected, (retirementAge + horizon).toFixed(1))}{" "}
            {density
              ? conditional
                ? text.conditionalDensityNote
                : text.densityNote
              : text.cumulativeNote}
          </p>
          <details className="borrowing-details timing-diagnostics">
            <summary>{text.timingDetails}</summary>
            {!projected && (
              <>
                <label className="timing-approximation">
                  <input
                    type="checkbox"
                    checked={showDurbin}
                    disabled={running || !run?.timing?.durbin || !run?.risk}
                    onChange={(event) => setShowDurbin(event.target.checked)}
                  />
                  <span>{text.showDurbin}</span>
                </label>
                {showDurbin &&
                  !projected &&
                  durbinView &&
                  ("message" in durbinView || !durbinView.available) && (
                    <p role="status">
                      {"message" in durbinView
                        ? validationMessage(durbinView.message, language)
                        : durbinView.reason === "unstable-conditioning"
                          ? text.unstable
                          : durbinView.reason === "invalid-probability"
                            ? text.invalidRisk
                            : text.selectEarlier}
                    </p>
                  )}
                {!run?.timing?.durbin && <p>{text.newSimulation}</p>}
              </>
            )}
            <dl>
              <div>
                <dt>{text.pathsSimulated}</dt>
                <dd>{hits?.length.toLocaleString("en-US")}</dd>
              </div>
              {conditional && update?.available && (
                <div>
                  <dt>{text.noEarlierHit}</dt>
                  <dd>{update.eligiblePaths.toLocaleString("en-US")}</dd>
                </div>
              )}
              <div>
                <dt>{text.horizon}</dt>
                <dd>
                  {horizon.toFixed(2)} {text.yearsAfter}
                </dd>
              </div>
              {!projected && (
                <div>
                  <dt>{text.ceBound}</dt>
                  <dd>
                    {durbin && "approximation" in durbin
                      ? durbin.approximation.ceConditionalEventTvBound === null
                        ? text.unavailable
                        : `${(durbin.approximation.ceConditionalEventTvBound * 100).toFixed(2)} pp`
                      : text.enableApprox}
                  </dd>
                </div>
              )}
              {!projected && (
                <div>
                  <dt>{text.cdfDistance}</dt>
                  <dd>
                    {!cdfComparison
                      ? text.enableApprox
                      : "message" in cdfComparison
                        ? text.failed
                        : cdfComparison.available
                          ? `${(cdfComparison.supDistance * 100).toFixed(2)} pp`
                          : cdfComparison.reason === "truncated-horizon"
                            ? text.fullHorizon
                            : cdfComparison.reason === "no-weighted-hits"
                              ? text.noHits
                              : text.zeroRisk}
                  </dd>
                </div>
              )}
            </dl>
            {!projected && (
              <p>
                {text.ceBoundPrefix}{" "}
                <TermLink term="durbin">{text.ceBoundLink}</TermLink>{" "}
                {text.ceBoundExplanation}
              </p>
            )}
            {!projected && cdfComparison && "message" in cdfComparison && (
              <p role="status">
                {validationMessage(cdfComparison.message, language)}
              </p>
            )}
            <p>
              {text.simulationErrorBefore}{" "}
              <TermLink term="first-passage">{text.bridgeLink}</TermLink>
              {language === "en" ? " " : ""}
              {text.simulationErrorAfter}
            </p>
          </details>
        </>
      )}
    </article>
  );
}
