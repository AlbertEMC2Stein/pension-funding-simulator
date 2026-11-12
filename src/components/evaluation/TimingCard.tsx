"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateImpoverishmentForecast,
  type ImpoverishmentForecastPoint,
} from "../../lib/model/simulation/impoverishment-forecast";
import { prepareConditionalImpoverishmentForecast } from "../../lib/model/simulation/conditional-impoverishment-forecast";
import { StatusBadge, type ResultStatus } from "../StatusBadge";
import type { EvaluationRun } from "./useEvaluationRun";
import {
  includeSelectedRiskPoint,
  remainingRiskAt,
  simplifyRemainingRiskCurve,
} from "./timing-curve";

/** Display a static Plotly step curve and mark the selected attained age. */
function TimingPlot({
  points,
  retirementAge,
  selectedTime,
  horizon,
  conditional,
}: {
  points: readonly ImpoverishmentForecastPoint[];
  retirementAge: number;
  selectedTime: number;
  horizon: number;
  conditional: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState("light");
  const [plotError, setPlotError] = useState(false);
  const simplified = useMemo(
    () => simplifyRemainingRiskCurve(points),
    [points],
  );
  const displayPoints = useMemo(
    () => includeSelectedRiskPoint(simplified, points, selectedTime),
    [simplified, points, selectedTime],
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
      const chosenAge = retirementAge + selectedTime;
      const selectedRisk = remainingRiskAt(points, selectedTime);

      await plotly.react(
        node,
        [
          {
            x: displayPoints.map((point) => retirementAge + point.timeYears),
            y: displayPoints.map((point) => point.cumulativeRisk),
            type: "scatter",
            mode: "lines",
            line: { color: accent, width: 2.5, shape: "hv" },
            hoverinfo: "skip",
          },
          {
            x: [chosenAge],
            y: [selectedRisk],
            type: "scatter",
            mode: "markers",
            marker: { color: accent, size: 9 },
            cliponaxis: false,
            hoverinfo: "skip",
          },
        ],
        {
          autosize: true,
          height: 300,
          margin: { l: 72, r: 15, t: 15, b: 60 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: text },
          xaxis: {
            title: { text: "Attained age", standoff: 10 },
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
            title: { text: "Risk after age", standoff: 6 },
            tickformat: ".1%",
            ticklabelstandoff: 8,
            rangemode: "tozero",
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
          showlegend: false,
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
    retirementAge,
    selectedTime,
    horizon,
    conditional,
    theme,
  ]);

  return (
    <>
      {plotError && (
        <p role="alert">The timing chart could not be displayed.</p>
      )}
      <div
        ref={element}
        role="img"
        aria-label={`${conditional ? "Conditional" : "Forecast"} remaining impoverishment risk by attained age`}
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
  const [conditional, setConditional] = useState(false);
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
            {projected ? "PROJECTED POLICY" : "UNCONSTRAINED POLICY"} · GM
            MORTALITY
          </span>
          <h3>When might impoverishment occur?</h3>
          <p className="timing-intro">
            Explore risk across attained ages under the selected policy and
            fitted mortality model.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {stale && hits && (
        <p role="status">
          Settings changed since this run started. This chart uses the earlier
          settings.
        </p>
      )}
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
            <button type="button" disabled>
              Density
            </button>
            <button type="button" className="selected" aria-pressed="true">
              Remaining risk
            </button>
          </div>
        </fieldset>
      </div>
      {running && (
        <p role="status">
          Simulation running; timing results appear after the run completes.
        </p>
      )}
      {!running && !hits && (
        <p role="status">
          {projected && run?.timing
            ? "Run a projected-policy simulation to see this chart."
            : "Run a simulation to see this chart."}
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
              />
            </div>
          )}
          <label className="field-label timing-age-label" htmlFor="timing-age">
            Selected age <b>{(retirementAge + time).toFixed(1)} years</b>
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
                ? "No simulated paths remain without impoverishment at this age."
                : update.reason === "no-mortality-survival"
                  ? "Mortality survival at this age is numerically zero."
                  : "Select an age before the end of the simulation."}
            </p>
          )}
          <p className="timing-explanation">
            {conditional
              ? "Remaining risk through the run horizon, given survival without impoverishment to the selected age"
              : "Risk from the selected age through the run horizon, assessed at retirement"}
            :{" "}
            <strong>
              {remainingRisk === null
                ? "—"
                : `${(Math.max(0, remainingRisk) * 100).toFixed(3)}%`}
            </strong>
            .
          </p>
          <p className="chart-disclaimer">
            GM mortality · {projected ? "projected" : "unconstrained"} policy ·
            events through age {(retirementAge + horizon).toFixed(1)}. GM
            mortality may extend beyond this horizon. The curve is an estimate;
            time-step, bridge and Monte Carlo errors apply. The curve reaches
            zero at the end of the simulated horizon. Density view is not
            available yet.
          </p>
        </>
      )}
    </article>
  );
}
