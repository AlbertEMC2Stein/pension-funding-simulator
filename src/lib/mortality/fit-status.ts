/** Whether the compatible mortality fit is absent, matches current dependencies, or needs review. */
export type CeFitStatus = "not-fitted" | "current" | "needs-update";

/** Compare a completed fit's captured inputs with the currently usable inputs. */
export function ceFitStatus(
  resultKey: string | null,
  currentKey: string | null,
): CeFitStatus {
  if (resultKey === null) return "not-fitted";
  return currentKey === resultKey ? "current" : "needs-update";
}
