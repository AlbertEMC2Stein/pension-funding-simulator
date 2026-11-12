import { calibrateMarket } from "../../lib/market/calibrate-market";
import { mortalityFitKeys } from "../../lib/mortality/fit-status";
import { resolveBatchSize } from "../../lib/options/batch-size";
import {
  buildSimulationOptions,
  type SimulationDraft,
} from "../../lib/options/simulation-options";
import type { RunConfigurationInput } from "../../lib/model/simulation/run-configuration";
import type { SharedMortalityFits } from "../SimulationDraftContext";

/** Either captured inputs for the worker or user-facing preparation errors. */
export type EvaluationRunInput =
  { ok: true; input: RunConfigurationInput } | { ok: false; errors: string[] };

/**
 * Capture the current evaluation settings and matching converged mortality fits.
 * The worker creates and validates the actual snapshot. The provisional run
 * covers the full CE policy horizon and uses a documented fixed seed.
 */
export function prepareEvaluationRun(
  draft: SimulationDraft,
  fits: SharedMortalityFits,
  recordTrajectories = false,
): EvaluationRunInput {
  const options = buildSimulationOptions(draft);
  if (!options.ok) return options;
  const calibrated = calibrateMarket(options.options.market);
  if (!calibrated.ok) return { ok: false, errors: [calibrated.error] };
  if (!calibrated.market.paperAssumptions.positiveRho)
    return {
      ok: false,
      errors: ["The CE policy requires a positive market risk premium (rho)."],
    };

  const keys = mortalityFitKeys({
    ...draft.investor,
    market: calibrated.market,
  });
  if (!keys.ce || fits.gm?.key !== keys.gm || fits.ce?.key !== keys.ce)
    return {
      ok: false,
      errors: [
        "Fit both mortality models for the current investor and market settings before running.",
      ],
    };
  if (!fits.gm.fit.converged || !fits.ce.fit.converged)
    return {
      ok: false,
      errors: [
        "Both current mortality fits must have converged before running.",
      ],
    };

  return {
    ok: true,
    input: {
      options: options.options,
      market: calibrated.market,
      mortality: { gm: fits.gm.fit, ce: fits.ce.fit },
      numerical: {
        seed: "evaluation-1",
        horizonYears: fits.ce.fit.parameters.tau,
        batchSize: resolveBatchSize(
          options.options.numerical.batchSize,
          options.options.numerical.paths,
        ),
        recordTrajectories,
      },
      versions: {
        schema: "prototype-1",
        model: "compatible-ce-1",
        randomGenerator: "cyrb128-sfc32-box-muller-1",
        simulationAlgorithm: options.options.policy.projected
          ? "tensorflow-paired-euler-1"
          : "tensorflow-bridge-2",
      },
      provenance: {
        mortalityData: `Current cohort fit: ${keys.gm}`,
        marketData:
          "Current market inputs; historical source is not retained in this prototype.",
      },
    },
  };
}
