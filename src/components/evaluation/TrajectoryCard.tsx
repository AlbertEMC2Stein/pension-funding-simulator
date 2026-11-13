"use client";

import { useLanguage } from "../LanguageContext";
import { visualMessages } from "../../lib/i18n/visuals";
import { chartMessages } from "../../lib/i18n/charts";

import { TermLink } from "../common";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge, type ResultStatus } from "../StatusBadge";
import { ChartExport } from "../ChartExport";
import type { EvaluationRun } from "./useEvaluationRun";
import type { TrajectorySamples } from "../../lib/model/simulation/tensorflow/run-scheduler";

/** Return the per-path opacity for a chart containing the given number of paths. */
export function trajectoryOpacity(count: number): number {
  return Math.min(0.75, Math.max(0.07, 0.8 / Math.sqrt(count)));
}

/**
 * Build a display-only path with at most roughly 500 grid points. The true
 * first-passage time and threshold are appended explicitly so simplification
 * never draws a path beyond its simulated stopping time.
 */
export function trajectoryPlotPoints(
  samples: TrajectorySamples,
  path: number,
  threshold: number,
) {
  const times: number[] = [];
  const wealth: number[] = [];
  const recordedHit = samples.firstHitTimes[path];
  const hit =
    recordedHit < 0
      ? recordedHit
      : Math.min(recordedHit, samples.times[samples.times.length - 1]);
  const stride = Math.max(1, Math.ceil((samples.times.length - 1) / 500));
  const offset = path * samples.times.length;

  for (let step = 0; step < samples.times.length; step += stride) {
    if (hit >= 0 && samples.times[step] >= hit) break;
    times.push(samples.times[step]);
    wealth.push(samples.values[offset + step]);
  }

  if (hit >= 0) {
    times.push(hit);
    wealth.push(threshold);
  } else {
    const last = samples.times.length - 1;
    if (times.at(-1) !== samples.times[last]) {
      times.push(samples.times[last]);
      wealth.push(samples.values[offset + last]);
    }
  }

  return { times, wealth };
}

/** Randomly permute retained path indices so shuffle never reruns the simulation. */
function shuffledIndices(count: number): number[] {
  const indices = Array.from({ length: count }, (_, index) => index);

  for (let index = count - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[other]] = [indices[other], indices[index]];
  }

  return indices;
}

