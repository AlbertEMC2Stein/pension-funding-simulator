"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calibrateMarket } from "../../lib/market/calibrate-market";
import { mortalityFitKeys } from "../../lib/mortality/fit-status";
import {
  buildMarketOptions,
  parseAmount,
} from "../../lib/options/simulation-options";
import {
  compatibleRisk,
  compatibleWithdrawal,
  type CompatiblePolicyInputs,
} from "../../lib/model/analytical/compatible-policy";
import { safeWithdrawal } from "../../lib/model/analytical/safe-withdrawal";
import { useSimulationDraft } from "../SimulationDraftContext";

/** An analytical CE relationship and the current selection, in euros and probability. */
export interface ChartData {
  risks: number[];
  withdrawals: number[];
  selectedRisk: number;
  selectedWithdrawal: number;
  safeWithdrawal: number;
  custom: boolean;
}

/**
 * Build a finite portion of the unconstrained CE curve, including its
 * zero-risk endpoint. For withdrawals below the safe withdrawal, the selected
 * point is on the zero-risk vertical segment rather than the positive curve.
 */
export function makeChartData(
  model: CompatiblePolicyInputs,
  capital: number,
  withdrawal:
    | { mode: "targetRisk"; risk: number }
    | { mode: "customAmount"; amount: number },
): ChartData {
  const safe = safeWithdrawal({
    realRiskFreeRate: model.market.realRiskFreeRate,
    initialCapital: capital,
    impoverishmentLevel: model.impoverishmentLevel,
    mortalityEndpoint: model.mortality.tau,
  });
  const selectedWithdrawal =
    withdrawal.mode === "targetRisk"
      ? compatibleWithdrawal(model, capital, withdrawal.risk)
      : withdrawal.amount;

  if (!Number.isFinite(selectedWithdrawal) || selectedWithdrawal < 0)
    throw new RangeError("Enter a non-negative annual withdrawal.");

  const selectedRisk =
    withdrawal.mode === "targetRisk"
      ? withdrawal.risk
      : selectedWithdrawal <= safe
        ? 0
        : compatibleRisk(model, capital, selectedWithdrawal);

  if (!Number.isFinite(selectedRisk) || selectedRisk >= 1)
    throw new RangeError(
      "The selected risk is outside the supported numerical range.",
    );

  // Keep the selected point visible without evaluating the singular endpoint at 1.
  const maxRisk = Math.max(
    selectedRisk,
    Math.min(0.999999999, Math.max(0.1, selectedRisk * 1.2)),
  );
  // Uniform spacing in risk^(1/δ) resolves the steep curve near zero.
  const risks = Array.from(
    { length: 101 },
    (_, index) => maxRisk * (index / 100) ** model.mortality.p,
  );
  const withdrawals = risks.map((risk) =>
    risk === 0 ? safe : compatibleWithdrawal(model, capital, risk),
  );

  return {
    risks,
    withdrawals,
    selectedRisk,
    selectedWithdrawal,
    safeWithdrawal: safe,
    custom: withdrawal.mode === "customAmount",
  };
}

