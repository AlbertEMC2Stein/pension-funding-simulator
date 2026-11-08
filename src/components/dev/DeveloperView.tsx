"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "../common";
import { useSimulationDraft } from "../SimulationDraftContext";
import {
  buildMarketOptions,
  buildSimulationOptions,
} from "../../lib/simulation-options";
import { calibrateMarket } from "../../lib/calibrate-market";
import styles from "./developer.module.css";

interface Activity {
  id: number;
  time: string;
  level: "info" | "error";
  message: string;
}

/** Development-only diagnostics. Activity stays in memory and is capped at 100 entries. */
export default function DeveloperView() {
  const { draft, prepared } = useSimulationDraft();
  const current = buildSimulationOptions(draft);
  const marketInput = buildMarketOptions(draft.market);
  const calibration = marketInput.ok
    ? calibrateMarket(marketInput.market)
    : null;
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    let nextId = 0;
    function record(event: Event) {
      const detail = (
        event as CustomEvent<{ level: "info" | "error"; message: string }>
      ).detail;
      if (
        !detail ||
        typeof detail.message !== "string" ||
        !["info", "error"].includes(detail.level)
      )
        return;
      const entry: Activity = {
        id: nextId++,
        time: new Date().toLocaleTimeString(),
        level: detail.level,
        message: detail.message,
      };
      setActivity((previous) => [...previous, entry].slice(-100));
    }
    window.addEventListener("simulation-debug-event", record);
    return () => window.removeEventListener("simulation-debug-event", record);
  }, []);

  return (
    <section className="view active">
      <PageHeading
        eyebrow="DEVELOPMENT ONLY"
        title="Developer tools"
        description="Inspect the current inputs and recent activity during local development."
      />
      <div className={styles.grid}>
        <article className="form-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">LIVE · MANUAL INPUTS</span>
              <h3>Market calibration</h3>
            </div>
            <span className="chip">
              {!calibration
                ? "CHECK INPUTS"
                : calibration.ok
                  ? "CALCULATED"
                  : "FAILED"}
            </span>
          </div>
          <p>
            Real annual parameters, covariance, Merton direction and rho. These
            values are not yet connected to simulation or mortality results.
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
              <span className="tiny-label">LIVE · AS ENTERED</span>
              <h3>Raw input values</h3>
            </div>
          </div>
          <p>
            Updates as you edit the interface. Values retain their original
            format and may be incomplete or invalid.
          </p>
          <pre className={styles.code}>{JSON.stringify(draft, null, 2)}</pre>
        </article>
        <article className="form-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">LIVE · VALIDATED</span>
              <h3>Validated simulation options</h3>
            </div>
            <span className="chip">
              {current.ok ? "VALID" : "CHECK INPUTS"}
            </span>
          </div>
          <p>
            Derived from the current inputs after validation. Rates are decimal
            fractions; amounts are in euros. Errors are shown if inputs are
            invalid.
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
        </article>
        <article className="form-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">LAST RUN REQUEST</span>
              <h3>Last prepared options</h3>
            </div>
            <span className="chip">
              {!prepared
                ? "NOT PREPARED"
                : prepared.draft === draft
                  ? "CURRENT"
                  : "NEEDS UPDATING"}
            </span>
          </div>
          {prepared ? (
            <>
              <p>
                Captured when Run simulation was last requested. This snapshot
                does not change as you edit inputs; no simulation has run yet.
              </p>
              <pre className={styles.code}>
                {JSON.stringify(prepared.options, null, 2)}
              </pre>
            </>
          ) : (
            <p>No validated snapshot has been prepared yet.</p>
          )}
        </article>
        <article className="form-card">
          <div className="card-heading">
            <div>
              <span className="tiny-label">LOCAL ACTIVITY</span>
              <h3>Event log</h3>
            </div>
            <button
              type="button"
              className="button button-light"
              onClick={() => setActivity([])}
              disabled={activity.length === 0}
            >
              Clear log
            </button>
          </div>
          <p>
            In memory only; the most recent 100 events are kept. Worker events
            will be added when simulations are implemented.
          </p>
          {activity.length === 0 ? (
            <p>No events recorded yet.</p>
          ) : (
            <ol className={styles.log} aria-live="polite">
              {activity.map((entry) => (
                <li key={entry.id}>
                  <time>{entry.time}</time>{" "}
                  <strong>{entry.level.toUpperCase()}</strong> {entry.message}
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </section>
  );
}
