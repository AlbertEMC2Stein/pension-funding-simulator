"use client";

import { useLanguage } from "../LanguageContext";
import { validationMessage } from "../../lib/i18n/validation";
import { visualMessages } from "../../lib/i18n/visuals";
import { chartMessages } from "../../lib/i18n/charts";

import { PanelHelp } from "../PanelHelp";

import { TermLink } from "../common";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  allocationTimeLimit,
  allocationValues,
  makeAllocationData,
  type AllocationData,
  type AllocationView,
} from "./allocation-data";
import type { RiskWithdrawalWithCovariance } from "./RiskWithdrawalChart";
import {
  prepareProjectionCurve,
  type ProjectionCurve,
} from "../../lib/model/analytical/projection-curve";
import { StatusBadge } from "../StatusBadge";
import { ChartExport } from "../ChartExport";

/** Render portfolio fractions or real euro positions, including negative holdings. */
function AllocationPlot({
  data,
  assetNames,
  startingCapital,
  projected,
  selectedTime,
  view,
}: {
  data: AllocationData;
  projected: boolean;
  assetNames: readonly string[];
  /** At retirement only, when starting capital is within the plotted interval. */
  startingCapital: number | null;
  /** Selected time after retirement, in years. */
  selectedTime: number;
  view: AllocationView;
}) {
  const { language } = useLanguage();
  const copy = chartMessages[language];
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
      const positions = allocationValues(data, view);
      const traces: object[] = positions.risky.map((values, index) => ({
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
        y: positions.riskFree,
        type: "scatter",
        mode: "lines",
        name: copy.riskFreeAsset,
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
            title: { text: copy.wealth, standoff: 10 },
            tickprefix: "€",
            gridcolor: grid,
            range: [data.impoverishmentLevel, data.safeLevel],
            automargin: true,
          },
          yaxis: {
            title: {
              text:
                view === "relative" ? copy.allocation : copy.allocationAmount,
              standoff: 6,
            },
            ...(view === "relative"
              ? { tickformat: ".0%" }
              : { tickprefix: "€", tickformat: "~s" }),
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
  }, [data, assetNames, startingCapital, theme, language, view]);

  return (
    <>
      {plotError && <p role="alert">{copy.allocationError}</p>}
      <div
        ref={element}
        role="img"
        aria-label={
          language === "en"
            ? `${projected ? "Projected" : "Unconstrained"} CE portfolio allocation by wealth`
            : `${projected ? copy.projected : copy.unconstrained} CE ${copy.allocation} nach Vermögensstand`
        }
      />
      <ul className="allocation-legend" aria-label={copy.allocationLegend}>
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
          {copy.riskFreeAsset}
        </li>
        {startingCapital !== null && (
          <li>
            <span className="allocation-starting-capital" aria-hidden="true" />
            {copy.startingCapital}
          </li>
        )}
      </ul>
      <ChartExport
        element={element}
        filename="portfolio-allocation"
        context={{
          title: copy.allocation,
          xUnit: copy.euroWealth,
          yUnit:
            view === "relative" ? copy.portfolioFraction : copy.realEuroAmount,
          view: `${projected ? copy.projected : copy.unconstrained} CE ${copy.policy}; ${view === "relative" ? copy.relativeAllocation : copy.amountAllocation}; ${selectedTime} ${copy.yearsAfterRetirement}${startingCapital === null ? "" : `; ${copy.capital} EUR ${startingCapital}`}`,
        }}
        imageLegend={[
          ...assetNames.map((name, index) => ({
            name,
            colorVariable: `--chart-asset-${index + 1}`,
          })),
          {
            name: copy.riskFreeAsset,
            colorVariable: "--text-secondary",
            dash: "dash",
          },
          ...(startingCapital === null
            ? []
            : [
                {
                  name: copy.startingCapital,
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
  const { language } = useLanguage();
  const text = visualMessages[language];
  const [timePercent, setTimePercent] = useState(0);
  const [view, setView] = useState<AllocationView>("relative");
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
            {projected ? text.projectedCE : text.unconstrainedCE}
          </span>
          <div className="panel-help-heading">
            <h3>{text.allocation}</h3>
            <PanelHelp panel="allocation" />
          </div>
        </div>
        <StatusBadge
          status={"data" in chart ? "calculated" : "not-available"}
        />
      </div>
      <p>
        {language === "de" ? (
          <>
            <TermLink term="policy">Aufteilung</TermLink> nach Vermögen zwischen
            der <TermLink term="impoverishment">Verarmungsgrenze</TermLink> und
            der <TermLink term="safe-boundary">sicheren Grenze</TermLink>.
          </>
        ) : (
          <>
            <TermLink term="policy">Allocation</TermLink> by wealth between the{" "}
            <TermLink term="impoverishment">impoverishment</TermLink> and{" "}
            <TermLink term="safe-boundary">safe levels</TermLink>.
          </>
        )}
      </p>
      <fieldset className="allocation-view-control">
        <legend>{text.allocationView}</legend>
        <div className="segmented timing-switch">
          <button
            type="button"
            className={view === "relative" ? "selected" : ""}
            aria-pressed={view === "relative"}
            onClick={() => setView("relative")}
          >
            {text.relativeAllocation}
          </button>
          <button
            type="button"
            className={view === "amount" ? "selected" : ""}
            aria-pressed={view === "amount"}
            onClick={() => setView("amount")}
          >
            {text.amountAllocation}
          </button>
        </div>
      </fieldset>
      <label className="field-label" htmlFor="allocation-time">
        {text.time}
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
            : `${selectedTime.toFixed(2)} / ${timeLimit!.toFixed(2)} ${text.years}`}
        </output>
      </div>
      {"data" in chart ? (
        <>
          <AllocationPlot
            data={chart.data}
            projected={projected}
            selectedTime={selectedTime ?? 0}
            view={view}
            assetNames={assetNames}
            startingCapital={startingCapitalVisible ? startingCapital : null}
          />
          {startingCapital !== null && !startingCapitalVisible && (
            <p className="chart-disclaimer">{text.capitalOutside}</p>
          )}
          <p className="chart-disclaimer">
            {text.stopped}{" "}
            {projected ? text.projectedNote : text.unconstrainedNote}{" "}
            {text.sliderEnd}
            {view === "amount" && ` ${text.realAmounts}`}
            {timeLimit === 0 && ` ${text.sliderDisabled}`}
          </p>
        </>
      ) : (
        <p role="status">{validationMessage(chart.message, language)}</p>
      )}
    </article>
  );
}
