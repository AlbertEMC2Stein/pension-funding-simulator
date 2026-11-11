import {
  advancePreparedWealth,
  type WealthState,
  type WealthStepInput,
} from "./wealth-step";
import { assertRunSnapshot, type RunSnapshot } from "./run-configuration";
import { correlatePreparedIncrement } from "./matrix";
import { createRandomStream } from "./random";
import { prepareWealthGrid, type PreparedWealthStep } from "./prepared-grid";
import { safeBoundary } from "../analytical/safe-boundary";
import type { CompatiblePolicyInputs } from "../analytical/compatible-policy";

/** Inputs for one path; termination and first-passage choices remain open. */
export interface WealthPathInput {
  /** Market, mortality and investor state; increment and endTime vary by step. */
  initialStep: Omit<WealthStepInput, "endTime" | "marketIncrement">;
  /** Increasing times in years, beginning at the investor's current time. */
  times: readonly number[];
  /** Optional to avoid storing every value for large runs. */
  recordTrajectory: boolean;
}

/** Final grid observation and stop status for one reference path, with an optional trajectory. */
export interface WealthPathResult {
  finalState: WealthState;
  /** Only grid observations are checked; this is not a continuous hit test. */
  status: "completed" | "impoverished-on-grid";
  /** Present only when requested; include the initial state and document any early stop. */
  trajectory?: WealthState[];
}

/**
 * Run one path over an explicitly validated time grid. Request one
 * asset-ordered increment per step from `nextIncrement`, call the verified
 * wealth-step function, and optionally retain states.
 * @param _input The market, mortality, investor state, withdrawal and time grid.
 * @param _nextIncrement A function that returns a verified asset-ordered increment for each step.
 * @returns The final state and, if requested, the trajectory of states.
 * @throws RangeError if any step fails due to impoverishment or invalid time step.
 */
export function simulateWealthPath(
  _input: WealthPathInput,
  _nextIncrement: (timeStepYears: number) => readonly number[],
): WealthPathResult {
  const currentState = _input.initialStep.investor.current;

  if (
    _input.times.length < 1 ||
    _input.times[0] !== currentState.time ||
    _input.times.some(
      (t, i) => !Number.isFinite(t) || (i > 0 && t <= _input.times[i - 1]),
    )
  ) {
    throw new RangeError(
      "The time grid must start at the initial time and increase strictly.",
    );
  }
  if (currentState.wealth <= _input.initialStep.investor.impoverishmentLevel) {
    throw new RangeError(
      "Initial wealth must exceed the impoverishment level.",
    );
  }

  // This standalone reference entry accepts arbitrary inputs, unlike a batch
  // prepared from a validated snapshot. Check its domain once before looping.
  const { market, mortality, investor, annualWithdrawal } = _input.initialStep;
  const model = {
    market,
    mortality,
    impoverishmentLevel: investor.impoverishmentLevel,
  };
  const boundaryInput = {
    realRiskFreeRate: model.market.realRiskFreeRate,
    annualWithdrawal,
    impoverishmentLevel: model.impoverishmentLevel,
    mortalityEndpoint: model.mortality.tau,
  };
  safeBoundary({ ...boundaryInput, time: _input.times[0] });
  safeBoundary({ ...boundaryInput, time: _input.times.at(-1)! });
  const steps = prepareWealthGrid(
    model,
    _input.initialStep.annualWithdrawal,
    _input.times,
  );

  return simulatePreparedPath(_input, _nextIncrement, steps, model);
}

/** Simulate one path using the grid and coefficients already prepared for its batch. */
function simulatePreparedPath(
  input: WealthPathInput,
  nextIncrement: (timeStepYears: number) => readonly number[],
  steps: readonly PreparedWealthStep[],
  model: CompatiblePolicyInputs,
): WealthPathResult {
  const trajectory: WealthState[] = input.recordTrajectory
    ? [{ ...input.initialStep.investor.current }]
    : [];
  let currentState = input.initialStep.investor.current;
  let status: WealthPathResult["status"] = "completed";

  for (let i = 1; i < input.times.length; i++) {
    const step = steps[i - 1];
    currentState = advancePreparedWealth(
      model,
      input.initialStep.annualWithdrawal,
      currentState,
      input.times[i],
      nextIncrement(step.timeStepYears),
      step,
    );

    if (input.recordTrajectory) {
      trajectory.push({ ...currentState });
    }
    if (currentState.wealth <= input.initialStep.investor.impoverishmentLevel) {
      status = "impoverished-on-grid";
      break;
    }
  }

  return {
    finalState: currentState,
    status,
    trajectory: input.recordTrajectory ? trajectory : undefined,
  };
}

