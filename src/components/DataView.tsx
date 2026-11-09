"use client";

import { useState } from "react";
import {
  DemoAction,
  PageHeading,
  PreviewBanner,
  SectionHeading,
} from "./common";

type TableType = "withdrawal" | "policy" | "feasibility";

/** One local example row; it is not a simulation or an exported result. */
interface ExampleRow {
  id: number;
  type: string;
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
  withdrawal: "Compare withdrawals and model risks for different inputs.",
  policy: "Compare unconstrained and projected policies for selected inputs.",
  feasibility:
    "Explore how the unprojected policy's feasibility diagnostics change with the inputs.",
};

/** Design-only comparison table and separate setup/result export controls. */
export function DataView() {
  const [tableType, setTableType] = useState<TableType>("withdrawal");
  const [tables, setTables] = useState<Record<TableType, ExampleRow[]>>({
    withdrawal: initialRows(),
    policy: initialRows().map((row) => ({ ...row, value: "5.0" })),
    feasibility: initialRows(),
  });
  const rows = tables[tableType];
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
        <strong>Design preview.</strong> Add and edit example rows below. No
        calculations are performed.
      </PreviewBanner>
      <SectionHeading
        eyebrow="YOUR COMPARISON"
        title="Comparison table"
        description="Compare variations using the same market and investor settings. Export only the current table."
      >
        <DemoAction message="Table export is not connected in this design draft.">
          ↓ &nbsp; Export table
        </DemoAction>
      </SectionHeading>
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
              <option value="withdrawal">Withdrawal & risk</option>
              <option value="policy">Policy comparison</option>
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
          {tableDescriptions[tableType]} All other settings are shared. This is
          a layout preview; values are not calculated.
        </p>
        {tableType === "policy" && (
          <p className="table-description table-description-note">
            Difference from target applies when a target risk is specified.
            Borrowing refers to the policy shown in each row.
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
                {tableType === "policy" && <th>POLICY</th>}
                {tableType === "withdrawal" && (
                  <>
                    <th>WITHDRAWAL / YEAR</th>
                    <th>MODEL RISK</th>
                  </>
                )}
                {tableType === "policy" && (
                  <>
                    <th>ESTIMATED GM RISK</th>
                    <th>DIFFERENCE FROM TARGET</th>
                    <th>EVER BORROWING</th>
                  </>
                )}
                {tableType === "feasibility" && (
                  <>
                    <th>RELATIVE BANDWIDTH ζ</th>
                    <th>GLOBAL FEASIBILITY</th>
                    <th>ASSUMPTIONS</th>
                  </>
                )}
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
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
                          type: event.target.value,
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
                  {tableType === "policy" && (
                    <td>
                      <select
                        aria-label={`Policy for variation ${row.id}`}
                        value={row.policy}
                        onChange={(event) =>
                          changeRow(row.id, { policy: event.target.value })
                        }
                      >
                        <option>Unconstrained</option>
                        <option>Projected</option>
                      </select>
                    </td>
                  )}
                  <td>—</td>
                  <td>—</td>
                  {tableType !== "withdrawal" && <td>—</td>}
                  <td>
                    <span className="table-status">
                      ○ &nbsp; Not calculated
                    </span>
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
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>
            ⓘ &nbsp; Analytical and simulation outputs will appear here.
          </span>
          <DemoAction
            className="button button-primary"
            message="Table calculations are not connected in this design draft."
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
