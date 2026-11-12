"use client";

import { useState } from "react";
import { StatusBadge } from "../StatusBadge";
import { PageHeading } from "../common";
import { useSimulationDraft } from "../SimulationDraftContext";
import {
  buildMarketOptions,
  buildSimulationOptions,
} from "../../lib/options/simulation-options";
import { calibrateMarket } from "../../lib/market/calibrate-market";
import styles from "./developer.module.css";
import { SimulationCheck } from "./SimulationCheck";

/** The workspace source whose most recently prepared inputs are inspected. */
type InspectorSource = "evaluation" | "withdrawal" | "feasibility";

/** Inspect current inputs, market calibration and captured worker requests. */
export default function DeveloperView() {
  const { draft, prepared, inspectedTables } = useSimulationDraft();
  const [source, setSource] = useState<InspectorSource>("evaluation");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const current = buildSimulationOptions(draft);
  const marketInput = buildMarketOptions(draft.market);
  const calibration = marketInput.ok
    ? calibrateMarket(marketInput.market)
    : null;
  const rows = source === "evaluation" ? [] : (inspectedTables[source] ?? []);
  const row = rows.find((entry) => entry.id === selectedRow) ?? rows[0];
  const captured = source === "evaluation" ? prepared : row?.input;

  return (
    <section className="view active">
      <PageHeading
        eyebrow="DEVELOPMENT ONLY"
        title="Developer tools"
        description="Inspect current inputs and captured simulation requests during local development."
      />
      <div className={styles.grid}>
        <SimulationCheck />
        <article className="form-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">LIVE · MARKET INPUTS</span>
              <h3>Market calibration</h3>
            </div>
            {!calibration ? (
              <StatusBadge status="not-available" label="CHECK INPUTS" />
            ) : calibration.ok ? (
              <StatusBadge status="calculated" />
            ) : (
              <StatusBadge status="error" label="FAILED" />
            )}
          </div>
          <p>
            Real annual parameters, covariance, Merton direction and rho. The
            mortality fit and worker check use the calibrated market.
          </p>
          {!marketInput.ok ? (
            <ul className={styles.errors}>
              {marketInput.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : calibration && !calibration.ok ? (
            <p role="alert">{calibration.error}</p>
          ) : (
            calibration?.ok && (
              <>
                <p>
                  {calibration.market.paperAssumptions.positiveRho
                    ? "Positive rho; other result-specific conditions still require checking."
                    : "Zero rho: paper-based analytical results are outside the model's scope."}
                </p>
                <pre className={styles.code}>
                  {JSON.stringify(calibration.market, null, 2)}
                </pre>
              </>
            )
          )}
        </article>
        <article className="form-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">CAPTURED · WORKER REQUEST</span>
              <h3>Run input inspector</h3>
            </div>
          </div>
          <p>
            Inputs are captured when a run is prepared and do not change with
            later edits. The worker validates them after submission. The worker
            check above is separate.
          </p>
          <div className={styles.inspectorControls}>
            <label>
              Source
              <select
                value={source}
                onChange={(event) => {
                  setSource(event.target.value as InspectorSource);
                  setSelectedRow(null);
                }}
              >
                <option value="evaluation">Evaluation</option>
                <option value="withdrawal">
                  Withdrawal, risk &amp; policy table
                </option>
                <option value="feasibility">
                  Feasibility sensitivity table
                </option>
              </select>
            </label>
            {source !== "evaluation" && rows.length > 0 && (
              <label>
                Captured row
                <select
                  value={row?.id}
                  onChange={(event) =>
                    setSelectedRow(Number(event.target.value))
                  }
                >
                  {rows.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || `Variation ${item.id}`} (#{item.id})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {source !== "evaluation" && row && <p>{row.outcome}</p>}
          {captured ? (
            <pre className={styles.code}>
              {JSON.stringify(captured, null, 2)}
            </pre>
          ) : (
            <p>
              {source === "evaluation"
                ? "No Evaluation worker request has been prepared yet."
                : row
                  ? "No worker input is available for this row."
                  : "No table run has been prepared yet."}
            </p>
          )}
        </article>
        <details className={`form-card ${styles.inspectionDetails}`}>
          <summary>Raw input values</summary>
          <p>Live, as entered; values may be incomplete or invalid.</p>
          <pre className={styles.code}>{JSON.stringify(draft, null, 2)}</pre>
        </details>
        <details className={`form-card ${styles.inspectionDetails}`}>
          <summary>Validated simulation options</summary>
          <p>
            Live options derived from current inputs. Valid options alone do not
            establish that the market assumptions or mortality fits are ready
            for a run.
          </p>
          {current.ok ? (
            <pre className={styles.code}>
              {JSON.stringify(current.options, null, 2)}
            </pre>
          ) : (
            <ul className={styles.errors}>
              {current.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </details>
      </div>
    </section>
  );
}
