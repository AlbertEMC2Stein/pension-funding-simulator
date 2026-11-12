import type { SimulationDraft } from "../../lib/options/simulation-options";
import type { SharedMortalityFits } from "../SimulationDraftContext";
import { prepareEvaluationRun } from "../evaluation/evaluation-run-input";
import type { RunConfigurationInput } from "../../lib/model/simulation/run-configuration";
import type { RiskEstimate } from "../../lib/model/simulation/risk-estimate";
import type { RunSchedulerResult } from "../../lib/model/simulation/tensorflow/run-scheduler";
import { compatibleGlobalFeasibility } from "../../lib/model/analytical/compatible-policy";
import { borrowingProperties } from "../evaluation/borrowing-diagnostics";
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
  /** Feasibility rows override the shared impoverishment level. */
  impoverishmentLevel?: string;
}

/** Selects which outputs the comparison worker must retain. */
export type ComparisonKind = "withdrawal" | "feasibility";

/** One captured table row and its evolving simulation status. */
export interface ComparisonRunRow {
  id: number;
  rowSignature: string;
  policy: ComparisonRowInput["policy"];
  kind?: ComparisonKind;
  /** Captured input type, retained so stale results keep their original labels. */
  inputType?: ComparisonRowInput["type"];
  ce?: { annualWithdrawal: number; ceRisk: number };
  input?: RunConfigurationInput;
  status: "queued" | "running" | "calculated" | "error" | "cancelled";
  message?: string;
  gm?: RiskEstimate;
  analytical?: boolean;
  /** Analytical feasibility and GM-weighted borrowing estimates. */
  borrowing?: {
    zeta: number;
    borrowingAtRetirement: boolean;
    lastPossibleTimeYears: number | null;
    probability?: RiskEstimate;
    occupation?: RunSchedulerResult["borrowingOccupation"];
  };
  /** Batches scheduled in this table run; absent for reused or analytical rows. */
  batchProgress?: { completed: number; total: number };
  completedPaths?: number;
  totalPaths?: number;
  elapsedMs?: number;
  /** Monotonic time when the worker started, used before its first batch. */
  startedAtMs?: number;
}

/** Identify shared market, investor, numerical and mortality inputs used by a table. */
export function comparisonSetupSignature(
  draft: SimulationDraft,
  fits: SharedMortalityFits,
  kind: ComparisonKind = "withdrawal",
): string {
  return JSON.stringify({
    market: draft.market,
    investor: draft.investor,
    numerical: {
      paths: draft.simulation.paths,
      timeStep: draft.simulation.timeStep,
      batchSize: draft.simulation.batchSize,
      seed: draft.simulation.seed,
    },
    ...(kind === "feasibility"
      ? { projected: draft.simulation.projected }
      : {}),
    fits,
  });
}

/** Identify the row-specific inputs used to obtain a GM result. */
export function comparisonRowSignature(
  row: ComparisonRowInput,
  kind: ComparisonKind = "withdrawal",
): string {
  return JSON.stringify({
    type: row.type,
    value: row.value,
    policy: row.policy,
    ...(kind === "feasibility"
      ? { impoverishmentLevel: row.impoverishmentLevel }
      : {}),
  });
}

/**
 * Check whether every visible row has a completed GM result for its current
 * row inputs. The caller must also verify that the shared setup still matches.
 */
export function areComparisonRowsCalculated(
  rows: readonly ComparisonRowInput[],
  results: readonly ComparisonRunRow[],
  kind: ComparisonKind = "withdrawal",
): boolean {
  if (rows.length === 0) return false;

  const byId = new Map(results.map((result) => [result.id, result]));
  return rows.every((row) => {
    const result = byId.get(row.id);
    return (
      result?.status === "calculated" &&
      (kind === "feasibility"
        ? result.borrowing?.probability !== undefined &&
          result.borrowing.occupation !== undefined
        : result.gm !== undefined) &&
      result.rowSignature === comparisonRowSignature(row, kind)
    );
  });
}

/**
 * Capture all shared settings once, resolve each CE input, and construct one
 * isolated worker input per nontrivial row. Withdrawal rows need GM risk;
 * feasibility rows request borrowing diagnostics for their own threshold.
 * Zero CE risk or a globally feasible policy can yield analytical zeros for
 * the corresponding outputs. Invalid rows fail independently of the queue.
 * Completed results are reused only when the captured shared setup and the
 * individual row inputs both match the previous run.
 */
