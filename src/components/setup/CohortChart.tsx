"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSimulationDraft } from "../SimulationDraftContext";
import { buildMarketOptions } from "../../lib/options/simulation-options";
import { calibrateMarket } from "../../lib/market/calibrate-market";
import type { CeFit, GmFit } from "../../lib/mortality/mortality-fitting";
import {
  ceFitStatus,
  mortalityFitKeys,
  type CeFitStatus,
} from "../../lib/mortality/fit-status";
import {
  cohortSurvival,
  loadCohort,
  mixCohortSurvival,
  validateCohortYears,
  type CohortSex,
  type LongevityScenario,
} from "../../lib/mortality/cohort-survival";

/** One cohort survival curve used by the chart and mortality fitting. */
type Curve = { age: number; survival: number }[];

/** Result of loading the requested cohort data, including any loading error. */
type Loaded =
  | { key: string; female?: number[]; male?: number[] }
  | { key: string; error: string };

/** Client-only Plotly lifecycle, theme updates and responsive resizing. */
function Plot({
  curve,
  gm,
  ce,
}: {
  curve: Curve;
  gm: GmFit | null;
  ce: CeFit | null;
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
      const blue = colors.getPropertyValue("--chart-equity").trim();
      const coral = colors.getPropertyValue("--chart-bond").trim();
      const traces: object[] = [
        {
          x: curve.map((point) => point.age),
          y: curve.map((point) => point.survival),
          type: "scatter",
          mode: "lines+markers",
          name: "Cohort",
          line: { color: accent, width: 3 },
          marker: { size: 4 },
          hovertemplate: "Age %{x}<br>Survival %{y:.1%}<extra>Cohort</extra>",
        },
      ];

      if (gm)
        traces.push({
          x: curve.map((point) => point.age),
          y: gm.fittedSurvival,
          type: "scatter",
          mode: "lines",
          name: "GM fit",
          line: { color: blue, width: 2, dash: "dash" },
          hovertemplate: "Age %{x}<br>Survival %{y:.1%}<extra>GM fit</extra>",
        });
      if (ce)
        traces.push({
          x: curve.map((point) => point.age),
          y: ce.fittedSurvival,
          type: "scatter",
          mode: "lines",
          name: "CE fit",
          line: { color: coral, width: 2, dash: "dot" },
          hovertemplate: "Age %{x}<br>Survival %{y:.1%}<extra>CE fit</extra>",
        });

      await plotly.react(
        node,
        traces,
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
            title: { text: "Survival probability", standoff: 8 },
            tickformat: ".0%",
            ticklabelstandoff: 8,
            range: [0, 1.05],
            gridcolor: grid,
            automargin: true,
          },
          showlegend: !!(gm || ce),
          legend: { orientation: "h", y: 1.12 },
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
  }, [curve, gm, ce, theme]);

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
  onCeFitStatusChange,
}: {
  birthYear: string;
  retirementYear: string;
  mortality: CohortSex | "custom";
  longevity: LongevityScenario;
  maleWeight: number;
  active: boolean;
  onCeFitStatusChange: (status: CeFitStatus) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const { draft, mortalityFits, setMortalityFits, registerRunGuard } =
    useSimulationDraft();
  const workerRef = useRef<Worker | null>(null);
  useEffect(
    () => registerRunGuard(() => workerRef.current !== null),
    [registerRunGuard],
  );
  const { gm: gmResult, ce: ceResult } = mortalityFits;
  const [fitErrors, setFitErrors] = useState<{ gm?: string; ce?: string }>({});
  const [running, setRunning] = useState<{
    gmKey: string;
    ceKey: string | null;
    stage: string;
    completed: number;
    total: number;
  } | null>(null);
  const years = validateCohortYears(birthYear, retirementYear);
  const birth = years.birthYear;
  const retirement = years.retirementYear;
  const age = retirement - birth;
  const valid = years.valid;
  // A changed key immediately hides old data, even before the next effect runs.
  const key = `${birthYear}/${mortality}/${longevity}`;
  const marketInput = buildMarketOptions(draft.market);
  const marketResult = marketInput.ok
    ? calibrateMarket(marketInput.market)
    : null;
  const market =
    marketResult?.ok && marketResult.market.paperAssumptions.positiveRho
      ? marketResult.market
      : null;
  const { gm: gmKey, ce: ceKey } = mortalityFitKeys({
    birthYear,
    retirementYear,
    mortality,
    longevity,
    maleWeight,
    market,
  });
  // A completed CE fit is current only for the exact cohort and market inputs
  // it used. In particular, an older run finishing cannot clear a stale badge.
  useEffect(() => {
    onCeFitStatusChange(ceFitStatus(ceResult?.key ?? null, ceKey));
  }, [ceKey, ceResult, onCeFitStatusChange]);
  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );
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

  const curve = useMemo(() => {
    if (!valid || !loaded || loaded.key !== key || "error" in loaded)
      return null;

    return mortality === "custom"
      ? mixCohortSurvival(loaded.female!, loaded.male!, age, maleWeight)
      : cohortSurvival(
          (mortality === "female" ? loaded.female : loaded.male)!,
          age,
        );
  }, [valid, loaded, key, mortality, age, maleWeight]);

  if (!valid)
    return (
      <p role="status">
        Enter a birth year from 1926 to 2026 and a retirement year giving an age
        from 0 to 99.{" "}
        {running && "The current fit continues with its original settings."}
      </p>
    );
  if (!active || !loaded || loaded.key !== key)
    return (
      <p role="status">
        Loading cohort data…{" "}
        {running && "The current fit continues with its original settings."}
      </p>
    );
  if ("error" in loaded) return <p role="alert">{loaded.error}</p>;
  if (!curve) return null;

  const currentCurve = curve;
  const gm = gmResult?.key === gmKey ? gmResult.fit : null;
  const ce = ceKey && ceResult?.key === ceKey ? ceResult.fit : null;
  const oldRun =
    running && (running.gmKey !== gmKey || running.ceKey !== ceKey);

  /** Start a mortality worker for the current captured inputs. Ask before replacing an active fit and ignore messages from superseded workers. */
  function startFit() {
    if (
      workerRef.current &&
      !window.confirm(
        "A mortality fit is still running. Interrupt it and start a new fit with the current settings?",
      )
    )
      return;

    workerRef.current?.terminate();
    setFitErrors({});
    setMortalityFits({ gm: null, ce: null });
    let worker: Worker;

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      worker = new Worker(`${basePath}/workers/mortality-fit.worker.js`);
    } catch {
      workerRef.current = null;
      setRunning(null);
      setFitErrors({ gm: "Could not start the fitting worker." });

      return;
    }
    workerRef.current = worker;
    const capturedGmKey = gmKey;
    const capturedCeKey = ceKey;
    setRunning({
      gmKey: capturedGmKey,
      ceKey: capturedCeKey,
      stage: "GM",
      completed: 0,
      total: 48,
    });
    worker.onmessage = (event) => {
      if (workerRef.current !== worker) return;

      const message = event.data;

      if (message.type === "progress")
        setRunning({
          gmKey: capturedGmKey,
          ceKey: capturedCeKey,
          stage: message.model.toUpperCase(),
          completed: message.completed,
          total: message.total,
        });
      else if (message.type === "gm")
        setMortalityFits((current) => ({
          ...current,
          gm: { key: capturedGmKey, fit: message.fit },
        }));
      else if (message.type === "ce" && capturedCeKey)
        setMortalityFits((current) => ({
          ...current,
          ce: { key: capturedCeKey, fit: message.fit },
        }));
      else if (message.type === "error")
        setFitErrors((previous) => ({
          ...previous,
          [message.model]: message.message,
        }));
      else if (message.type === "done") {
        worker.terminate();
        workerRef.current = null;
        setRunning(null);
      }
    };
    worker.onerror = () => {
      if (workerRef.current !== worker) return;

      worker.terminate();
      workerRef.current = null;
      setRunning(null);
      setFitErrors((previous) => ({
        ...previous,
        gm: "The fitting worker failed.",
      }));
    };
    worker.postMessage({
      times: currentCurve.map((point) => point.age - age),
      target: currentCurve.map((point) => point.survival),
      market: market ? { r: market.realRiskFreeRate, rho: market.rho } : null,
    });
  }

  return (
    <>
      <div className="mortality-fit-toolbar">
        <strong>Survival by age</strong>
        <button
          type="button"
          className="button button-primary"
          onClick={startFit}
        >
          {running ? "Update fits" : "Fit mortality models"}
        </button>
      </div>
      <Plot key={`${gmKey}/${!!gm}/${!!ce}`} curve={curve} gm={gm} ce={ce} />
      <p className="chart-disclaimer">
        Cohort survival conditional on reaching age {age}. Annual points are
        connected by straight lines. Data end at age 100; the remaining survival
        probability is not forced to zero.
      </p>
      {!running && !gm && !ce && !fitErrors.gm && !fitErrors.ce && (
        <p>Mortality models have not been fitted for these inputs.</p>
      )}
      {running && (
        <p role="status">
          Fitting {running.stage}: {running.completed} / {running.total} starts.{" "}
          {oldRun
            ? "This run uses earlier settings; update fits to use your current inputs."
            : ""}
        </p>
      )}
      {!market && (
        <p>
          CE fitting requires valid market assumptions and positive rho. The GM
          fit remains available.
        </p>
      )}
      {((gmResult && !gm) || (ceResult && !ce)) && (
        <p role="status">
          Some previous fits need updating after input changes.
        </p>
      )}
      {fitErrors.gm && <p role="alert">GM fit: {fitErrors.gm}</p>}
      {fitErrors.ce && <p role="alert">CE fit: {fitErrors.ce}</p>}
      {(gm || ce) && (
        <details className="borrowing-details diagnostic-details mortality-fit-details">
          <summary>View fit diagnostics and model parameters</summary>
          <section className="mortality-fit-section">
            <h4>Fit diagnostics</h4>
            <div className="capital-table-wrap">
              <table className="capital-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>KL divergence</th>
                    <th>Largest difference</th>
                    <th>Optimizer</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["GM", gm],
                      ["CE", ce],
                    ] as const
                  ).map(
                    ([label, fit]) =>
                      fit && (
                        <tr key={label}>
                          <td>{label}</td>
                          <td>{fit.klDivergence.toPrecision(4)}</td>
                          <td>
                            {(fit.maxSurvivalDifference * 100).toFixed(2)} pp
                          </td>
                          <td>
                            {fit.converged ? "Converged" : "Iteration limit"}
                          </td>
                        </tr>
                      ),
                  )}
                </tbody>
              </table>
            </div>
            <p className="chart-disclaimer">
              KL divergence compares annual death bins and the final survival
              tail. Largest difference is measured on the annual grid. Fits are
              numerical estimates; a convergence status is not a quality grade.
            </p>
          </section>
          <section className="mortality-fit-section">
            <h4>Model parameters and optimization</h4>
            <dl>
              {gm && (
                <>
                  <div>
                    <dt>GM α</dt>
                    <dd>{gm.parameters.alpha.toPrecision(5)} yr⁻¹</dd>
                  </div>
                  <div>
                    <dt>GM β</dt>
                    <dd>{gm.parameters.beta.toPrecision(5)} yr⁻¹</dd>
                  </div>
                  <div>
                    <dt>GM λ</dt>
                    <dd>{gm.parameters.lambda.toPrecision(5)} yr⁻¹</dd>
                  </div>
                  <div>
                    <dt>GM starts converged</dt>
                    <dd>
                      {gm.convergedStarts} / {gm.starts}
                    </dd>
                  </div>
                </>
              )}
              {ce && (
                <>
                  <div>
                    <dt>CE T · remaining lifetime endpoint</dt>
                    <dd>{ce.parameters.tau.toFixed(3)} years</dd>
                  </div>
                  <div>
                    <dt>CE δ</dt>
                    <dd>{ce.parameters.p.toPrecision(5)}</dd>
                  </div>
                  <div>
                    <dt>
                      CE λ<sub>∞</sub> · derived
                    </dt>
                    <dd>{ce.parameters.lambda.toPrecision(5)} yr⁻¹</dd>
                  </div>
                  <div>
                    <dt>CE starts converged</dt>
                    <dd>
                      {ce.convergedStarts} / {ce.starts}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt>Fitting horizon · years after retirement</dt>
                <dd>{100 - age}</dd>
              </div>
            </dl>
            <p>
              The CE fit uses the current real risk-free rate and rho. A low KL
              value is not a guarantee of predictive accuracy.
            </p>
          </section>
        </details>
      )}
    </>
  );
}
