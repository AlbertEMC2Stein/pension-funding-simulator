"use client";

import { useMemo, useState } from "react";
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
import {
  DemoAction,
  PageHeading,
  PreviewBanner,
  SectionHeading,
} from "./common";

/** Available comparison-table layouts; each keeps separate editable example rows. */
type TableType = "withdrawal" | "feasibility";

/** Editable row shared by the table layouts; values are text until validated. */
interface ExampleRow {
  id: number;
  type: "Target risk" | "Withdrawal";
  value: string;
  /** Row-specific threshold used only by the feasibility layout. */
  impoverishmentLevel: string;
  policy: "Unconstrained" | "Projected";
}

/** Each table keeps its own editable examples when the user switches views. */
function initialRows(impoverishmentLevel: string): ExampleRow[] {
  return [
    {
      id: 1,
      type: "Target risk",
      value: "5.0",
      policy: "Unconstrained",
      impoverishmentLevel,
    },
    {
      id: 2,
      type: "Target risk",
      value: "10.0",
      policy: "Projected",
      impoverishmentLevel,
    },
  ];
}

/** Format a batch-based ETA without implying sub-second precision. */
function formatComparisonEta(milliseconds: number): string {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  return seconds < 60
    ? `About ${seconds} s left`
    : `About ${Math.floor(seconds / 60)} min ${seconds % 60} s left`;
}

const tableDescriptions: Record<TableType, string> = {
  withdrawal:
    "Compare withdrawals and risk across unconstrained and projected policies.",
  feasibility:
    "Vary risk or withdrawal and the impoverishment level for the unconstrained policy.",
};

