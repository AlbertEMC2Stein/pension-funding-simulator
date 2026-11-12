import type { ResultStatus } from "../../components/StatusBadge";

/** German labels for the shared simulation result states. */
export const germanStatusLabels: Record<ResultStatus, string> = {
  "not-calculated": "NICHT BERECHNET",
  "not-available": "NICHT VERFÜGBAR",
  queued: "IN DER WARTESCHLANGE",
  running: "LÄUFT",
  "needs-updating": "AKTUALISIEREN",
  error: "FEHLER",
  cancelled: "ABGEBROCHEN",
  calculated: "BERECHNET",
};
