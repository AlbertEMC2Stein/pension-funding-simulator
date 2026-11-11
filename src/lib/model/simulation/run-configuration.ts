import type { CalibratedMarket } from "../../market/calibrate-market";
import type { CeFit, GmFit } from "../../mortality/mortality-fitting";
import type { SimulationOptions } from "../../options/simulation-options";
import { calibrateMarket } from "../../market/calibrate-market";
import { gompertzMakehamSurvival } from "../../mortality/mortality-models";
import {
  compatibleRisk,
  compatibleWithdrawal,
} from "../analytical/compatible-policy";

/** Provisional metadata: choose and document version conventions before use. */
export interface RunVersions {
  /** Versions of the snapshot representation, mathematical model and numerical methods. */
  schema: string;
  model: string;
  randomGenerator: string;
  simulationAlgorithm: string;
}

/** Where the selected data and calibrations came from, for later reproduction. */
export interface RunProvenance {
  /** For example, packaged cohort table identity and data version. */
  mortalityData: string;
  /** For example, manual inputs or an import identifier; do not embed a CSV by default. */
  marketData: string;
}

/** Explicit numerical choices that are not yet present in SimulationOptions. */
export interface RunNumerics {
  /** Stable seed encoding; agree on its meaning together with the generator. */
  seed: string;
  /** Simulation horizon in years after retirement; its choice needs justification. */
  horizonYears: number;
  /** Number of independent paths to simulate. */
  batchSize: number;
  /** Keep trajectories only when requested, since storage grows with paths and steps. */
  recordTrajectories: boolean;
}

/** Candidate input to the snapshot builder; this is not yet validated. */
export interface RunConfigurationInput {
  /** Current validated inputs and the corresponding market calibration. */
  options: SimulationOptions;
  market: CalibratedMarket;
  /** Supplied fit results; the builder cannot independently establish their provenance. */
  mortality: { gm: GmFit; ce: CeFit };
  numerical: RunNumerics;
  versions: RunVersions;
  provenance: RunProvenance;
}

/**
 * Intended independent record of all inputs actually used by one run.
 * This provisional shape may change when seed, provenance and versioning are
 * specified; it is not yet an export format or a guarantee of reproducibility.
 */
export interface RunSnapshot extends RunConfigurationInput {}

/**
 * Validate and copy a run's inputs before simulation. The caller must provide
 * fit provenance: these parameter checks cannot establish which cohort was
 * actually used by a previously computed fit.
 */
export function createRunSnapshot(input: RunConfigurationInput): RunSnapshot {
  const { options, market, mortality, numerical, versions, provenance } = input;
  const r =
    Math.log1p(options.market.nominalRiskFreeRate) -
    Math.log1p(options.market.inflationRate);
  if (
    !Number.isFinite(r) ||
    Math.abs(r - options.market.realRiskFreeRate) > 1e-12
  )
    throw new RangeError(
      "Risk-free rate and inflation do not match the real rate.",
    );

  // Recalculate the market to detect a snapshot assembled from mismatched inputs.
  const calibrated = calibrateMarket(options.market);
  if (!calibrated.ok) throw new RangeError(calibrated.error);
  /** Compare two numerical vectors element by element in their existing asset order. */
  const sameVector = (left: readonly number[], right: readonly number[]) =>
    left.length === right.length &&
    left.every((value, i) => value === right[i]);
  const expected = calibrated.market;
  if (
    market.realRiskFreeRate !== expected.realRiskFreeRate ||
    market.inflationRate !== expected.inflationRate ||
    market.rho !== expected.rho ||
    market.assetNames.length !== expected.assetNames.length ||
    market.assetNames.some((name, i) => name !== expected.assetNames[i]) ||
    !sameVector(market.realLogGrowth, expected.realLogGrowth) ||
    !sameVector(market.realDrift, expected.realDrift) ||
    !sameVector(market.excessReturn, expected.excessReturn) ||
    !sameVector(market.mertonDirection, expected.mertonDirection) ||
    market.covariance.length !== expected.covariance.length ||
    market.covariance.some(
      (row, i) => !sameVector(row, expected.covariance[i]),
    ) ||
    market.paperAssumptions.positiveRho !==
      expected.paperAssumptions.positiveRho ||
    market.paperAssumptions.nonnegativeMerton !==
      expected.paperAssumptions.nonnegativeMerton
  )
    throw new RangeError(
      "The calibrated market does not match the current market inputs.",
    );
  if (!mortality.gm.converged || !mortality.ce.converged)
    throw new RangeError("Both mortality fits must have converged.");
  gompertzMakehamSurvival(0, mortality.gm.parameters);

  // Check that the selected policy can be constructed from the supplied fit.
  const { initialCapital, impoverishmentLevel } = options.investor;
  if (
    !Number.isFinite(initialCapital) ||
    !Number.isFinite(impoverishmentLevel) ||
    impoverishmentLevel < 1 ||
    initialCapital <= impoverishmentLevel
  )
    throw new RangeError(
      "Initial capital must exceed the impoverishment level of at least €1.",
    );
  if (options.policy.projected)
    throw new RangeError("Projected policies are not implemented yet.");
  const model = {
    market,
    mortality: mortality.ce.parameters,
    impoverishmentLevel,
  };
  if (options.policy.withdrawal.mode === "targetRisk")
    compatibleWithdrawal(
      model,
      initialCapital,
      options.policy.withdrawal.targetRisk,
    );
  else
    compatibleRisk(
      model,
      initialCapital,
      options.policy.withdrawal.annualAmount,
    );
  if (
    !Number.isSafeInteger(options.numerical.paths) ||
    options.numerical.paths <= 0 ||
    !["weekly", "fortnightly", "monthly"].includes(options.numerical.timeStep)
  )
    throw new RangeError("Invalid path count or time step.");
  if (
    !Number.isSafeInteger(numerical.batchSize) ||
    numerical.batchSize <= 0 ||
    numerical.batchSize > options.numerical.paths ||
    !Number.isFinite(numerical.horizonYears) ||
    numerical.horizonYears <= 0 ||
    numerical.horizonYears > mortality.ce.parameters.tau ||
    typeof numerical.recordTrajectories !== "boolean"
  )
    throw new RangeError("Invalid batch size, horizon or trajectory setting.");
  if (
    ![
      numerical.seed,
      versions.schema,
      versions.model,
      versions.randomGenerator,
      versions.simulationAlgorithm,
      provenance.marketData,
      provenance.mortalityData,
    ].every((value) => typeof value === "string" && value.trim().length > 0)
  )
    throw new RangeError(
      "Seed, versions and data provenance must be specified.",
    );
  return structuredClone(input);
}
