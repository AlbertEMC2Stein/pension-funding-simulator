"use client";

import { TermLink } from "../common";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  allocationTimeLimit,
  makeAllocationData,
  type AllocationData,
} from "./allocation-data";
import type { RiskWithdrawalWithCovariance } from "./RiskWithdrawalChart";
import {
  prepareProjectionCurve,
  type ProjectionCurve,
} from "../../lib/model/analytical/projection-curve";
import { StatusBadge } from "../StatusBadge";
import { ChartExport } from "../ChartExport";

/** Render portfolio fractions without clipping short positions or borrowing. */
function AllocationPlot({
  data,
  assetNames,
  startingCapital,
  projected,
  selectedTime,
}: {
  data: AllocationData;
  projected: boolean;
  assetNames: readonly string[];
  /** At retirement only, when starting capital is within the plotted interval. */
  startingCapital: number | null;
  /** Selected time after retirement, in years. */
  selectedTime: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState("light");
  const [plotError, setPlotError] = useState(false);

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
      const traces: object[] = data.riskyFractions.map((values, index) => ({
        x: data.wealth,
        y: values,
        type: "scatter",
        mode: "lines",
        name: assetNames[index],
        line: {
          color: colors.getPropertyValue(`--chart-asset-${index + 1}`).trim(),
          width: 2,
        },
        hoverinfo: "skip",
      }));
      traces.push({
        x: data.wealth,
        y: data.riskFreeFractions,
        type: "scatter",
        mode: "lines",
        name: "Risk-free asset",
        line: { color: text, width: 2, dash: "dash" },
        hoverinfo: "skip",
      });

      await plotly.react(
        node,
        traces,
        {
          autosize: true,
          height: 300,
          margin: { l: 72, r: 15, t: 15, b: 55 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: text },
          xaxis: {
            title: { text: "Wealth (€)", standoff: 10 },
            tickprefix: "€",
            gridcolor: grid,
            range: [data.impoverishmentLevel, data.safeLevel],
            automargin: true,
          },
          yaxis: {
            title: { text: "Portfolio allocation", standoff: 6 },
            tickformat: ".0%",
            ticklabelstandoff: 8,
            gridcolor: grid,
            automargin: true,
          },
          shapes:
            startingCapital === null
              ? []
              : [
                  {
                    type: "line",
                    xref: "x",
                    yref: "paper",
                    x0: startingCapital,
                    x1: startingCapital,
                    y0: 0,
                    y1: 1,
                    layer: "between",
                    line: { color: text, width: 1.5, dash: "dot" },
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
  }, [data, assetNames, startingCapital, theme]);

  return (
    <>
      {plotError && (
        <p role="alert">The allocation chart could not be displayed.</p>
      )}
      <div
        ref={element}
        role="img"
        aria-label={`${projected ? "Projected" : "Unconstrained"} CE portfolio allocation by wealth`}
      />
      <ul
        className="allocation-legend"
        aria-label="Portfolio allocation legend"
      >
        {assetNames.map((name, index) => (
          <li key={index}>
            <span
              style={{ backgroundColor: `var(--chart-asset-${index + 1})` }}
              aria-hidden="true"
            />
            {name}
          </li>
        ))}
        <li>
          <span className="allocation-risk-free" aria-hidden="true" />
          Risk-free asset
        </li>
        {startingCapital !== null && (
          <li>
            <span className="allocation-starting-capital" aria-hidden="true" />
            Starting capital (t = 0)
          </li>
        )}
      </ul>
      <ChartExport
        element={element}
        filename="portfolio-allocation"
        context={{
          title: "Portfolio allocation",
          xUnit: "EUR wealth",
          yUnit: "portfolio fraction",
          view: `${projected ? "Projected" : "Unconstrained"} CE policy; ${selectedTime} years after retirement${startingCapital === null ? "" : `; starting capital EUR ${startingCapital}`}`,
        }}
        imageLegend={[
          ...assetNames.map((name, index) => ({
            name,
            colorVariable: `--chart-asset-${index + 1}`,
          })),
          {
            name: "Risk-free asset",
            colorVariable: "--text-secondary",
            dash: "dash",
          },
          ...(startingCapital === null
            ? []
            : [
                {
                  name: "Starting capital (t = 0)",
                  colorVariable: "--text-secondary",
                  dash: "dot" as const,
                },
              ]),
        ]}
      />
    </>
  );
}

/** Show the selected CE feedback across wealth at an adjustable time. */
export function AllocationCard({
  result,
  projected,
  assetNames,
}: {
  result: RiskWithdrawalWithCovariance;
  projected: boolean;
  assetNames: readonly string[];
}) {
  const [timePercent, setTimePercent] = useState(0);
  const prepared = useMemo<
    { projection?: ProjectionCurve } | { message: string }
  >(() => {
    if ("message" in result) return { message: result.message };
    if (!projected) return { projection: undefined };

    try {
      return {
        projection: prepareProjectionCurve({
          covariance: result.covariance,
          mertonDirection: result.model.market.mertonDirection,
          realRiskFreeRate: result.model.market.realRiskFreeRate,
          annualWithdrawal: result.data.selectedWithdrawal,
          impoverishmentLevel: result.model.impoverishmentLevel,
          mortalityEndpoint: result.model.mortality.tau,
          delta: result.model.mortality.p,
        }),
      };
    } catch (error) {
      return {
        message:
          error instanceof Error
            ? error.message
            : "The projected allocation could not be prepared.",
      };
    }
  }, [result, projected]);

  const chart = useMemo((): { data: AllocationData } | { message: string } => {
    if ("message" in result) return { message: result.message };
    if ("message" in prepared) return { message: prepared.message };

    const time =
      (allocationTimeLimit(result.model.mortality.tau) * timePercent) / 100;

    try {
      return {
        data: makeAllocationData(
          result.model,
          result.data.selectedWithdrawal,
          time,
          prepared.projection,
        ),
      };
    } catch (error) {
      return {
        message:
          error instanceof Error
            ? error.message
            : "The portfolio allocation could not be calculated.",
      };
    }
  }, [result, prepared, timePercent]);
  const endpoint = "data" in result ? result.model.mortality.tau : null;
  const timeLimit = endpoint === null ? null : allocationTimeLimit(endpoint);
  const selectedTime =
    timeLimit === null ? null : (timeLimit * timePercent) / 100;
  const startingCapital =
    "data" in result && selectedTime === 0 ? result.data.initialCapital : null;
  const startingCapitalVisible =
    startingCapital !== null &&
    "data" in chart &&
    startingCapital >= chart.data.impoverishmentLevel &&
    startingCapital <= chart.data.safeLevel;

  return (
    <article className="small-card">
      <div className="card-heading">
        <div>
          <span className="tiny-label">
            {projected ? "PROJECTED CE POLICY" : "UNCONSTRAINED CE POLICY"}
          </span>
          <h3>Portfolio allocation</h3>
        </div>
        <StatusBadge
          status={"data" in chart ? "calculated" : "not-available"}
        />
      </div>
      <p>
        <TermLink term="policy">Allocation</TermLink> by wealth between the{" "}
        <TermLink term="impoverishment">impoverishment</TermLink> and{" "}
        <TermLink term="safe-boundary">safe levels</TermLink>.
      </p>
      <label className="field-label" htmlFor="allocation-time">
        Time after retirement
      </label>
      <div className="allocation-time-control">
        <input
          id="allocation-time"
          type="range"
          min="0"
          max={timeLimit ?? 0}
          step="any"
          value={selectedTime ?? 0}
          disabled={timeLimit === null || timeLimit === 0}
          onChange={(event) =>
            setTimePercent(
              timeLimit ? (Number(event.target.value) / timeLimit) * 100 : 0,
            )
          }
        />
        <output htmlFor="allocation-time">
          {selectedTime === null
            ? "—"
            : `${selectedTime.toFixed(2)} / ${timeLimit!.toFixed(2)} years`}
        </output>
      </div>
      {"data" in chart ? (
        <>
          <AllocationPlot
            data={chart.data}
            projected={projected}
            selectedTime={selectedTime ?? 0}
            assetNames={assetNames}
            startingCapital={startingCapitalVisible ? startingCapital : null}
          />
          {startingCapital !== null && !startingCapitalVisible && (
            <p className="chart-disclaimer">
              Starting capital is outside the displayed wealth interval.
            </p>
          )}
          <p className="chart-disclaimer">
            The policy stops when the impoverishment level is reached.{" "}
            {projected
              ? "The projected allocation prevents short positions and borrowing."
              : "Negative fractions indicate short positions or borrowing."}{" "}
            The slider ends one day before the CE endpoint.
            {timeLimit === 0 &&
              " The endpoint is at most one day away, so the slider is disabled."}
          </p>
        </>
      ) : (
        <p role="status">{chart.message}</p>
      )}
    </article>
  );
}
