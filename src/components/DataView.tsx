"use client";

import { useMemo, useState } from "react";
import { useSimulationDraft } from "./SimulationDraftContext";
import { SimulationDetailFields } from "./SimulationDetailFields";
import {
  calculateWithdrawalRow,
  prepareWithdrawalTable,
} from "../lib/model/comparison/withdrawal-table";
import { StatusBadge } from "./StatusBadge";
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
  policy: string;
}

/** Each table keeps its own editable examples when the user switches views. */
function initialRows(): ExampleRow[] {
  return [
    { id: 1, type: "Target risk", value: "5.0", policy: "Unconstrained" },
    { id: 2, type: "Target risk", value: "10.0", policy: "Projected" },
  ];
}

const tableDescriptions: Record<TableType, string> = {
  withdrawal:
    "Compare withdrawals and risk across unconstrained and projected policies.",
  feasibility:
    "Explore how the unprojected policy's feasibility diagnostics change with the inputs.",
};

/** Compare editable rows against the shared setup; exports and other tables are previews. */
export function DataView() {
  const { draft, setDraft, mortalityFits } = useSimulationDraft();
  const withdrawalContext = useMemo(
    () => prepareWithdrawalTable(draft, mortalityFits),
    [draft.market, draft.investor, mortalityFits.ce],
  );
  const [tableType, setTableType] = useState<TableType>("withdrawal");
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [tables, setTables] = useState<Record<TableType, ExampleRow[]>>({
    withdrawal: initialRows(),
    feasibility: initialRows(),
  });
  const rows = tables[tableType];
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
        <strong>In progress.</strong> CE values update analytically. GM risk,
        feasibility sensitivity and export controls are previews.
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
        {tableType === "withdrawal" && !withdrawalContext.available && (
          <p className="table-description table-description-note" role="status">
            {withdrawalContext.message}
          </p>
        )}
        {tableType === "withdrawal" && (
          <p className="table-description table-description-note">
            The CE value uses the unconstrained policy, including for projected
            rows. GM risk is a placeholder and is not yet calculated.
          </p>
        )}
        {tableType === "feasibility" && (
          <p className="table-description table-description-note">
            Diagnostics concern the unprojected policy and depend on the model
            assumptions.
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
                    <th>RELATIVE BANDWIDTH ζ</th>
                    <th>GLOBAL FEASIBILITY</th>
                    <th>ASSUMPTIONS</th>
                  </>
                )}
                <th>{tableType === "withdrawal" ? "GM STATUS" : "STATUS"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const result =
                  tableType === "withdrawal" && withdrawalContext.available
                    ? calculateWithdrawalRow(
                        withdrawalContext,
                        row.type,
                        row.value,
                      )
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
                      <input
                        aria-label={`Input value for variation ${row.id}`}
                        value={row.value}
                        onChange={(event) =>
                          changeRow(row.id, { value: event.target.value })
                        }
                      />
                      <small>
                        {" "}
                        {row.type === "Target risk" ? "%" : "€ / year"}
                      </small>
                    </td>
                    {tableType === "withdrawal" && (
                      <td>
                        <select
                          aria-label={`Policy for variation ${row.id}`}
                          value={row.policy}
                          onChange={(event) =>
                            changeRow(row.id, {
                              policy: event.target.value,
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
                              ? `${resultHeading === "WITHDRAWAL / CE RISK" ? "Withdrawal: " : ""}€${result.annualWithdrawal.toLocaleString("en-US", { maximumFractionDigits: 2 })} / year`
                              : `${(result.ceRisk * 100).toFixed(2)}% CE risk`
                            : "—"}
                        </td>
                        <td>—</td>
                      </>
                    ) : (
                      <>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                      </>
                    )}
                    <td>
                      <StatusBadge
                        status={
                          tableType !== "withdrawal"
                            ? "not-calculated"
                            : !withdrawalContext.available
                              ? "not-available"
                              : result?.ok
                                ? "not-calculated"
                                : "error"
                        }
                      />
                      {result && !result.ok && (
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
                        onClick={() =>
                          setTables((current) => ({
                            ...current,
                            [tableType]: current[tableType].filter(
                              (item) => item.id !== row.id,
                            ),
                          }))
                        }
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
          <span>
            ⓘ &nbsp;{" "}
            {tableType === "withdrawal"
              ? "CE values update automatically; GM simulations are not connected yet."
              : "Analytical and simulation outputs will appear here."}
          </span>
          <DemoAction
            className="button button-primary"
            message="Table simulations are not connected in this design draft."
          >
            ▶ &nbsp; Compute rows
          </DemoAction>
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
