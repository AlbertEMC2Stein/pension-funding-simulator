"use client";

import {
  MANUAL_BATCH_SIZES,
  type BatchSizeChoice,
} from "../lib/options/batch-size";
import type { SimulationDraft } from "../lib/options/simulation-options";

/** Shared numerical controls; each instance gets unique, accessible field IDs. */
export function SimulationDetailFields({
  simulation,
  onChange,
  idPrefix,
}: {
  simulation: SimulationDraft["simulation"];
  onChange: (change: Partial<SimulationDraft["simulation"]>) => void;
  idPrefix: string;
}) {
  return (
    <div className="simulation-detail-fields">
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-paths`}>
          Number of paths
        </label>
        <select
          id={`${idPrefix}-paths`}
          value={simulation.paths}
          onChange={(event) => onChange({ paths: Number(event.target.value) })}
        >
          <option value={10000}>10,000 paths</option>
          <option value={5000}>5,000 paths</option>
          <option value={50000}>50,000 paths</option>
          <option value={100000}>100,000 paths</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-step`}>
          Time step
        </label>
        <select
          id={`${idPrefix}-step`}
          value={simulation.timeStep}
          onChange={(event) =>
            onChange({
              timeStep: event.target.value as typeof simulation.timeStep,
            })
          }
        >
          <option value="monthly">Monthly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-batch-size`}>
          Batch size
        </label>
        <select
          id={`${idPrefix}-batch-size`}
          value={simulation.batchSize}
          onChange={(event) =>
            onChange({
              batchSize:
                event.target.value === "auto"
                  ? "auto"
                  : (Number(event.target.value) as BatchSizeChoice),
            })
          }
        >
          <option value="auto">Automatic</option>
          {MANUAL_BATCH_SIZES.map((size) => (
            <option key={size} value={size}>
              {size.toLocaleString("en-US")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-seed`}>
          Random seed
        </label>
        <input
          id={`${idPrefix}-seed`}
          type="text"
          value={simulation.seed}
          maxLength={64}
          onChange={(event) => onChange({ seed: event.target.value })}
        />
        <small>
          Keep the seed, path count and batch size to repeat random draws. Table
          rows use separate streams; results can differ across backends.
        </small>
      </div>
    </div>
  );
}
