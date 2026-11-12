import {
  initialSimulationDraft,
  type SimulationDraft,
} from "../options/simulation-options";

/** Check whether the mortality-relevant inputs still match the fresh example. */
export function isInitialMortalitySetup(draft: SimulationDraft): boolean {
  const initial = initialSimulationDraft();
  const investor = draft.investor;
  const example = initial.investor;

  return (
    JSON.stringify(draft.market) === JSON.stringify(initial.market) &&
    investor.birthYear === example.birthYear &&
    investor.retirementYear === example.retirementYear &&
    investor.mortality === example.mortality &&
    investor.maleWeight === example.maleWeight &&
    investor.longevity === example.longevity
  );
}

/** Decide whether the one-time fit should start, wait for data, or be skipped. */
export function initialMortalityFitAction(input: {
  draft: SimulationDraft;
  phase:
    | "checking-storage"
    | "loading"
    | "running"
    | "complete"
    | "skipped"
    | "error";
  cohortReady: boolean;
  marketReady: boolean;
  workerActive: boolean;
}): "start" | "skip" | "wait" {
  if (input.phase !== "loading") return "wait";
  if (!isInitialMortalitySetup(input.draft)) return "skip";

  return input.cohortReady && input.marketReady && !input.workerActive
    ? "start"
    : "wait";
}
