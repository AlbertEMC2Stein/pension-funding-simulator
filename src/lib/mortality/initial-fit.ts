/** Inputs needed to decide whether an automatic startup fit can begin. */
export interface InitialMortalityFitInputs {
  phase:
    | "checking-storage"
    | "loading"
    | "running"
    | "complete"
    | "skipped"
    | "error";
  /** Whether the chosen birth and retirement years are supported. */
  cohortValid: boolean;
  /** Whether the currently selected cohort survival curve has loaded. */
  cohortReady: boolean;
  /** Whether market calibration supplies the parameters required by the CE fit. */
  marketReady: boolean;
  workerActive: boolean;
}

/**
 * Decide how to proceed with the one-time startup fit, after saved inputs have
 * been restored. Invalid inputs are reported instead of waiting indefinitely;
 * loading cohort data and an already active worker are temporary conditions.
 */
export function initialMortalityFitAction(
  input: InitialMortalityFitInputs,
): "start" | "invalid-cohort" | "invalid-market" | "wait" {
  if (input.phase !== "loading") return "wait";
  if (!input.cohortValid) return "invalid-cohort";
  if (!input.marketReady) return "invalid-market";

  return input.cohortReady && !input.workerActive ? "start" : "wait";
}
