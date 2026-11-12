"use client";

import { useState, type RefObject } from "react";
import { downloadText, makeCsv, type CsvCell } from "../lib/export/csv";

/** Trace properties used by the currently supported Plotly charts. */
interface ChartTrace {
  name?: string;
  x?: ArrayLike<number | string>;
  y?: ArrayLike<number | string>;
  width?: number | ArrayLike<number>;
}

/** Describe the displayed units and any selected options alongside chart data. */
export interface ChartExportContext {
  title: string;
  xUnit: string;
  yUnit: string;
  /** Human-readable selected view, policy, age, or other relevant context. */
  view?: string;
}

/** A legend item drawn into exported images when the page legend is HTML. */
export interface ChartExportLegendItem {
  name: string;
  /** Theme variable containing the line color. */
  colorVariable: string;
  dash?: "dash" | "dot";
}

/** Convert rendered Plotly traces into a long-form CSV, preserving separate series. */
export function chartTracesCsv(
  traces: readonly ChartTrace[],
  context: ChartExportContext,
): string {
  const rows: CsvCell[][] = [
    [
      "chart",
      "view",
      "series",
      "point",
      "x",
      "x_unit",
      "y",
      "y_unit",
      "bar_width_x_units",
    ],
  ];

  traces.forEach((trace, index) => {
    if (!trace.x || !trace.y) return;
    const length = Math.min(trace.x.length, trace.y.length);
    for (let point = 0; point < length; point += 1) {
      const width =
        typeof trace.width === "number" ? trace.width : trace.width?.[point];
      rows.push([
        context.title,
        context.view ?? "",
        trace.name || `Series ${index + 1}`,
        point + 1,
        trace.x[point],
        context.xUnit,
        trace.y[point],
        context.yUnit,
        width,
      ]);
    }
  });

  return makeCsv(rows);
}

/** Offer PNG, SVG and CSV downloads for the chart currently rendered in Plotly. */
export function ChartExport({
  element,
  filename,
  context,
  imageLegend,
}: {
  element: RefObject<HTMLDivElement | null>;
  filename: string;
  context: ChartExportContext;
  imageLegend?: readonly ChartExportLegendItem[];
}) {
  const [error, setError] = useState("");

  /** Download either the visible traces or an image of the current graph. */
  async function download(format: "png" | "svg" | "csv") {
    const graph = element.current as
      | (HTMLDivElement & {
          data?: ChartTrace[];
          layout?: Record<string, unknown>;
        })
      | null;
    if (!graph?.data?.length || graph.dataset.exportReady !== "true") {
      setError("The chart is not ready to export yet.");
      return;
    }

    try {
      if (format === "csv") {
        downloadText(
          `${filename}.csv`,
          chartTracesCsv(graph.data, context),
          "text/csv;charset=utf-8",
        );
      } else {
        const { default: plotly } = await import("plotly.js-basic-dist-min");
        const temporary = document.createElement("div");
        const colors = getComputedStyle(document.documentElement);
        const surface =
          colors.getPropertyValue("--surface").trim() || "#ffffff";
        const originalMargin = graph.layout?.margin as
          Record<string, number> | undefined;
        temporary.style.position = "fixed";
        temporary.style.left = "-10000px";
        temporary.style.width = `${Math.max(400, graph.clientWidth)}px`;
        document.body.appendChild(temporary);

        try {
          const traces = imageLegend
            ? [
                ...graph.data.map((trace) => ({ ...trace, showlegend: false })),
                ...imageLegend.map((item) => ({
                  x: [null],
                  y: [null],
                  type: "scatter",
                  mode: "lines",
                  name: item.name,
                  visible: "legendonly",
                  showlegend: true,
                  line: {
                    color: colors.getPropertyValue(item.colorVariable).trim(),
                    dash: item.dash,
                    width: 2,
                  },
                })),
              ]
            : graph.data;
          const title = [context.title, context.view]
            .filter(Boolean)
            .join(" — ")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
          await plotly.react(
            temporary,
            traces,
            {
              ...graph.layout,
              title: { text: title, font: { size: 12 } },
              width: Math.max(400, graph.clientWidth),
              height:
                Math.max(300, graph.clientHeight) + (imageLegend ? 90 : 45),
              margin: {
                ...originalMargin,
                t: 55,
                ...(imageLegend ? { b: (originalMargin?.b ?? 55) + 55 } : {}),
              },
              paper_bgcolor: surface,
              ...(imageLegend
                ? {
                    showlegend: true,
                    legend: { orientation: "h", x: 0, y: -0.3 },
                  }
                : {}),
            },
            { staticPlot: true, displayModeBar: false },
          );
          await plotly.downloadImage(temporary, { format, filename });
        } finally {
          plotly.purge(temporary);
          temporary.remove();
        }
      }
      setError("");
    } catch {
      setError("The chart could not be exported. Please try again.");
    }
  }

  return (
    <div className="chart-export">
      <details>
        <summary>Export chart</summary>
        <div className="chart-export-actions">
          <button
            type="button"
            className="button button-light"
            onClick={() => void download("png")}
          >
            PNG
          </button>
          <button
            type="button"
            className="button button-light"
            onClick={() => void download("svg")}
          >
            SVG
          </button>
          <button
            type="button"
            className="button button-light"
            onClick={() => void download("csv")}
          >
            CSV data
          </button>
        </div>
      </details>
      {error && (
        <p role="alert" className="chart-export-error">
          {error}
        </p>
      )}
    </div>
  );
}
