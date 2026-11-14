/** Input identities and readiness used to decide whether the current fits need work. */
export interface AutomaticFitState {
  storageRestored: boolean;
  cohortValid: boolean;
  cohortReady: boolean;
  gmKey: string;
  ceKey: string | null;
  fittedGmKey: string | null;
  fittedCeKey: string | null;
  retry: boolean;
}

/** Fit only after restoration and cohort loading, unless the current fits already match. */
export function mortalityFitNeedsUpdate(state: AutomaticFitState): boolean {
  if (!state.storageRestored || !state.cohortValid || !state.cohortReady)
    return false;

  return (
    state.retry ||
    state.fittedGmKey !== state.gmKey ||
    (state.ceKey !== null && state.fittedCeKey !== state.ceKey)
  );
}

/** Delay a mortality fit until editing settles; cancel both the delay and any started work on replacement. */
export function scheduleMortalityFit(
  start: () => () => void,
  delayMs = 350,
): () => void {
  let stop: (() => void) | undefined;
  const timer = setTimeout(() => {
    stop = start();
  }, delayMs);

  return () => {
    clearTimeout(timer);
    stop?.();
  };
}
