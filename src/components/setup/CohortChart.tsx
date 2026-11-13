"use client";

import { useLanguage } from "../LanguageContext";
import { validationMessage } from "../../lib/i18n/validation";
import { mortalityFitMessages } from "../../lib/i18n/mortality-fit";
import { chartMessages } from "../../lib/i18n/charts";

import { TermLink } from "../common";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSimulationDraft } from "../SimulationDraftContext";
import { ChartExport } from "../ChartExport";
import { initialMortalityFitAction } from "../../lib/mortality/initial-fit";
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
  view,
}: {
  curve: Curve;
  gm: GmFit | null;
  ce: CeFit | null;
  view: string;
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
      const accent = colors.getPropertyValue("--accent").trim();
      const blue = colors.getPropertyValue("--chart-equity").trim();
      const coral = colors.getPropertyValue("--chart-bond").trim();
      const traces: object[] = [
        {
          x: curve.map((point) => point.age),
          y: curve.map((point) => point.survival),
          type: "scatter",
          mode: "lines+markers",
          name: copy.cohort,
          line: { color: accent, width: 3 },
          marker: { size: 4 },
          hovertemplate: `${copy.attainedAge} %{x}<br>${copy.survival} %{y:.1%}<extra>${copy.cohort}</extra>`,
        },
      ];

      if (gm)
        traces.push({
          x: curve.map((point) => point.age),
          y: gm.fittedSurvival,
          type: "scatter",
          mode: "lines",
          name: copy.gmFit,
          line: { color: blue, width: 2, dash: "dash" },
          hovertemplate: `${copy.attainedAge} %{x}<br>${copy.survival} %{y:.1%}<extra>${copy.gmFit}</extra>`,
        });
      if (ce)
        traces.push({
          x: curve.map((point) => point.age),
          y: ce.fittedSurvival,
          type: "scatter",
          mode: "lines",
          name: copy.ceFit,
          line: { color: coral, width: 2, dash: "dot" },
          hovertemplate: `${copy.attainedAge} %{x}<br>${copy.survival} %{y:.1%}<extra>${copy.ceFit}</extra>`,
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
            title: { text: copy.attainedAge },
            gridcolor: grid,
            fixedrange: false,
          },
          yaxis: {
            title: { text: copy.survival, standoff: 8 },
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
  }, [curve, gm, ce, theme, language]);

  return (
    <>
      {plotError && <p role="alert">{copy.plotError}</p>}
      <div ref={element} aria-label={copy.cohortAria} />
      <ChartExport
        element={element}
        filename="mortality-survival"
        context={{
          title: copy.cohortTitle,
          xUnit: copy.attainedAgeUnit,
          yUnit: copy.survivalUnit,
          view,
        }}
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
  const { language } = useLanguage();
  const fitText = mortalityFitMessages[language];
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const {
    draft,
    mortalityFits,
    setMortalityFits,
    registerRunGuard,
    initialMortalityFit,
    setInitialMortalityFit,
  } = useSimulationDraft();
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
    if (
      (!active && initialMortalityFit.phase !== "loading") ||
      !Number.isInteger(birth) ||
      birth < 1926 ||
      birth > 2026
    )
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
        if (!controller.signal.aborted) {
          setLoaded({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Could not load cohort data.",
          });
          if (initialMortalityFit.phase === "loading")
            setInitialMortalityFit({
              phase: "error",
              message: "Could not load the cohort data.",
            });
        }
      });

    return () => controller.abort();
  }, [
    active,
    birth,
    key,
    longevity,
    mortality,
    initialMortalityFit.phase,
    setInitialMortalityFit,
  ]);

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

  const gm = gmResult?.key === gmKey ? gmResult.fit : null;
  const ce = ceKey && ceResult?.key === ceKey ? ceResult.fit : null;
  const oldRun =
    running && (running.gmKey !== gmKey || running.ceKey !== ceKey);

  /** Start a mortality worker for the current captured inputs. Ask before replacing an active fit and ignore messages from superseded workers. */
  function startFit(automatic = false) {
    if (!curve) return;

    if (automatic && workerRef.current) return;
    if (
      workerRef.current &&
      !window.confirm(
        validationMessage(
          "A mortality fit is still running. Interrupt it and start a new fit with the current settings?",
          language,
        ),
      )
    )
      return;

    if (
      !automatic &&
      (initialMortalityFit.phase === "loading" ||
        initialMortalityFit.phase === "running" ||
        initialMortalityFit.phase === "error")
    )
      setInitialMortalityFit({ phase: "skipped" });

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
      if (automatic)
        setInitialMortalityFit({
          phase: "error",
          message: "Could not start the automatic mortality fit.",
        });

      return;
    }
    workerRef.current = worker;
    const capturedGmKey = gmKey;
    const capturedCeKey = ceKey;
    let fitFailed = false;
    if (automatic)
      setInitialMortalityFit({
        phase: "running",
        model: "GM",
        completed: 0,
        total: 48,
      });
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

      if (message.type === "progress") {
        setRunning({
          gmKey: capturedGmKey,
          ceKey: capturedCeKey,
          stage: message.model.toUpperCase(),
          completed: message.completed,
          total: message.total,
        });
        if (automatic)
          setInitialMortalityFit({
            phase: "running",
            model: message.model.toUpperCase(),
            completed: message.completed,
            total: message.total,
          });
      } else if (message.type === "gm") {
        if (!message.fit.converged) fitFailed = true;
        setMortalityFits((current) => ({
          ...current,
          gm: { key: capturedGmKey, fit: message.fit },
        }));
      } else if (message.type === "ce" && capturedCeKey) {
        if (!message.fit.converged) fitFailed = true;
        setMortalityFits((current) => ({
          ...current,
          ce: { key: capturedCeKey, fit: message.fit },
        }));
      } else if (message.type === "error") {
        fitFailed = true;
        setFitErrors((previous) => ({
          ...previous,
          [message.model]: message.message,
        }));
      } else if (message.type === "done") {
        worker.terminate();
        workerRef.current = null;
        setRunning(null);
        if (automatic)
          setInitialMortalityFit(
            fitFailed
              ? {
                  phase: "error",
                  message:
                    "The automatic mortality fit could not be completed.",
                }
              : { phase: "complete" },
          );
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
      if (automatic)
        setInitialMortalityFit({
          phase: "error",
          message: "The automatic mortality fitting worker failed.",
        });
    };
    try {
      worker.postMessage({
        times: curve.map((point) => point.age - age),
        target: curve.map((point) => point.survival),
        market: market ? { r: market.realRiskFreeRate, rho: market.rho } : null,
      });
    } catch {
      worker.terminate();
      workerRef.current = null;
      setRunning(null);
      setFitErrors({
        gm: "Could not send the cohort data to the fitting worker.",
      });
      if (automatic)
        setInitialMortalityFit({
          phase: "error",
          message: "Could not start the automatic mortality fit.",
        });
    }
  }

  // Fit once after startup recovery, using the currently restored inputs.
  useEffect(() => {
    const action = initialMortalityFitAction({
      phase: initialMortalityFit.phase,
      cohortValid: valid,
      cohortReady: curve !== null,
      marketReady: !!market && !!ceKey,
      workerActive: workerRef.current !== null,
    });

    if (action === "invalid-cohort" || action === "invalid-market") {
      setInitialMortalityFit({
        phase: "error",
        message:
          action === "invalid-cohort"
            ? "The selected birth or retirement year is outside the supported cohort data."
            : "The market inputs are not valid for the compatible mortality fit.",
      });
      return;
    }

    if (action === "start") startFit(true);
  }, [initialMortalityFit.phase, valid, curve, market, ceKey]);

  if (!valid)
    return (
      <p role="status">
        {fitText.invalidYears} {running && fitText.continues}
      </p>
    );
  if (!active || !loaded || loaded.key !== key)
    return (
      <p role="status">
        {fitText.loading} {running && fitText.continues}
      </p>
    );
  if ("error" in loaded)
    return <p role="alert">{validationMessage(loaded.error, language)}</p>;
  if (!curve) return null;

  return (
    <>
      <div className="mortality-fit-toolbar">
        <strong>{fitText.survivalByAge}</strong>
        <button
          type="button"
          className="button button-primary"
          onClick={() => startFit()}
        >
          {running ? fitText.update : fitText.fit}
        </button>
      </div>
      <Plot
        key={`${gmKey}/${!!gm}/${!!ce}`}
        curve={curve}
        gm={gm}
        ce={ce}
        view={
          language === "de"
            ? `Kohorte ${birthYear}; Ruhestand ${retirementYear}; ${{ female: "weiblich", male: "männlich", custom: "Mischung" }[mortality]}${mortality === "custom" ? `; Gewicht Männer ${maleWeight}` : ""}; Langlebigkeit ${{ low: "niedrig", medium: "mittel", high: "hoch" }[longevity]}`
            : `Cohort ${birthYear}; retirement ${retirementYear}; ${mortality}${mortality === "custom" ? `; male weight ${maleWeight}` : ""}; ${longevity} longevity`
        }
      />
      <p className="chart-disclaimer">{fitText.cohortNote(age)}</p>
      {!running && !gm && !ce && !fitErrors.gm && !fitErrors.ce && (
        <p>{fitText.notFitted}</p>
      )}
      {running && (
        <p role="status">
          {fitText.fitting} {running.stage}: {running.completed} /{" "}
          {running.total} {fitText.starts}. {oldRun ? fitText.staleRun : ""}
        </p>
      )}
      {!market && <p>{fitText.invalidMarket}</p>}
      {((gmResult && !gm) || (ceResult && !ce)) && (
        <p role="status">{fitText.staleFits}</p>
      )}
      {fitErrors.gm && (
        <p role="alert">
          {fitText.gmFit}: {validationMessage(fitErrors.gm, language)}
        </p>
      )}
      {fitErrors.ce && (
        <p role="alert">
          {fitText.ceFit}: {validationMessage(fitErrors.ce, language)}
        </p>
      )}
      {(gm || ce) && (
        <details className="borrowing-details diagnostic-details mortality-fit-details">
          <summary>{fitText.viewDiagnostics}</summary>
          <section className="mortality-fit-section">
            <h4>{fitText.diagnostics}</h4>
            <div className="capital-table-wrap">
              <table className="capital-table">
                <thead>
                  <tr>
                    <th>{fitText.model}</th>
                    <th>{fitText.kl}</th>
                    <th>{fitText.largestDifference}</th>
                    <th>{fitText.optimizer}</th>
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
                            {fit.converged
                              ? fitText.converged
                              : fitText.iterationLimit}
                          </td>
                        </tr>
                      ),
                  )}
                </tbody>
              </table>
            </div>
            <p className="chart-disclaimer">
              <TermLink term="mortality-diagnostics">{fitText.kl}</TermLink>{" "}
              {fitText.klDescription}
            </p>
          </section>
          <section className="mortality-fit-section">
            <h4>{fitText.parameters}</h4>
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
                    <dt>{fitText.convergedGm}</dt>
                    <dd>
                      {gm.convergedStarts} / {gm.starts}
                    </dd>
                  </div>
                </>
              )}
              {ce && (
                <>
                  <div>
                    <dt>{fitText.endpoint}</dt>
                    <dd>
                      {ce.parameters.tau.toFixed(3)} {fitText.years}
                    </dd>
                  </div>
                  <div>
                    <dt>CE δ</dt>
                    <dd>{ce.parameters.p.toPrecision(5)}</dd>
                  </div>
                  <div>
                    <dt>
                      CE λ<sub>∞</sub> · {fitText.derived}
                    </dt>
                    <dd>{ce.parameters.lambda.toPrecision(5)} yr⁻¹</dd>
                  </div>
                  <div>
                    <dt>{fitText.convergedCe}</dt>
                    <dd>
                      {ce.convergedStarts} / {ce.starts}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt>{fitText.fittingHorizon}</dt>
                <dd>{100 - age}</dd>
              </div>
            </dl>
            <p>{fitText.ceExplanation}</p>
          </section>
        </details>
      )}
    </>
  );
}
