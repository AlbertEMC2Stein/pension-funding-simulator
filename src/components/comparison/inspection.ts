import type { InspectedTableRow } from "../SimulationDraftContext";
import type { ComparisonRowInput, ComparisonRunRow } from "./comparison-run";

/**
 * Capture the prepared input and preparation outcome for each table row. A
 * reused result retains its earlier input; analytical and invalid rows have no
 * worker request. Copies prevent subsequent row edits from altering inspection.
 */
export function captureTableInspection(
  inputs: readonly ComparisonRowInput[],
  prepared: readonly ComparisonRunRow[],
): InspectedTableRow[] {
  return prepared.map((row) => ({
    id: row.id,
    name:
      inputs.find((item) => item.id === row.id)?.name ?? `Variation ${row.id}`,
    input: row.input ? structuredClone(row.input) : undefined,
    outcome: row.input
      ? row.status === "calculated"
        ? "Reused result; input captured by an earlier table run"
        : "Worker input prepared"
      : (row.message ??
        (row.analytical
          ? "Calculated analytically; no worker input"
          : "No worker input")),
  }));
}