export function prepareComparisonRows(
  rows: readonly ComparisonRowInput[],
  draft: SimulationDraft,
  fits: SharedMortalityFits,
  previous?: { signature: string; rows: readonly ComparisonRunRow[] } | null,
  kind: ComparisonKind = "withdrawal",
):
  | { ok: true; signature: string; rows: ComparisonRunRow[] }
  | { ok: false; message: string } {
  const capturedDraft = structuredClone(draft);
  const capturedFits = structuredClone(fits);
  const context = prepareWithdrawalTable(capturedDraft, capturedFits);
  if (!context.available) return { ok: false, message: context.message };
  if (
    kind === "feasibility" &&
    (draft.simulation.projected ||
      context.model.market.mertonDirection.some((value) => value < 0))
  )
    return {
      ok: false,
      message:
        "Feasibility comparisons require an unconstrained policy without short selling.",
    };

  // The table supplies withdrawal per row, independently of Evaluation's mode.
  capturedDraft.simulation.withdrawalMode = "customAmount";
  capturedDraft.simulation.withdrawalEuros = context.safeAnnualWithdrawal;
  capturedDraft.simulation.projected = false;
  const base = prepareEvaluationRun(capturedDraft, capturedFits);
  if (!base.ok) return { ok: false, message: base.errors.join(" ") };

  const signature = comparisonSetupSignature(draft, fits, kind);
  const reusableRows =
    previous?.signature === signature
      ? new Map(previous.rows.map((row) => [row.id, row]))
      : new Map<number, ComparisonRunRow>();

  const prepared = rows.map((row): ComparisonRunRow => {
    const common = {
      id: row.id,
      rowSignature: comparisonRowSignature(row, kind),
      policy: kind === "feasibility" ? ("Unconstrained" as const) : row.policy,
      kind,
      inputType: row.type,
    };
    const rowDraft = structuredClone(capturedDraft);
    if (kind === "feasibility")
      rowDraft.investor.impoverishmentLevel = row.impoverishmentLevel ?? "";
    const rowContext =
      kind === "feasibility"
        ? prepareWithdrawalTable(rowDraft, capturedFits)
        : context;
    if (!rowContext.available)
      return { ...common, status: "error", message: rowContext.message };
    const ce = calculateWithdrawalRow(rowContext, row.type, row.value);
    if (!ce.ok) return { ...common, status: "error", message: ce.message };

    const cached = reusableRows.get(row.id);
    if (
      cached?.status === "calculated" &&
      (kind === "feasibility"
        ? cached.borrowing?.probability && cached.borrowing.occupation
        : cached.gm) &&
      cached.rowSignature === common.rowSignature
    )
      return { ...cached, ...common, ce, batchProgress: undefined };

    if (kind === "withdrawal" && ce.ceRisk === 0)
      return {
        ...common,
        ce,
        status: "calculated",
        analytical: true,
        gm: { estimate: 0, standardError: null, interval95: null },
      };

    let borrowing: ComparisonRunRow["borrowing"];
    if (kind === "feasibility") {
      try {
        const zeta =
          ce.annualWithdrawal === 0
            ? 0
            : compatibleGlobalFeasibility(rowContext.model, ce.annualWithdrawal)
                .relativeBandwidthExcess;
        if (zeta === null)
          throw new Error("The Merton vector requires short selling.");
        const properties = borrowingProperties(
          rowContext.model,
          ce.annualWithdrawal,
          rowContext.initialCapital,
          zeta,
        );
        if (!properties.available)
          throw new Error(
            "Borrowing diagnostics are unavailable for this row.",
          );
        borrowing = {
          zeta,
          borrowingAtRetirement: properties.borrowingAtRetirement,
          lastPossibleTimeYears: properties.lastPossibleTimeYears,
        };
        if (zeta <= 1)
          return {
            ...common,
            ce,
            status: "calculated",
            analytical: true,
            borrowing: {
              ...borrowing,
              probability: {
                estimate: 0,
                standardError: null,
                interval95: null,
              },
              occupation: {
                estimateYears: 0,
                standardErrorYears: null,
                interval95Years: null,
              },
            },
          };
      } catch (error) {
        return {
          ...common,
          ce,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not calculate borrowing diagnostics.",
        };
      }
    }

    const input = structuredClone(base.input);
    input.options.investor.impoverishmentLevel =
      rowContext.model.impoverishmentLevel;
    input.options.policy = {
      projected: common.policy === "Projected",
      withdrawal: { mode: "customAmount", annualAmount: ce.annualWithdrawal },
    };
    // Derive distinct row streams from the shared seed and stable row ID.
    input.numerical.seed = JSON.stringify([draft.simulation.seed, row.id]);
    input.versions.simulationAlgorithm =
      common.policy === "Projected"
        ? "tensorflow-paired-euler-1"
        : "tensorflow-bridge-2";

    return {
      ...common,
      ce,
      borrowing,
      input,
      status: "queued",
      batchProgress: {
        completed: 0,
        total: Math.ceil(
          input.options.numerical.paths / input.numerical.batchSize,
        ),
      },
    };
  });

  return {
    ok: true,
    signature,
    rows: prepared,
  };
}
