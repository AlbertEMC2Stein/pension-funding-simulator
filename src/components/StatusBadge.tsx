/** Shared calculation states shown in the evaluation and developer panels. */
export type ResultStatus =
  | "not-calculated"
  | "not-available"
  | "queued"
  | "running"
  | "needs-updating"
  | "error"
  | "cancelled"
  | "calculated";

/** Default labels, symbols and plain-language descriptions for the status guide. */
export const RESULT_STATUSES: ReadonlyArray<{
  status: ResultStatus;
  label: string;
  symbol: string;
  description: string;
}> = [
  {
    status: "not-calculated",
    label: "NOT CALCULATED",
    symbol: "○",
    description: "No result has been calculated yet.",
  },
  {
    status: "not-available",
    label: "NOT AVAILABLE",
    symbol: "−",
    description:
      "The result cannot be calculated or does not apply to these settings.",
  },
  {
    status: "queued",
    label: "QUEUED",
    symbol: "◷",
    description: "Waiting for a simulation worker.",
  },
  {
    status: "running",
    label: "RUNNING",
    symbol: "◌",
    description: "A calculation is in progress or stopping.",
  },
  {
    status: "needs-updating",
    label: "NEEDS UPDATING",
    symbol: "↻",
    description: "Inputs changed after this result was captured.",
  },
  {
    status: "error",
    label: "ERROR",
    symbol: "!",
    description: "The calculation failed; its message explains what happened.",
  },
  {
    status: "cancelled",
    label: "CANCELLED",
    symbol: "×",
    description: "The calculation was stopped before completion.",
  },
  {
    status: "calculated",
    label: "CALCULATED",
    symbol: "✓",
    description: "A result is available for the captured settings.",
  },
];

/** Render a consistent, text-labelled status; aliases support developer-specific labels. */
export function StatusBadge({
  status,
  label,
}: {
  status: ResultStatus;
  label?: string;
}) {
  const definition = RESULT_STATUSES.find((item) => item.status === status)!;

  return (
    <span className="chip status-badge" data-status={status}>
      <span aria-hidden="true">{definition.symbol}</span>{" "}
      {label ?? definition.label}
    </span>
  );
}
