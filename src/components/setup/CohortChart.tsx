"use client";

import { useEffect, useRef, useState } from "react";
import {
  cohortSurvival,
  loadCohort,
  mixCohortSurvival,
  validateCohortYears,
  type CohortSex,
  type LongevityScenario,
} from "../../lib/cohort-survival";

type Curve = { age: number; survival: number }[];
type Loaded =
  | { key: string; female?: number[]; male?: number[] }
  | { key: string; error: string };

/** Client-only Plotly lifecycle, theme updates and responsive resizing. */
function Plot({ curve }: { curve: Curve }) {
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
      await plotly.react(
        node,
        [
          {
            x: curve.map((point) => point.age),
            y: curve.map((point) => point.survival),
            type: "scatter",
            mode: "lines+markers",
            name: "Cohort survival",
            line: { color: accent, width: 3 },
            marker: { size: 4 },
            hovertemplate: "Age %{x}<br>Survival %{y:.1%}<extra></extra>",
          },
        ],
        {
          autosize: true,
          height: 300,
          margin: { l: 58, r: 20, t: 15, b: 55 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: text },
          xaxis: {
            title: { text: "Attained age" },
            gridcolor: grid,
            fixedrange: false,
          },
          yaxis: {
            title: { text: "Survival probability" },
            tickformat: ".0%",
            range: [0, 1.05],
            gridcolor: grid,
          },
          showlegend: false,
        },
        { responsive: true, displaylogo: false },
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
  }, [curve, theme]);
  return (
    <>
      {plotError && <p role="alert">The chart could not be displayed.</p>}
      <div
        ref={element}
        aria-label="Cohort survival probability by attained age"
      />
    </>
  );
}

/** Load the selected cohort(s), then plot annual survival conditional on retirement. */
export function CohortChart({
  birthYear,
  retirementYear,
  mortality,
  longevity,
  maleWeight,
  active,
}: {
  birthYear: string;
  retirementYear: string;
  mortality: CohortSex | "custom";
  longevity: LongevityScenario;
  maleWeight: number;
  active: boolean;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const years = validateCohortYears(birthYear, retirementYear);
  const birth = years.birthYear;
  const retirement = years.retirementYear;
  const age = retirement - birth;
  const valid = years.valid;
  // A changed key immediately hides old data, even before the next effect runs.
  const key = `${birthYear}/${mortality}/${longevity}`;
  useEffect(() => {
    if (!active || !Number.isInteger(birth) || birth < 1926 || birth > 2026)
      return;
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const sexes: CohortSex[] =
      mortality === "custom" ? ["female", "male"] : [mortality];
    Promise.all(
      sexes.map((sex) =>
        loadCohort(birth, sex, longevity, basePath, controller.signal),
      ),
    )
      .then((tables) => {
        if (controller.signal.aborted) return;
        setLoaded({
          key,
          female: sexes.includes("female")
            ? tables[sexes.indexOf("female")]
            : undefined,
          male: sexes.includes("male")
            ? tables[sexes.indexOf("male")]
            : undefined,
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setLoaded({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Could not load cohort data.",
          });
      });
    return () => controller.abort();
  }, [active, birth, key, longevity, mortality]);

  if (!valid)
    return (
      <p role="status">
        Enter a birth year from 1926 to 2026 and a retirement year giving an age
        from 0 to 99.
      </p>
    );
  if (!active || !loaded || loaded.key !== key)
    return <p role="status">Loading cohort data…</p>;
  if ("error" in loaded) return <p role="alert">{loaded.error}</p>;
  const curve =
    mortality === "custom"
      ? mixCohortSurvival(loaded.female!, loaded.male!, age, maleWeight)
      : cohortSurvival(
          (mortality === "female" ? loaded.female : loaded.male)!,
          age,
        );
  return (
    <>
      <Plot
        key={`${key}/${age}/${mortality === "custom" ? maleWeight : "single"}`}
        curve={curve}
      />
      <p className="chart-disclaimer">
        Cohort survival conditional on reaching age {age}. Annual points are
        connected by straight lines. Data end at age 100; the remaining survival
        probability is not forced to zero. No mortality model has been fitted.
      </p>
    </>
  );
}
