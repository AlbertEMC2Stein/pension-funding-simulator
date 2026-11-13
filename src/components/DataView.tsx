"use client";

import { PanelHelp } from "./PanelHelp";

import { Fragment, useMemo, useState } from "react";
import { useLanguage } from "./LanguageContext";
import { validationMessage } from "../lib/i18n/validation";
import { tableMessages, type TableMessages } from "../lib/i18n/tables";
import { useSimulationDraft } from "./SimulationDraftContext";
import { SimulationDetailFields } from "./SimulationDetailFields";
import { useComparisonSimulation } from "./comparison/useComparisonSimulation";
import {
  comparisonSetupSignature,
  comparisonRowSignature,
  areComparisonRowsCalculated,
} from "./comparison/comparison-run";
import {
  comparisonBatchProgress,
  comparisonQueueRemaining,
  comparisonRowRemaining,
} from "./comparison/comparison-queue";
import {
  calculateWithdrawalRow,
  prepareWithdrawalTable,
} from "../lib/model/comparison/withdrawal-table";
import { StatusBadge } from "./StatusBadge";
import { feasibilityForCurrentMarket } from "./evaluation/global-feasibility";
import type { SetupTableRow } from "../lib/options/setup-file";
import { SetupFileActions } from "./SetupFileActions";
import { comparisonTableCsv } from "../lib/export/comparison-table";
import { downloadText } from "../lib/export/csv";
import { createResultsExport } from "../lib/export/results";
import { PageHeading, SectionHeading, TermLink } from "./common";

/** Available comparison-table layouts; each keeps separate editable example rows. */
type TableType = "withdrawal" | "feasibility";

/** Editable comparison row; numerical values remain text until validated. */
type ExampleRow = SetupTableRow;

/** Format a batch-based ETA without implying sub-second precision. */
function formatComparisonEta(
  milliseconds: number,
  text: TableMessages,
): string {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  return seconds < 60
    ? `${text.etaAbout} ${seconds} s ${text.etaLeft}`
    : `${text.etaAbout} ${Math.floor(seconds / 60)} min ${seconds % 60} s ${text.etaLeft}`;
}

/** Format an approximate Monte Carlo interval in the displayed units. */
function formatInterval(
  interval: { lower: number; upper: number } | null,
  scale: number,
  unit: string,
  unavailable: string,
): string {
  return interval
    ? `${(interval.lower * scale).toFixed(2)}${unit} – ${(interval.upper * scale).toFixed(2)}${unit}`
    : unavailable;
}