/** Provisional output of a batch, before first-passage and mortality aggregation. */
export interface WealthBatchResult {
  paths: WealthPathResult[];
}

/**
 * Prepare validated market increments and simulate the snapshot's
 * requested number of independent paths.
 *
 * Specify deterministic stream ordering
 * and whether paths use independent substreams before coding. For large batches,
 * decide how to process paths without retaining all states; this provisional
 * result shape may need to change. Leave Monte Carlo estimates, worker progress,
 * cancellation and paired-policy comparisons to later milestones.
 */
export function simulateWealthBatch(_snapshot: RunSnapshot): WealthBatchResult {
  assertRunSnapshot(_snapshot);
  const numPaths = _snapshot.numerical.batchSize;
  const paths: WealthPathResult[] = [];

  const rng = createRandomStream(_snapshot.numerical.seed);
  const sigma = _snapshot.market.covarianceFactor;

  const annualWithdrawal = _snapshot.resolvedAnnualWithdrawal;

  /** Draw one vector of independent normals and apply the covariance factor and square-root time scaling. */
  const incrementGenerator = (timeStepYears: number) => {
    const standardNormals = Array.from({ length: sigma.length }, () =>
      rng.nextStandardNormal(),
    );

    return correlatePreparedIncrement(sigma, standardNormals, timeStepYears);
  };

  const model = {
    market: _snapshot.market,
    mortality: _snapshot.mortality.ce.parameters,
    impoverishmentLevel: _snapshot.options.investor.impoverishmentLevel,
  };
  const times = generateTimeGrid(
    _snapshot.numerical.horizonYears,
    _snapshot.options.numerical.timeStep,
  );
  const steps = prepareWealthGrid(model, annualWithdrawal, times);

  for (let i = 0; i < numPaths; i++) {
    const pathInput: WealthPathInput = {
      initialStep: {
        market: model.market,
        mortality: model.mortality,
        investor: {
          impoverishmentLevel: model.impoverishmentLevel,
          current: {
            time: 0,
            wealth: _snapshot.options.investor.initialCapital,
          },
        },
        annualWithdrawal: annualWithdrawal,
      },
      times,
      recordTrajectory: _snapshot.numerical.recordTrajectories,
    };

    const pathResult = simulatePreparedPath(
      pathInput,
      incrementGenerator,
      steps,
      model,
    );
    paths.push(pathResult);
  }

  return { paths };
}

/**
 * Generate a time grid for the simulation.
 * @param horizonYears The number of years to simulate.
 * @param timeStep The frequency of the time steps.
 * @returns An array of time points.
 */
export function generateTimeGrid(
  horizonYears: number,
  timeStep: "monthly" | "fortnightly" | "weekly",
): readonly number[] {
  if (!Number.isFinite(horizonYears) || horizonYears <= 0)
    throw new RangeError("The simulation horizon must be finite and positive.");

  const stepsPerYear =
    timeStep === "monthly"
      ? 12
      : timeStep === "fortnightly"
        ? 26
        : timeStep === "weekly"
          ? 52
          : 0;

  if (
    !stepsPerYear ||
    !Number.isSafeInteger(Math.ceil(horizonYears * stepsPerYear))
  )
    throw new RangeError("Invalid time step or simulation horizon.");

  const timePoints: number[] = [0];

  // Compute each time from its index to avoid accumulated rounding error.
  for (let index = 1; index / stepsPerYear < horizonYears; index += 1)
    timePoints.push(index / stepsPerYear);
  timePoints.push(horizonYears);

  return timePoints;
}
