import type { SimulationDraft } from "../../lib/options/simulation-options";
import type { BatchSizeChoice } from "../../lib/options/batch-size";

/** Worker-check settings chosen independently from Evaluation and tables. */
export interface DevelopmentNumerics {
  paths: number;
  timeStep: SimulationDraft["simulation"]["timeStep"];
  batchSize: BatchSizeChoice;
  seed: string;
}

/**
 * Combine the shared market, investor and policy with the check's own numerical
 * settings. The input draft remains unchanged and can be used by Evaluation.
 */
export function makeDevelopmentDraft(
  draft: SimulationDraft,
  numerical: DevelopmentNumerics,
): SimulationDraft {
  return {
    ...draft,
    simulation: { ...draft.simulation, ...numerical },
  };
}
