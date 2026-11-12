import type { SimulationDraft } from "../options/simulation-options";
import { SETUP_METADATA, type SetupTables } from "../options/setup-file";
import type { SharedMortalityFits } from "../../components/SimulationDraftContext";
import type { EvaluationRun } from "../../components/evaluation/useEvaluationRun";
import type { ComparisonRun } from "../../components/comparison/useComparisonSimulation";
import {
  comparisonRowSignature,
  comparisonSetupSignature,
  type ComparisonKind,
} from "../../components/comparison/comparison-run";

/** Current inputs and completed run records needed for a results document. */
export interface ResultsExportInput {
  name: string;
  draft: SimulationDraft;
  fits: SharedMortalityFits;
  tables: SetupTables;
  evaluation: EvaluationRun | null;
  withdrawal: ComparisonRun | null;
  feasibility: ComparisonRun | null;
  exportedAt: string;
}

/** Assemble estimates with their captured inputs; omit partial runs and raw paths. */
export function createResultsExport(input: ResultsExportInput) {
  /** Pair completed table estimates with their own captured row and shared setup. */
  function tableResults(kind: ComparisonKind, captured: ComparisonRun | null) {
    if (!captured) return null;
    const completed = captured.rows.filter(
      (row) =>
        row.status === "calculated" &&
        input.tables[kind].some((item) => item.id === row.id),
    );
    if (!completed.length) return null;

    return {
      kind,
      capturedSetup: JSON.parse(captured.signature),
      rows: completed.map((row) => ({
        name:
          input.tables[kind].find((item) => item.id === row.id)?.name ??
          `Variation ${row.id}`,
        stale:
          captured.signature !==
            comparisonSetupSignature(input.draft, input.fits, kind) ||
          !input.tables[kind].some(
            (item) =>
              item.id === row.id &&
              comparisonRowSignature(item, kind) === row.rowSignature,
          ),
        capturedRow: JSON.parse(row.rowSignature),
        workerInput: row.input ?? null,
        backend: row.backend ?? null,
        ce: row.ce ?? null,
        gm: row.gm ?? null,
        borrowing: row.borrowing ?? null,
        analytical: row.analytical ?? false,
      })),
    };
  }

  const run = input.evaluation;
  const evaluation =
    run?.phase === "complete"
      ? {
          stale:
            run.signature !==
            JSON.stringify({ draft: input.draft, mortalityFits: input.fits }),
          setupName: run.setupName ?? null,
          capturedInput: run.capturedInput ?? null,
          backend: run.backend ?? null,
          risk: run.risk ?? null,
          borrowingProbability: run.borrowingProbability ?? null,
          borrowingOccupation: run.borrowingOccupation ?? null,
        }
      : null;

  return {
    format: "pension-funding-results",
    version: 1,
    exportedAt: input.exportedAt,
    currentSetupName: input.name,
    metadata: SETUP_METADATA,
    note: "Monte Carlo intervals cover sampling uncertainty only. Raw first-hit observations and retained sample trajectories are not included.",
    evaluation,
    tables: {
      withdrawal: tableResults("withdrawal", input.withdrawal),
      feasibility: tableResults("feasibility", input.feasibility),
    },
  };
}