/** Compare editable rows against the shared setup and export calculated results. */
export function DataView() {
  const { language } = useLanguage();
  const text = tableMessages[language];
  const {
    draft,
    setDraft,
    mortalityFits,
    tables,
    setTables,
    evaluationResult,
    setupName,
  } = useSimulationDraft();
  const withdrawalContext = useMemo(
    () => prepareWithdrawalTable(draft, mortalityFits),
    [draft.market, draft.investor, mortalityFits.ce],
  );
  const marketFeasibility = useMemo(
    () =>
      feasibilityForCurrentMarket(draft.market, {
        status: "unavailable",
        message: "",
      }),
    [draft.market],
  );
  const feasibilityUnavailable = draft.simulation.projected
    ? text.projectedUnavailable
    : marketFeasibility.status === "negative-merton"
      ? text.shortUnavailable
      : null;
  const withdrawalSimulation = useComparisonSimulation(draft, mortalityFits);
  const feasibilitySimulation = useComparisonSimulation(
    draft,
    mortalityFits,
    "feasibility",
  );
  const [tableType, setTableType] = useState<TableType>("withdrawal");
  const simulation =
    tableType === "withdrawal" ? withdrawalSimulation : feasibilitySimulation;
  const run = simulation.run;
  const running = run?.running ?? false;
  const sharedStale = run
    ? run.signature !==
      comparisonSetupSignature(draft, mortalityFits, tableType)
    : false;
  const overallEta =
    run?.running && !run.cancelling ? comparisonQueueRemaining(run.rows) : null;
  const batchProgress = run ? comparisonBatchProgress(run.rows) : null;
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [expandedFeasibilityRows, setExpandedFeasibilityRows] = useState<
    number[]
  >([]);
  const rows = tables[tableType];
  const allComputed =
    run !== null &&
    !sharedStale &&
    areComparisonRowsCalculated(tables[tableType], run.rows, tableType);
  const hasTableResults = (["withdrawal", "feasibility"] as const).some(
    (kind) => {
      const captured =
        kind === "withdrawal"
          ? withdrawalSimulation.run
          : feasibilitySimulation.run;
      return captured?.rows.some(
        (row) =>
          row.status === "calculated" &&
          tables[kind].some((item) => item.id === row.id),
      );
    },
  );
  const resultHeading =
    rows.length === 0
      ? text.ceResult
      : rows.every((row) => row.type === "Target risk")
        ? text.annualWithdrawal
        : rows.every((row) => row.type === "Withdrawal")
          ? text.ceRisk
          : text.withdrawalOrRisk;
  // Keep IDs stable after deletion so editing one row does not affect another.
  const [nextId, setNextId] = useState(
    () =>
      Math.max(
        0,
        ...tables.withdrawal.map((row) => row.id),
        ...tables.feasibility.map((row) => row.id),
      ) + 1,
  );
  /** Merge a partial edit into the selected row without changing other rows. */
  function changeRow(id: number, change: Partial<ExampleRow>) {
    setTables((current) => ({
      ...current,
      [tableType]: current[tableType].map((row) =>
        row.id === id ? { ...row, ...change } : row,
      ),
    }));
  }

  /** Download the visible table with captured settings and stale indicators. */
  function exportTable() {
    const content = comparisonTableCsv({
      kind: tableType,
      rows,
      run,
      sharedStale,
      currentSetup: comparisonSetupSignature(draft, mortalityFits, tableType),
      withdrawalContext,
      unavailable:
        tableType === "feasibility"
          ? !!feasibilityUnavailable
          : !withdrawalContext.available,
    });
    downloadText(
      `${tableType}-comparison.csv`,
      content,
      "text/csv;charset=utf-8",
    );
  }

  /** Export completed estimates and their captured inputs without raw trajectories. */
  function exportResults() {
    const document = createResultsExport({
      name: setupName,
      draft,
      fits: mortalityFits,
      tables,
      evaluation: evaluationResult,
      withdrawal: withdrawalSimulation.run,
      feasibility: feasibilitySimulation.run,
      exportedAt: new Date().toISOString(),
    });
    downloadText(
      "pension-results.json",
      `${JSON.stringify(document, null, 2)}\n`,
      "application/json",
    );
  }

  return (
    <section className="view active">
      <PageHeading
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.intro}
      />
      <SectionHeading
        eyebrow={text.comparison}
        title={text.comparisonTitle}
        description={text.comparisonDescription}
      >
        <div className="heading-actions">
          <button
            type="button"
            className="button button-light"
            aria-expanded={settingsOpen}
            aria-controls={
              settingsOpen ? "table-simulation-settings" : undefined
            }
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            ☷ &nbsp; {text.settings}
          </button>
          <button
            type="button"
            className="button button-light"
            onClick={exportTable}
          >
            ↓ &nbsp; {text.exportTable}
          </button>
        </div>
      </SectionHeading>
      {settingsOpen && (
        <aside
          id="table-simulation-settings"
          className="settings-panel table-settings-panel"
        >
          <div className="settings-heading">
            <div>
              <span className="tiny-label">{text.customize}</span>
              <h2>{text.settings}</h2>
            </div>
            <button
              type="button"
              className="close-settings"
              aria-label={text.closeSettings}
              onClick={() => setSettingsOpen(false)}
            >
              ×
            </button>
          </div>
          <p className="settings-lead">{text.settingsLead}</p>
          <div className="settings-group">
            <div className="group-title">{text.detail}</div>
            <SimulationDetailFields
              simulation={draft.simulation}
              idPrefix="table"
              onChange={(change) =>
                setDraft((current) => ({
                  ...current,
                  simulation: { ...current.simulation, ...change },
                }))
              }
            />
          </div>
        </aside>
      )}

      <div className="form-card table-card">
        <div className="table-toolbar">
          <label>
            {text.tableType}
            <select
              value={tableType}
              disabled={running}
              onChange={(event) =>
                setTableType(event.target.value as TableType)
              }
            >
              <option value="withdrawal">{text.withdrawalTable}</option>
              <option value="feasibility">{text.feasibilityTable}</option>
            </select>
          </label>
          <button
            type="button"
            className="button button-primary"
            disabled={running}
            onClick={() => {
              setTables((current) => ({
                ...current,
                [tableType]: [
                  ...current[tableType],
                  {
                    id: nextId,
                    name: `Variation ${String(nextId).padStart(2, "0")}`,
                    type: "Target risk",
                    value: "5.0",
                    policy: "Unconstrained",
                    impoverishmentLevel: draft.investor.impoverishmentLevel,
                  },
                ],
              }));
              setNextId((current) => current + 1);
            }}
          >
            + &nbsp; {text.add}
          </button>
        </div>
        <div className="panel-help-heading table-help-heading">
          <p className="table-description">
            {tableType === "withdrawal"
              ? text.withdrawalDescription
              : text.feasibilityDescription}{" "}
            {text.otherShared}
          </p>
          <PanelHelp
            panel={
              tableType === "withdrawal"
                ? "withdrawalTable"
                : "feasibilityTable"
            }
          />
        </div>
        {tableType === "withdrawal" &&
          !running &&
          !withdrawalContext.available && (
            <p
              className="table-description table-description-note"
              role="status"
            >
              {validationMessage(withdrawalContext.message, language)}
            </p>
          )}
        {tableType === "withdrawal" && (
          <p className="table-description table-description-note">
            {text.withdrawalNote}
          </p>
        )}
        {tableType === "feasibility" && (
          <p className="table-description table-description-note">
            {text.feasibilityNote}
          </p>
        )}
        {tableType === "feasibility" && feasibilityUnavailable && (
          <p className="table-description table-description-note" role="status">
            {feasibilityUnavailable}
          </p>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{text.variation}</th>
                <th>{text.riskOrWithdrawal}</th>
                {tableType === "withdrawal" && (
                  <>
                    <th>{text.policy}</th>
                    <th>{resultHeading}</th>
                    <th>{text.gmRisk}</th>
                  </>
                )}
                {tableType === "feasibility" && (
                  <>
                    <th>{text.impoverishment}</th>
                    <th>{text.bandwidth}</th>
                    <th>{text.everBorrow}</th>
                    <th>{text.borrowingTime}</th>
                  </>
                )}
                <th>
                  {tableType === "withdrawal" ? text.gmStatus : text.status}
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const captured = run?.rows.find((item) => item.id === row.id);
                const rowStale =
                  captured &&
                  (sharedStale ||
                    captured.rowSignature !==
                      comparisonRowSignature(row, tableType));
                const result =
                  running && captured
                    ? captured.ce
                      ? { ok: true as const, ...captured.ce }
                      : {
                          ok: false as const,
                          message: captured.message ?? "Invalid row.",
                        }
                    : tableType === "withdrawal" && withdrawalContext.available
                      ? calculateWithdrawalRow(
                          withdrawalContext,
                          row.type,
                          row.value,
                        )
                      : null;
                const status =
                  tableType === "feasibility" && feasibilityUnavailable
                    ? ("not-available" as const)
                    : captured
                      ? !running && rowStale
                        ? ("needs-updating" as const)
                        : captured.status
                      : tableType !== "withdrawal"
                        ? feasibilityUnavailable
                          ? ("not-available" as const)
                          : ("not-calculated" as const)
                        : !withdrawalContext.available
                          ? ("not-available" as const)
                          : result?.ok
                            ? ("not-calculated" as const)
                            : ("error" as const);
                const rowEta = captured
                  ? comparisonRowRemaining(captured)
                  : null;
                const expanded = expandedFeasibilityRows.includes(row.id);
                const borrowing = feasibilityUnavailable
                  ? undefined
                  : captured?.borrowing;
                const inputValue = (
                  <div className="input-suffix table-input-suffix">
                    <input
                      aria-label={text.valueLabel(
                        row.id,
                        row.type === "Target risk",
                      )}
                      value={row.value}
                      disabled={running}
                      onChange={(event) =>
                        changeRow(row.id, { value: event.target.value })
                      }
                    />
                    <span aria-hidden="true">
                      {row.type === "Target risk" ? "%" : text.yearUnit}
                    </span>
                  </div>
                );

                return (
                  <Fragment key={row.id}>
                    <tr>
                      <td>
                        <input
                          className="comparison-name"
                          aria-label={text.nameLabel(row.id)}
                          title={text.editName}
                          value={row.name}
                          maxLength={20}
                          onChange={(event) =>
                            changeRow(row.id, { name: event.target.value })
                          }
                          onBlur={() => {
                            if (!row.name.trim())
                              changeRow(row.id, {
                                name: `Variation ${String(row.id).padStart(2, "0")}`,
                              });
                          }}
                        />
                        {tableType === "feasibility" && (
                          <details
                            className="table-details-toggle"
                            open={expanded}
                          >
                            <summary
                              aria-controls={
                                expanded
                                  ? `feasibility-details-${row.id}`
                                  : undefined
                              }
                              onClick={(event) => {
                                event.preventDefault();
                                setExpandedFeasibilityRows((current) =>
                                  expanded
                                    ? current.filter((id) => id !== row.id)
                                    : [...current, row.id],
                                );
                              }}
                            >
                              {expanded ? text.hideDetails : text.viewDetails}
                            </summary>
                          </details>
                        )}
                      </td>
                      <td className="table-combined-input">
                        <select
                          aria-label={text.typeLabel(row.id)}
                          value={row.type}
                          disabled={running}
                          onChange={(event) =>
                            changeRow(row.id, {
                              type: event.target.value as ExampleRow["type"],
                              value:
                                event.target.value === "Target risk"
                                  ? "5.0"
                                  : "24800",
                            })
                          }
                        >
                          <option value="Target risk">{text.targetRisk}</option>
                          <option value="Withdrawal">{text.withdrawal}</option>
                        </select>
                        {inputValue}
                      </td>
                      {tableType === "feasibility" && (
                        <td>
                          <div className="input-suffix table-input-suffix">
                            <input
                              aria-label={text.thresholdLabel(row.id)}
                              value={row.impoverishmentLevel}
                              disabled={running}
                              onChange={(event) =>
                                changeRow(row.id, {
                                  impoverishmentLevel: event.target.value,
                                })
                              }
                            />
                            <span aria-hidden="true">€</span>
                          </div>
                        </td>
                      )}
                      {tableType === "withdrawal" && (
                        <td>
                          <select
                            aria-label={text.policyLabel(row.id)}
                            value={row.policy}
                            disabled={running}
                            onChange={(event) =>
                              changeRow(row.id, {
                                policy: event.target
                                  .value as ExampleRow["policy"],
                              })
                            }
                          >
                            <option value="Unconstrained">
                              {text.unconstrained}
                            </option>
                            <option value="Projected">{text.projected}</option>
                          </select>
                        </td>
                      )}
                      {tableType === "withdrawal" ? (
                        <>
                          <td>
                            {result?.ok
                              ? row.type === "Target risk"
                                ? `€${result.annualWithdrawal.toLocaleString(language === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 2 })} ${text.perYear}`
                                : `${(result.ceRisk * 100).toFixed(2)}%`
                              : "—"}
                          </td>
                          <td>
                            {captured?.gm ? (
                              <>
                                <span>
                                  {(captured.gm.estimate * 100).toFixed(3)}%
                                </span>
                                {rowStale && !running && (
                                  <small className="table-result-detail">
                                    {text.previous}
                                  </small>
                                )}
                                <small className="table-result-detail">
                                  {captured.analytical
                                    ? text.analyticalZero
                                    : captured.gm.interval95
                                      ? `95% MC: ${(captured.gm.interval95.lower * 100).toFixed(3)}% – ${(captured.gm.interval95.upper * 100).toFixed(3)}%`
                                      : text.mcUnavailable}
                                </small>
                              </>
                            ) : captured?.status === "running" ? (
                              <span
                                className="table-cell-spinner"
                                role="status"
                                aria-label={text.calculatingGM}
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{borrowing ? borrowing.zeta.toFixed(3) : "—"}</td>
                          <td>
                            {borrowing?.probability
                              ? `${(borrowing.probability.estimate * 100).toFixed(2)}%`
                              : "—"}
                          </td>
                          <td>
                            {borrowing?.occupation
                              ? `${borrowing.occupation.estimateYears.toFixed(2)} ${text.years}`
                              : "—"}
                          </td>
                        </>
                      )}
                      <td>
                        <StatusBadge status={status} />
                        {captured?.status === "running" && (
                          <small className="table-result-detail">
                            {run?.cancelling
                              ? text.stopBatch
                              : rowEta === null
                                ? text.etaBatch
                                : rowEta > 0
                                  ? formatComparisonEta(rowEta, text)
                                  : text.finishing}
                          </small>
                        )}
                        {captured?.message && (
                          <small className="table-row-error" role="status">
                            {validationMessage(captured.message, language)}
                          </small>
                        )}
                        {rowStale &&
                          !running &&
                          tableType === "feasibility" && (
                            <small className="table-result-detail">
                              {text.previous}
                            </small>
                          )}
                        {result &&
                          !result.ok &&
                          result.message !== captured?.message && (
                            <small className="table-row-error" role="status">
                              {validationMessage(result.message, language)}
                            </small>
                          )}
                      </td>
                      <td>
                        <button
                          className="row-remove"
                          type="button"
                          aria-label={text.removeLabel(row.id)}
                          disabled={running}
                          onClick={() => {
                            if (
                              (captured?.gm ||
                                captured?.borrowing ||
                                result?.ok) &&
                              !window.confirm(text.deleteConfirm)
                            )
                              return;
                            setTables((current) => ({
                              ...current,
                              [tableType]: current[tableType].filter(
                                (item) => item.id !== row.id,
                              ),
                            }));
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                    {tableType === "feasibility" && expanded && (
                      <tr id={`feasibility-details-${row.id}`}>
                        <td colSpan={8} className="feasibility-row-details">
                          <div className="feasibility-detail-grid">
                            <div>
                              <span>
                                {(captured?.inputType ?? row.type) ===
                                "Target risk"
                                  ? text.annualWithdrawal
                                  : text.ceRisk}
                              </span>
                              <strong>
                                {!feasibilityUnavailable && captured?.ce
                                  ? (captured.inputType ?? row.type) ===
                                    "Target risk"
                                    ? `€${captured.ce.annualWithdrawal.toLocaleString(language === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 2 })} ${text.perYear}`
                                    : `${(captured.ce.ceRisk * 100).toFixed(2)}%`
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span>{text.borrowingAtRetirement}</span>
                              <strong>
                                {borrowing
                                  ? borrowing.borrowingAtRetirement
                                    ? text.yes
                                    : text.no
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span>{text.lastBorrow}</span>
                              <strong>
                                {borrowing
                                  ? borrowing.lastPossibleTimeYears === null
                                    ? text.never
                                    : `${borrowing.lastPossibleTimeYears.toFixed(2)} ${text.yearsAfter}`
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span>{text.probabilityInterval}</span>
                              <strong>
                                {borrowing?.probability
                                  ? captured?.analytical
                                    ? text.analyticalZero
                                    : formatInterval(
                                        borrowing.probability.interval95,
                                        100,
                                        "%",
                                        text.unavailable,
                                      )
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span>{text.timeInterval}</span>
                              <strong>
                                {borrowing?.occupation
                                  ? captured?.analytical
                                    ? text.analyticalZero
                                    : formatInterval(
                                        borrowing.occupation.interval95Years,
                                        1,
                                        ` ${text.years}`,
                                        text.unavailable,
                                      )
                                  : "—"}
                              </strong>
                            </div>
                          </div>
                          <p>
                            {captured?.analytical
                              ? text.zeroNote
                              : text.intervalNote}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <>
            <div className="table-run-summary" role="status" aria-live="polite">
              {running ? (
                <>
                  <span>
                    {run?.cancelling
                      ? text.stopBatches
                      : overallEta === null
                        ? text.estimateOverall
                        : formatComparisonEta(overallEta, text)}
                  </span>
                  {batchProgress && batchProgress.total > 0 && (
                    <>
                      <progress
                        aria-label={text.progress}
                        max={batchProgress.total}
                        value={batchProgress.completed}
                      />
                      <small>
                        {batchProgress.completed.toLocaleString("en-US")} /{" "}
                        {batchProgress.total.toLocaleString("en-US")}{" "}
                        {text.batches}
                      </small>
                    </>
                  )}
                  {sharedStale && <small>{text.changed}</small>}
                </>
              ) : (
                <span>
                  {tableType === "withdrawal"
                    ? text.withdrawalFooter
                    : text.feasibilityFooter}
                </span>
              )}
              {simulation.error && (
                <span className="table-row-error">
                  {validationMessage(simulation.error, language)}
                </span>
              )}
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={() =>
                running
                  ? simulation.cancel()
                  : simulation.start(tables[tableType])
              }
              disabled={
                running
                  ? run?.cancelling
                  : rows.length === 0 ||
                    allComputed ||
                    (tableType === "feasibility" && !!feasibilityUnavailable)
              }
            >
              {running ? text.cancelRows : text.computeRows}
            </button>
          </>
        </div>
      </div>
      <SectionHeading
        eyebrow={text.save}
        title={text.importExport}
        description={text.saveDescription}
      />
      <div className="data-cards">
        <div className="small-card">
          <span className="tiny-label">{text.recreate}</span>
          <h3>{text.importSetup}</h3>
          <p>
            {text.setupDescription}{" "}
            <TermLink term="setup-results">{text.setupLink}</TermLink>.
          </p>
          <div className="heading-actions">
            <SetupFileActions />
          </div>
        </div>
        <div className="small-card">
          <span className="tiny-label">{text.output}</span>
          <h3>{text.exportResults}</h3>
          <p>{text.resultsDescription}</p>
          <button
            type="button"
            className="button button-light"
            onClick={exportResults}
            disabled={!evaluationResult && !hasTableResults}
          >
            ↓ &nbsp; {text.exportResults}
          </button>
        </div>
      </div>
    </section>
  );
}