/** Compare editable rows against the shared setup; exports and other tables are previews. */
export function DataView() {
  const { draft, setDraft, mortalityFits } = useSimulationDraft();
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
    ? "This comparison is available for the unconstrained policy only. Turn off projection to view it. The projected policy prevents borrowing and short selling by keeping allocations within the simplex."
    : marketFeasibility.status === "negative-merton"
      ? "This comparison is unavailable because a Merton-vector component is negative. The unconstrained policy requires short selling whenever wealth is below the safe boundary."
      : null;
  const simulation = useComparisonSimulation(draft, mortalityFits);
  const run = simulation.run;
  const running = run?.running ?? false;
  const sharedStale = run
    ? run.signature !== comparisonSetupSignature(draft, mortalityFits)
    : false;
  const overallEta =
    run?.running && !run.cancelling ? comparisonQueueRemaining(run.rows) : null;
  const batchProgress = run ? comparisonBatchProgress(run.rows) : null;
  const [tableType, setTableType] = useState<TableType>("withdrawal");
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [tables, setTables] = useState<Record<TableType, ExampleRow[]>>({
    withdrawal: initialRows(draft.investor.impoverishmentLevel),
    feasibility: initialRows(draft.investor.impoverishmentLevel),
  });
  const rows = tables[tableType];
  const allComputed =
    run !== null &&
    !sharedStale &&
    areComparisonRowsCalculated(tables.withdrawal, run.rows);
  const resultHeading =
    rows.length === 0
      ? "CE RESULT"
      : rows.every((row) => row.type === "Target risk")
        ? "ANNUAL WITHDRAWAL"
        : rows.every((row) => row.type === "Withdrawal")
          ? "CE LIFETIME RISK"
          : "WITHDRAWAL / CE RISK";
  // Keep IDs stable after deletion so editing one row does not affect another.
  const [nextId, setNextId] = useState(3);
  /** Merge a partial edit into the selected row without changing other rows. */
  function changeRow(id: number, change: Partial<ExampleRow>) {
    setTables((current) => ({
      ...current,
      [tableType]: current[tableType].map((row) =>
        row.id === id ? { ...row, ...change } : row,
      ),
    }));
  }

  return (
    <section className="view active">
      <PageHeading
        eyebrow="EXPLORE THE DETAILS"
        title="Make room for questions"
        description="Compare variations of your setup and save your work."
      />
      <PreviewBanner>
        <strong>In progress.</strong> CE values update analytically; GM risk is
        estimated by simulation. Feasibility sensitivity and exports are
        previews.
      </PreviewBanner>
      <SectionHeading
        eyebrow="YOUR COMPARISON"
        title="Comparison table"
        description="Compare variations using the same market and investor settings. Export only the current table."
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
            ☷ &nbsp; Simulation settings
          </button>
          <DemoAction message="Table export is not connected in this design draft.">
            ↓ &nbsp; Export table
          </DemoAction>
        </div>
      </SectionHeading>
      {settingsOpen && (
        <aside
          id="table-simulation-settings"
          className="settings-panel table-settings-panel"
        >
          <div className="settings-heading">
            <div>
              <span className="tiny-label">MAKE IT YOURS</span>
              <h2>Simulation settings</h2>
            </div>
            <button
              type="button"
              className="close-settings"
              aria-label="Close simulation settings"
              onClick={() => setSettingsOpen(false)}
            >
              ×
            </button>
          </div>
          <p className="settings-lead">
            These settings are shared with Evaluation and apply to future
            simulation runs.
          </p>
          <div className="settings-group">
            <div className="group-title">Simulation detail</div>
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
            TABLE TYPE
            <select
              value={tableType}
              disabled={running}
              onChange={(event) =>
                setTableType(event.target.value as TableType)
              }
            >
              <option value="withdrawal">Withdrawal, risk & policy</option>
              <option value="feasibility">Feasibility sensitivity</option>
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
            + &nbsp; Add row
          </button>
        </div>
        <p className="table-description">
          {tableDescriptions[tableType]} All other settings are shared.
          {tableType !== "withdrawal" &&
            " This table is a layout preview; values are not calculated."}
        </p>
        {tableType === "withdrawal" &&
          !running &&
          !withdrawalContext.available && (
            <p
              className="table-description table-description-note"
              role="status"
            >
              {withdrawalContext.message}
            </p>
          )}
        {tableType === "withdrawal" && (
          <p className="table-description table-description-note">
            The CE value uses the unconstrained policy, including for projected
            rows. GM risk is for the selected policy, through the CE horizon.
          </p>
        )}
        {tableType === "feasibility" && (
          <p className="table-description table-description-note">
            ζ ≤ 1 indicates global feasibility when all Merton-vector components
            are non-negative and at least one is positive. Negative components
            require short selling in the risky region. Borrowing probability and
            time use GM mortality; row-specific impoverishment levels start from
            the shared setup.
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
                <th>VARIATION</th>
                <th>INPUT TYPE</th>
                <th>INPUT VALUE</th>
                {tableType === "withdrawal" && (
                  <>
                    <th>POLICY</th>
                    <th>{resultHeading}</th>
                    <th>ESTIMATED GM RISK</th>
                  </>
                )}
                {tableType === "feasibility" && (
                  <>
                    <th>IMPOVERISHMENT LEVEL</th>
                    <th>{resultHeading}</th>
                    <th>RELATIVE BANDWIDTH ζ</th>
                    <th>BORROWING AT RETIREMENT</th>
                    <th>LAST POSSIBLE BORROWING</th>
                    <th>EVER BORROWING (GM)</th>
                    <th>EXPECTED BORROWING TIME (GM)</th>
                  </>
                )}
                <th>{tableType === "withdrawal" ? "GM STATUS" : "STATUS"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const captured =
                  tableType === "withdrawal"
                    ? run?.rows.find((item) => item.id === row.id)
                    : undefined;
                const rowStale =
                  captured &&
                  (sharedStale ||
                    captured.rowSignature !== comparisonRowSignature(row));
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
                const status = captured
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

                return (
                  <tr key={row.id}>
                    <td>
                      <b>Variation {String(row.id).padStart(2, "0")}</b>
                    </td>
                    <td>
                      <select
                        aria-label={`Input type for variation ${row.id}`}
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
                        <option>Target risk</option>
                        <option>Withdrawal</option>
                      </select>
                    </td>
                    <td>
                      <div className="input-suffix table-input-suffix">
                        <input
                          aria-label={`Input value for variation ${row.id}, ${row.type === "Target risk" ? "percent" : "euros per year"}`}
                          value={row.value}
                          disabled={running}
                          onChange={(event) =>
                            changeRow(row.id, { value: event.target.value })
                          }
                        />
                        <span aria-hidden="true">
                          {row.type === "Target risk" ? "%" : "€ / year"}
                        </span>
                      </div>
                    </td>
                    {tableType === "feasibility" && (
                      <td>
                        <div className="input-suffix table-input-suffix">
                          <input
                            aria-label={`Impoverishment level for variation ${row.id}, euros`}
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
                          aria-label={`Policy for variation ${row.id}`}
                          value={row.policy}
                          disabled={running}
                          onChange={(event) =>
                            changeRow(row.id, {
                              policy: event.target
                                .value as ExampleRow["policy"],
                            })
                          }
                        >
                          <option>Unconstrained</option>
                          <option>Projected</option>
                        </select>
                      </td>
                    )}
                    {tableType === "withdrawal" ? (
                      <>
                        <td>
                          {result?.ok
                            ? row.type === "Target risk"
                              ? `€${result.annualWithdrawal.toLocaleString("en-US", { maximumFractionDigits: 2 })} / year`
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
                                  Previous setup or row inputs
                                </small>
                              )}
                              <small className="table-result-detail">
                                {captured.analytical
                                  ? "Analytical zero"
                                  : captured.gm.interval95
                                    ? `95% MC: ${(captured.gm.interval95.lower * 100).toFixed(3)}% – ${(captured.gm.interval95.upper * 100).toFixed(3)}%`
                                    : "MC interval unavailable"}
                              </small>
                            </>
                          ) : captured?.status === "running" ? (
                            <span
                              className="table-cell-spinner"
                              role="status"
                              aria-label="Calculating GM risk"
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                      </>
                    )}
                    <td>
                      <StatusBadge status={status} />
                      {captured?.status === "running" && (
                        <small className="table-result-detail">
                          {run?.cancelling
                            ? "Stopping after current batch…"
                            : rowEta === null
                              ? "ETA after first batch"
                              : rowEta > 0
                                ? formatComparisonEta(rowEta)
                                : "Finishing…"}
                        </small>
                      )}
                      {captured?.message && (
                        <small className="table-row-error" role="status">
                          {captured.message}
                        </small>
                      )}
                      {result &&
                        !result.ok &&
                        result.message !== captured?.message && (
                          <small className="table-row-error" role="status">
                            {result.message}
                          </small>
                        )}
                    </td>
                    <td>
                      <button
                        className="row-remove"
                        type="button"
                        aria-label={`Remove variation ${row.id}`}
                        disabled={running}
                        onClick={() => {
                          if (
                            (captured?.gm || result?.ok) &&
                            !window.confirm(
                              "Delete this variation and its calculated values?",
                            )
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
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          {tableType === "withdrawal" ? (
            <>
              <div
                className="table-run-summary"
                role="status"
                aria-live="polite"
              >
                {running ? (
                  <>
                    <span>
                      {run?.cancelling
                        ? "Stopping after the current batches…"
                        : overallEta === null
                          ? "Estimating overall time…"
                          : formatComparisonEta(overallEta)}
                    </span>
                    {batchProgress && batchProgress.total > 0 && (
                      <>
                        <progress
                          aria-label="Table simulation progress"
                          max={batchProgress.total}
                          value={batchProgress.completed}
                        />
                        <small>
                          {batchProgress.completed.toLocaleString("en-US")} /{" "}
                          {batchProgress.total.toLocaleString("en-US")} batches
                        </small>
                      </>
                    )}
                    {sharedStale && (
                      <small>
                        Settings changed; this run continues with its captured
                        setup.
                      </small>
                    )}
                  </>
                ) : (
                  <span>
                    CE values are analytical; GM risk is estimated through the
                    CE horizon.
                  </span>
                )}
                {simulation.error && (
                  <span className="table-row-error">{simulation.error}</span>
                )}
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={() =>
                  running
                    ? simulation.cancel()
                    : simulation.start(tables.withdrawal)
                }
                disabled={
                  running ? run?.cancelling : rows.length === 0 || allComputed
                }
              >
                {running ? "Cancel rows" : "▶  Compute rows"}
              </button>
            </>
          ) : (
            <>
              <span>
                ⓘ &nbsp; Analytical and simulation outputs will appear here.
              </span>
              {feasibilityUnavailable ? (
                <button type="button" className="button button-primary" disabled>
                  ▶ &nbsp; Compute rows
                </button>
              ) : (
                <DemoAction
                  className="button button-primary"
                  message="Feasibility calculations are not connected yet."
                >
                  ▶ &nbsp; Compute rows
                </DemoAction>
              )}
            </>
          )}
        </div>
      </div>
      <SectionHeading
        eyebrow="SAVE AND RESTORE"
        title="Import & export"
        description="Keep your setup and your results separately."
      />
      <div className="data-cards">
        <div className="small-card">
          <span className="tiny-label">RECREATE YOUR SETUP</span>
          <h3>Import or export setup</h3>
          <p>Save or restore your inputs, calibration and run settings.</p>
          <div className="heading-actions">
            <DemoAction message="Setup import is not connected in this draft.">
              ↥ &nbsp; Import setup
            </DemoAction>
            <DemoAction message="Setup export is not connected in this draft.">
              ↓ &nbsp; Export setup
            </DemoAction>
          </div>
        </div>
        <div className="small-card">
          <span className="tiny-label">KEEP YOUR OUTPUTS</span>
          <h3>Export results</h3>
          <p>
            Save the computed tables and diagnostics, linked to the setup and
            run that produced them.
          </p>
          <DemoAction message="Results export is not connected in this draft.">
            ↓ &nbsp; Export results
          </DemoAction>
        </div>
      </div>
    </section>
  );
}
