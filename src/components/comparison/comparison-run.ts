import type { SimulationDraft } from "../../lib/options/simulation-options";
import type { SharedMortalityFits } from "../SimulationDraftContext";
import { prepareEvaluationRun } from "../evaluation/evaluation-run-input";
import type { RunConfigurationInput } from "../../lib/model/simulation/run-configuration";
import type { RiskEstimate } from "../../lib/model/simulation/risk-estimate";
import {
  calculateWithdrawalRow,
  prepareWithdrawalTable,
} from "../../lib/model/comparison/withdrawal-table";

/** Editable row values captured at the start of a table run. */
export interface ComparisonRowInput {
  id: number;
  type: "Target risk" | "Withdrawal";
  value: string;
  policy: "Unconstrained" | "Projected";
}

/** One captured table row and its evolving simulation status. */
export interface ComparisonRunRow {
  id: number;
  rowSignature: string;
  policy: ComparisonRowInput["policy"];
  ce?: { annualWithdrawal: number; ceRisk: number };
  input?: RunConfigurationInput;
  status: "queued" | "running" | "calculated" | "error" | "cancelled";
  message?: string;
  gm?: RiskEstimate;
  analytical?: boolean;
  completedPaths?: number;
  totalPaths?: number;
  elapsedMs?: number;
}

/** Identify shared market, investor, numerical and mortality inputs used by a table. */
export function comparisonSetupSignature(
  draft: SimulationDraft,
  fits: SharedMortalityFits,
): string {
  return JSON.stringify({
    market: draft.market,
    investor: draft.investor,
    numerical: {
      paths: draft.simulation.paths,
      timeStep: draft.simulation.timeStep,
      batchSize: draft.simulation.batchSize,
    },
    fits,
  });
}

/** Identify the row-specific inputs used to obtain a GM result. */
export function comparisonRowSignature(row: ComparisonRowInput): string {
  return JSON.stringify({
    type: row.type,
    value: row.value,
    policy: row.policy,
  });
}

/**
 * Capture all shared settings once, resolve each CE input, and construct one
 * isolated risk-only worker input per nontrivial row. Below the safe boundary
 * no financial hit is possible before the CE horizon, so the GM result is an
 * analytical zero. Invalid rows fail independently and do not block the queue.
 */
export function prepareComparisonRows(
  rows: readonly ComparisonRowInput[],
  draft: SimulationDraft,
  fits: SharedMortalityFits,
):
  | { ok: true; signature: string; rows: ComparisonRunRow[] }
  | { ok: false; message: string } {
  const capturedDraft = structuredClone(draft);
  const capturedFits = structuredClone(fits);
  const context = prepareWithdrawalTable(capturedDraft, capturedFits);
  if (!context.available) return { ok: false, message: context.message };

  // The table supplies withdrawal per row, independently of Evaluation's mode.
  capturedDraft.simulation.withdrawalMode = "customAmount";
  capturedDraft.simulation.withdrawalEuros = context.safeAnnualWithdrawal;
  capturedDraft.simulation.projected = false;
  const base = prepareEvaluationRun(capturedDraft, capturedFits);
  if (!base.ok) return { ok: false, message: base.errors.join(" ") };

  const prepared = rows.map((row): ComparisonRunRow => {
    const common = {
      id: row.id,
      rowSignature: comparisonRowSignature(row),
      policy: row.policy,
    };
    const ce = calculateWithdrawalRow(context, row.type, row.value);
    if (!ce.ok) return { ...common, status: "error", message: ce.message };

    if (ce.ceRisk === 0)
      return {
        ...common,
        ce,
        status: "calculated",
        analytical: true,
        gm: { estimate: 0, standardError: null, interval95: null },
      };

    const input = structuredClone(base.input);
    input.options.policy = {
      projected: row.policy === "Projected",
      withdrawal: { mode: "customAmount", annualAmount: ce.annualWithdrawal },
    };
    input.numerical.seed = `comparison-row-${row.id}`;
    input.versions.simulationAlgorithm =
      row.policy === "Projected"
        ? "tensorflow-paired-euler-1"
        : "tensorflow-bridge-2";

    return { ...common, ce, input, status: "queued" };
  });

  return {
    ok: true,
    signature: comparisonSetupSignature(draft, fits),
    rows: prepared,
  };
}