/** Display a sampled, stopped wealth chart and controls for the captured run. */
export function TrajectoryCard({
  run,
  stale,
}: {
  run: EvaluationRun | null;
  stale: boolean;
}) {
  const { language } = useLanguage();
  const copy = chartMessages[language];
  const text = visualMessages[language];
  const samples = run?.trajectories;
  const threshold = run?.options.investor.impoverishmentLevel;
  const [count, setCount] = useState(20);
  const [order, setOrder] = useState<number[]>([]);
  const [theme, setTheme] = useState("light");
  const [plotError, setPlotError] = useState(false);
  const element = useRef<HTMLDivElement>(null);
  const displayed = samples ? Math.min(count, 150, samples.count) : 0;
  const selected = useMemo(() => order.slice(0, displayed), [order, displayed]);
  const running =
    run?.phase === "starting" ||
    run?.phase === "running" ||
    run?.phase === "cancelling";
  const status: ResultStatus = running
    ? "running"
    : stale && samples
      ? "needs-updating"
      : run?.phase === "error"
        ? "error"
        : run?.phase === "cancelled"
          ? "cancelled"
          : samples
            ? "calculated"
            : "not-calculated";

  useEffect(() => {
    setOrder(samples ? shuffledIndices(samples.count) : []);
  }, [samples]);

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
    if (!node || !samples || threshold === undefined || selected.length === 0)
      return;
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
      const color = colors.getPropertyValue("--chart-asset-1").trim();
      const traces: object[] = [];

      // Draw the borrowing region first so it stays behind the sample paths.
      if (samples.borrowingBoundary) {
        traces.push({
          x: [...samples.times, ...samples.times.slice().reverse()],
          y: [
            ...samples.borrowingBoundary,
            ...samples.times.map(() => threshold).reverse(),
          ],
          type: "scatter",
          mode: "lines",
          name: copy.borrowingRegion,
          fill: "toself",
          fillcolor: colors.getPropertyValue("--chart-borrowing-fill").trim(),
          line: { width: 0 },
          hoverinfo: "skip",
        });
      }

      traces.push(
        ...selected.map((index) => {
          const points = trajectoryPlotPoints(samples, index, threshold);
          return {
            x: points.times,
            y: points.wealth,
            type: "scatter",
            mode: "lines",
            name: `${copy.samplePath} ${index + 1}`,
            line: { color, width: 1.5 },
            opacity: trajectoryOpacity(selected.length),
            hoverinfo: "skip",
          };
        }),
      );
      traces.push({
        x: samples.times,
        y: samples.safeBoundary,
        type: "scatter",
        mode: "lines",
        name: copy.safeBoundary,
        line: { color: text, width: 2, dash: "dash" },
        hoverinfo: "skip",
      });

      await plotly.react(
        node,
        traces,
        {
          autosize: true,
          height: 330,
          margin: { l: 75, r: 18, t: 18, b: 55 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: text },
          xaxis: {
            title: { text: copy.yearsAfterRetirement, standoff: 10 },
            gridcolor: grid,
            automargin: true,
          },
          yaxis: {
            title: { text: copy.wealth, standoff: 6 },
            tickprefix: "€",
            ticklabelstandoff: 8,
            gridcolor: grid,
            automargin: true,
          },
          shapes: [
            {
              type: "line",
              xref: "paper",
              x0: 0,
              x1: 1,
              yref: "y",
              y0: threshold,
              y1: threshold,
              line: { color: text, width: 1, dash: "dot" },
            },
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
  }, [samples, threshold, selected, theme, language]);

  return (
    <article className="chart-card trajectory-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">
            {samples
              ? samples.projected
                ? text.projectedPolicy
                : text.unconstrainedPolicy
              : text.selectedPolicy}
          </span>
          <h3>{text.trajectories}</h3>
        </div>
        <StatusBadge status={status} />
      </div>
      <p>
        {language === "de" ? (
          <>
            Diese <TermLink term="trajectories">Beispielpfade</TermLink> setzen
            voraus, dass Sie am Leben bleiben. Sie enden bei Verarmung oder am
            Strategiehorizont und sind keine Vorhersagen.
          </>
        ) : (
          <>
            These <TermLink term="trajectories">example paths</TermLink> assume
            you remain alive. Each ends at impoverishment or the policy horizon;
            they are not predictions.
          </>
        )}
      </p>
      {samples ? (
        <>
          <div className="trajectory-controls">
            <div className="trajectory-count-control">
              <label className="field-label" htmlFor="trajectory-count">
                {text.paths}
              </label>
              <div className="allocation-time-control">
                <input
                  id="trajectory-count"
                  type="range"
                  min="1"
                  max={Math.min(150, samples.count)}
                  step="1"
                  value={displayed}
                  onChange={(event) => setCount(Number(event.target.value))}
                />
                <output htmlFor="trajectory-count">
                  {displayed} / {Math.min(150, samples.count)}
                </output>
              </div>
            </div>
            <button
              type="button"
              className="button button-light"
              onClick={() => setOrder(shuffledIndices(samples.count))}
              disabled={samples.count <= displayed}
            >
              {text.shuffle}
            </button>
          </div>
          <div ref={element} role="img" aria-label={copy.trajectories} />
          <ul
            className="allocation-legend trajectory-legend"
            aria-label={copy.trajectoryLegend}
          >
            <li>
              <span className="trajectory-path-key" aria-hidden="true" />
              {copy.samplePaths}
            </li>
            <li>
              <span className="allocation-risk-free" aria-hidden="true" />
              {copy.safeBoundary}
            </li>
            <li>
              <span
                className="allocation-starting-capital"
                aria-hidden="true"
              />
              {copy.impoverishmentLevel}
            </li>
            {samples.borrowingBoundary && (
              <li>
                <span className="trajectory-borrow-key" aria-hidden="true" />
                {copy.borrowingRegion}
              </li>
            )}
          </ul>
          <ChartExport
            element={element}
            filename="wealth-trajectories"
            context={{
              title: copy.trajectories,
              xUnit: copy.yearsAfterRetirement,
              yUnit: copy.euroWealth,
              view: `${samples.projected ? copy.projected : copy.unconstrained} ${copy.policy}; ${displayed} ${copy.samplePaths}; ${copy.impoverishmentLevel} EUR ${threshold}${stale ? `; ${copy.previousSettings}` : ""}`,
            }}
            imageLegend={[
              { name: copy.samplePaths, colorVariable: "--chart-asset-1" },
              {
                name: copy.safeBoundary,
                colorVariable: "--text-secondary",
                dash: "dash",
              },
              {
                name: copy.impoverishmentLevel,
                colorVariable: "--text-secondary",
                dash: "dot",
              },
              ...(samples.borrowingBoundary
                ? [
                    {
                      name: copy.borrowingRegion,
                      colorVariable: "--chart-borrowing-fill",
                    },
                  ]
                : []),
            ]}
          />
          {plotError && <p role="alert">{copy.trajectoryError}</p>}
          <p className="chart-disclaimer">
            {text.reducedGrid} {samples.borrowingBoundary && `${text.shade} `}
            {text.shuffled(samples.count)}
          </p>
        </>
      ) : (
        <p className="chart-disclaimer">{text.enableVisual}</p>
      )}
    </article>
  );
}