/** Render the CE relationship as a responsive, static Plotly chart. */
function Plot({ data }: { data: ChartData }) {
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
      const minimumWithdrawal = Math.min(
        data.selectedWithdrawal,
        ...data.withdrawals,
      );
      const maximumWithdrawal = Math.max(
        data.selectedWithdrawal,
        ...data.withdrawals,
      );
      const lowerWithdrawal = Math.max(0, minimumWithdrawal * 0.95);
      const upperWithdrawal = maximumWithdrawal * 1.05;
      const traces: object[] = [
        {
          x: data.risks,
          y: data.withdrawals,
          type: "scatter",
          mode: "lines",
          line: { color: accent, width: 3 },
          hoverinfo: "skip",
        },
        {
          x: [data.selectedRisk],
          y: [data.selectedWithdrawal],
          type: "scatter",
          mode: "markers",
          marker: { color: accent, size: 11 },
          hoverinfo: "skip",
        },
      ];

      if (
        data.selectedRisk === 0 &&
        data.selectedWithdrawal < data.safeWithdrawal
      )
        traces.unshift({
          x: [0, 0],
          y: [data.selectedWithdrawal, data.safeWithdrawal],
          type: "scatter",
          mode: "lines",
          line: { color: accent, width: 2 },
          hoverinfo: "skip",
        });

      await plotly.react(
        node,
        traces,
        {
          autosize: true,
          height: 320,
          margin: { l: 85, r: 20, t: 20, b: 60 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: text },
          xaxis: {
            title: { text: "CE lifetime impoverishment risk", standoff: 12 },
            tickformat: ".0%",
            gridcolor: grid,
            range: [0, data.risks[data.risks.length - 1] * 1.02],
            zeroline: false,
            showline: true,
            linecolor: text,
            automargin: true,
          },
          yaxis: {
            title: { text: "Annual withdrawal (€)", standoff: 12 },
            tickprefix: "€",
            separatethousands: true,
            gridcolor: grid,
            range: [lowerWithdrawal, upperWithdrawal],
            automargin: true,
          },
          // The fixed axis ranges keep the dashed guides attached to their axes.
          shapes: [
            {
              type: "line",
              xref: "x",
              yref: "y",
              x0: data.selectedRisk,
              x1: data.selectedRisk,
              y0: lowerWithdrawal,
              y1: data.selectedWithdrawal,
              layer: "between",
              line: { color: accent, width: 1, dash: "dash" },
            },
            {
              type: "line",
              xref: "x",
              yref: "y",
              x0: 0,
              x1: data.selectedRisk,
              y0: data.selectedWithdrawal,
              y1: data.selectedWithdrawal,
              layer: "between",
              line: { color: accent, width: 1, dash: "dash" },
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
  }, [data, theme]);

  return (
    <>
      {plotError && <p role="alert">The chart could not be displayed.</p>}
      <div
        ref={element}
        role="img"
        aria-label="Unconstrained CE model annual withdrawal against lifetime impoverishment risk"
      />
    </>
  );
}

/** Calculate and display the current unconstrained CE benchmark when its fit is current. */
export function RiskWithdrawalChart() {
  const { draft, mortalityFits } = useSimulationDraft();
  const result = useMemo((): { data: ChartData } | { message: string } => {
    const marketInput = buildMarketOptions(draft.market);
    if (!marketInput.ok)
      return { message: "Check the market inputs to calculate this curve." };

    const market = calibrateMarket(marketInput.market);
    if (!market.ok) return { message: market.error };
    if (!market.market.paperAssumptions.positiveRho)
      return {
        message:
          "The CE relationship requires a positive market risk premium (rho).",
      };

    const keys = mortalityFitKeys({ ...draft.investor, market: market.market });
    const fit = mortalityFits.ce;
    if (!fit)
      return {
        message:
          "Fit the mortality models in Market & investor to calculate this curve.",
      };
    if (fit.key !== keys.ce)
      return {
        message:
          "The CE mortality fit needs updating after your input changes.",
      };
    if (!fit.fit.converged)
      return {
        message:
          "The CE mortality fit did not converge. Review the fit before using this curve.",
      };

    const capital = parseAmount(draft.investor.initialCapital);
    const threshold = parseAmount(draft.investor.impoverishmentLevel);
    if (
      capital === null ||
      threshold === null ||
      threshold < 1 ||
      capital <= threshold
    )
      return {
        message:
          "Enter valid capital and impoverishment amounts, with capital above the threshold.",
      };

    const model: CompatiblePolicyInputs = {
      market: market.market,
      mortality: fit.fit.parameters,
      impoverishmentLevel: threshold,
    };
    const simulation = draft.simulation;
    const withdrawal =
      simulation.withdrawalMode === "targetRisk"
        ? {
            mode: "targetRisk" as const,
            risk: simulation.targetRiskPercent / 100,
          }
        : { mode: "customAmount" as const, amount: simulation.withdrawalEuros };

    try {
      return { data: makeChartData(model, capital, withdrawal) };
    } catch (error) {
      return {
        message:
          error instanceof Error
            ? error.message
            : "The CE relationship could not be calculated.",
      };
    }
  }, [
    draft.market,
    draft.investor,
    draft.simulation.withdrawalMode,
    draft.simulation.targetRiskPercent,
    draft.simulation.withdrawalEuros,
    mortalityFits.ce,
  ]);

  return (
    <div className="chart-card">
      <div className="card-top">
        <div>
          <span className="tiny-label">UNCONSTRAINED CE BENCHMARK</span>
          <div className="big-value">
            {"data" in result
              ? result.data.custom
                ? `${(result.data.selectedRisk * 100).toFixed(2)}%`
                : `€${Math.round(result.data.selectedWithdrawal).toLocaleString("en-US")}`
              : "—"}{" "}
            <span>
              {"data" in result && !result.data.custom ? "/ year" : ""}
            </span>
          </div>
          <div className="value-note">
            {"data" in result
              ? result.data.custom
                ? "CE risk for the selected withdrawal"
                : "Annual withdrawal for the selected CE risk"
              : "CE withdrawal and risk"}
          </div>
        </div>
        <span className="chip">
          {"data" in result ? "CALCULATED" : "NOT AVAILABLE"}
        </span>
      </div>
      {"data" in result ? (
        <>
          <Plot data={result.data} />
          <p className="chart-disclaimer">
            Analytical CE-model relationship for the unconstrained policy. The
            marker shows your selection; it does not represent projected-policy
            or GM-model risk.
          </p>
        </>
      ) : (
        <p role="status">{result.message}</p>
      )}
    </div>
  );
}
