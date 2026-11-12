import type { SetupTableRow } from "../options/setup-file";
import type {
  ComparisonKind,
  ComparisonRunRow,
} from "../../components/comparison/comparison-run";
import { comparisonRowSignature } from "../../components/comparison/comparison-run";
import {
  calculateWithdrawalRow,
  type WithdrawalTableContext,
} from "../model/comparison/withdrawal-table";
import { makeCsv, type CsvCell } from "./csv";

/** One visible table and the captured run that produced any displayed results. */
export interface ComparisonTableExport {
  kind: ComparisonKind;
  rows: readonly SetupTableRow[];
  run: {
    signature: string;
    rows: readonly ComparisonRunRow[];
    running?: boolean;
  } | null;
  sharedStale: boolean;
  /** Current settings and fit identifiers, distinct from any previous run. */
  currentSetup: string;
  withdrawalContext: WithdrawalTableContext;
  unavailable: boolean;
}

/** Export current inputs and distinguish them from captured, possibly stale results. */
export function comparisonTableCsv(input: ComparisonTableExport): string {
  const lines: CsvCell[][] = [
    [
      "variation",
      "input_type",
      "input_value",
      "input_unit",
      "policy",
      "impoverishment_level_eur",
      "result_status",
      "current_setup_json",
      "result_input_json",
      "result_setup_json",
      "ce_source",
      "ce_withdrawal_eur_per_year",
      "ce_lifetime_risk_probability",
      "gm_risk_probability",
      "gm_mc_se",
      "gm_mc_95_lower",
      "gm_mc_95_upper",
      "relative_bandwidth_zeta",
      "borrowing_at_retirement",
      "last_possible_borrowing_years",
      "ever_borrowing_gm_probability",
      "borrowing_probability_mc_se",
      "borrowing_probability_mc_95_lower",
      "borrowing_probability_mc_95_upper",
      "expected_borrowing_years_gm",
      "borrowing_time_mc_se_years",
      "borrowing_time_mc_95_lower_years",
      "borrowing_time_mc_95_upper_years",
      "analytical_zero",
      "message",
    ],
  ];

  for (const row of input.rows) {
    const captured = input.run?.rows.find((item) => item.id === row.id);
    const stale =
      !!captured &&
      (input.sharedStale ||
        captured.rowSignature !== comparisonRowSignature(row, input.kind));
    const currentCe =
      input.kind === "withdrawal" && input.withdrawalContext.available
        ? calculateWithdrawalRow(input.withdrawalContext, row.type, row.value)
        : null;
    const ce =
      input.kind === "withdrawal" && !input.run?.running
        ? currentCe?.ok
          ? currentCe
          : undefined
        : captured?.ce;
    const borrowing = input.unavailable ? undefined : captured?.borrowing;
    const status =
      input.kind === "feasibility" && input.unavailable
        ? "not available"
        : captured
          ? stale
            ? "needs updating"
            : captured.status
          : input.unavailable
            ? "not available"
            : currentCe && !currentCe.ok
              ? "error"
              : "not calculated";
    const gm = captured?.gm;

    lines.push([
      row.name,
      row.type,
      row.value,
      row.type === "Target risk" ? "percent" : "EUR per year",
      input.kind === "feasibility" ? "Unconstrained" : row.policy,
      input.kind === "feasibility" ? row.impoverishmentLevel : "",
      status,
      input.currentSetup,
      captured?.rowSignature,
      captured ? input.run?.signature : "",
      ce
        ? input.kind === "withdrawal" && !input.run?.running
          ? "current setup"
          : "captured run"
        : "",
      ce?.annualWithdrawal,
      ce?.ceRisk,
      gm?.estimate,
      gm?.standardError,
      gm?.interval95?.lower,
      gm?.interval95?.upper,
      borrowing?.zeta,
      borrowing?.borrowingAtRetirement,
      borrowing?.lastPossibleTimeYears === null
        ? "never"
        : borrowing?.lastPossibleTimeYears,
      borrowing?.probability?.estimate,
      borrowing?.probability?.standardError,
      borrowing?.probability?.interval95?.lower,
      borrowing?.probability?.interval95?.upper,
      borrowing?.occupation?.estimateYears,
      borrowing?.occupation?.standardErrorYears,
      borrowing?.occupation?.interval95Years?.lower,
      borrowing?.occupation?.interval95Years?.upper,
      captured?.analytical,
      captured?.message ??
        (currentCe && !currentCe.ok ? currentCe.message : ""),
    ]);
  }

  return makeCsv(lines);
}
