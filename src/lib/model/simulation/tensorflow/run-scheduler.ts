import { prepareGompertzMakehamSurvival } from "../../../mortality/mortality-models";
import type { RiskEstimate } from "../risk-estimate";
import { prepareBorrowingOccupation } from "../borrowing-occupation";
import { assertRunSnapshot, type RunSnapshot } from "../run-configuration";
import { createRandomStream } from "../random";
import { generateTimeGrid } from "../time-grid";
import { initializeTensorBackend, type TensorBackend } from "./backend";
import { simulateTensorBatch } from "./wealth-batch";
import { prepareProjectionCurve } from "../../analytical/projection-curve";

/** Progress emitted after a complete batch has been incorporated into the run. */
export interface RunProgress {
  completedPaths: number;
  totalPaths: number;
  completedBatches: number;
  totalBatches: number;
}

/** Execution controls, separate from the validated financial inputs. */
export interface RunSchedulerOptions {
  /** Backends to try in order; defaults to WebGPU, WebGL, then CPU. */
  backendOrder?: readonly TensorBackend[];
  /** Called once after the TensorFlow backend has initialized. */
  onBackendReady?: (backend: TensorBackend) => void;
  /** Called after each completed batch; callback errors stop the run. */
  onProgress?: (progress: RunProgress) => void;
  /** Cancellation is observed between batches, not during a batch. */
  signal?: AbortSignal;
}

/** Approximate bridge observations; these are not mortality-weighted risk estimates. */
export interface RunSchedulerResult {
  backend: TensorBackend;
  completedPaths: number;
  completedBatches: number;
  /** Years after retirement, including time zero. */
  times: readonly number[];
  /** First hits in each interval, assigned to its ending grid index. */
  firstHitCounts: readonly number[];
  observedHits: number;
  /** Approximate first-hit times in years; -1 denotes no hit by the horizon. */
  firstHitTimes: Float32Array;
  /** GM-survival-weighted probability of first borrowing before stopping. */
  borrowingProbability: RiskEstimate;
  /** GM-survival-weighted time borrowing before impoverishment or the horizon. */
  borrowingOccupation: {
    estimateYears: number;
    standardErrorYears: number | null;
    interval95Years: { lower: number; upper: number } | null;
  };
  /** Matching projected-policy observations for a paired run. */
  projected?: {
    firstHitTimes: Float32Array;
    firstHitCounts: readonly number[];
    observedHits: number;
  };
}

/** Throw a recognizable cancellation error before starting another batch. */
function checkCancellation(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new DOMException("Simulation cancelled.", "AbortError");
}

/** Yield between batches so a worker can receive cancellation and other messages. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Run all paths in a validated snapshot in consecutive TensorFlow batches.
 * One caller-owned stream is seeded once and consumed across batches; the last
 * batch contains only the remaining paths. Progress is reported after completed
 * batches. Cancellation and errors reject the run rather than return partial
 * results. It retains impoverishment first-hit times, but not full trajectories.
 * Borrowing statistics are GM-survival-weighted and aggregated across batches.
 *
 * Repeating the same snapshot with the same backend and batch sequence uses
 * the same random draws. Changing batch size can change their path assignment;
 * identical floating-point results across backends are not guaranteed.
 */
export async function runScheduler(
  snapshot: RunSnapshot,
  options: RunSchedulerOptions = {},
): Promise<RunSchedulerResult> {
  assertRunSnapshot(snapshot);
  checkCancellation(options.signal);

  if (snapshot.numerical.recordTrajectories)
    throw new RangeError(
      "Trajectory recording is not supported by the TensorFlow scheduler yet.",
    );

  const backend = await initializeTensorBackend(options.backendOrder);
  checkCancellation(options.signal);
  options.onBackendReady?.(backend);

  const totalPaths = snapshot.options.numerical.paths;
  const batchSize = snapshot.numerical.batchSize;
  const totalBatches = Math.ceil(totalPaths / batchSize);
  const times = generateTimeGrid(
    snapshot.numerical.horizonYears,
    snapshot.options.numerical.timeStep,
  );
  const preparedOccupation = prepareBorrowingOccupation({
    market: snapshot.market,
    mortality: snapshot.mortality.ce.parameters,
    gm: snapshot.mortality.gm.parameters,
    annualWithdrawal: snapshot.resolvedAnnualWithdrawal,
    impoverishmentLevel: snapshot.options.investor.impoverishmentLevel,
    times,
  });
  // If the initial borrowing boundary is at or below impoverishment, its
  // decreasing trajectory cannot enter the solvent region at later times.
  const occupationSteps =
    preparedOccupation &&
    preparedOccupation[0].boundaryStart >
      snapshot.options.investor.impoverishmentLevel
      ? preparedOccupation
      : undefined;
  const gmSurvival = prepareGompertzMakehamSurvival(
    snapshot.mortality.gm.parameters,
  );
  const firstHitCounts = Array<number>(times.length).fill(0);
  const firstHitTimes = new Float32Array(totalPaths);
  const stream = createRandomStream(snapshot.numerical.seed);
  const projectionCurve = snapshot.options.policy.projected
    ? prepareProjectionCurve({
        covariance: snapshot.market.covariance,
        mertonDirection: snapshot.market.mertonDirection,
        realRiskFreeRate: snapshot.market.realRiskFreeRate,
        annualWithdrawal: snapshot.resolvedAnnualWithdrawal,
        impoverishmentLevel: snapshot.options.investor.impoverishmentLevel,
        mortalityEndpoint: snapshot.mortality.ce.parameters.tau,
        delta: snapshot.mortality.ce.parameters.p,
      })
    : undefined;
  const projected = projectionCurve
    ? {
        firstHitTimes: new Float32Array(totalPaths),
        firstHitCounts: Array<number>(times.length).fill(0),
        observedHits: 0,
      }
    : undefined;
  let completedPaths = 0;
  let completedBatches = 0;
  let observedHits = 0;
  let occupationCount = 0;
  let occupationMean = 0;
  let occupationSquaredDeviations = 0;
  let borrowingMean = 0;
  let borrowingSquaredDeviations = 0;

  while (completedPaths < totalPaths) {
    checkCancellation(options.signal);
    const pathCount = Math.min(batchSize, totalPaths - completedPaths);
    const batch = await simulateTensorBatch(
      snapshot,
      pathCount,
      stream,
      projectionCurve,
      occupationSteps ?? undefined,
    );
    checkCancellation(options.signal);

    firstHitTimes.set(batch.firstHitTime, completedPaths);

    // Welford moments combine path payoffs without retaining occupation arrays.
    for (let index = 0; index < pathCount; index += 1) {
      const value = batch.borrowingOccupation?.[index] ?? 0;
      if (!Number.isFinite(value))
        throw new RangeError(
          "Borrowing occupation produced a non-finite result.",
        );
      occupationCount += 1;
      const difference = value - occupationMean;
      occupationMean += difference / occupationCount;
      occupationSquaredDeviations += difference * (value - occupationMean);

      const firstBorrowing = batch.firstBorrowingTime?.[index] ?? -1;
      if (!Number.isFinite(firstBorrowing))
        throw new RangeError("First borrowing produced a non-finite time.");
      const payoff = firstBorrowing < 0 ? 0 : gmSurvival(firstBorrowing);
      const borrowingDifference = payoff - borrowingMean;
      borrowingMean += borrowingDifference / occupationCount;
      borrowingSquaredDeviations +=
        borrowingDifference * (payoff - borrowingMean);
    }

    if (projected && !batch.projected)
      throw new Error("The projected batch result is missing.");

    if (projected && batch.projected) {
      projected.firstHitTimes.set(batch.projected.firstHitTime, completedPaths);

      for (const hitIndex of batch.projected.firstHitStep) {
        if (hitIndex >= 0) {
          projected.firstHitCounts[hitIndex] += 1;
          projected.observedHits += 1;
        }
      }
    }

    for (const hitIndex of batch.firstHitStep) {
      if (hitIndex >= 0) {
        firstHitCounts[hitIndex] += 1;
        observedHits += 1;
      }
    }

    completedPaths += pathCount;
    completedBatches += 1;
    options.onProgress?.({
      completedPaths,
      totalPaths,
      completedBatches,
      totalBatches,
    });

    // TensorFlow's CPU operations can finish synchronously; yielding lets the
    // worker process a cancellation message before it starts the next batch.
    if (completedPaths < totalPaths) await yieldToEventLoop();
  }

  // Honor cancellation requested by the final progress callback as well.
  checkCancellation(options.signal);
  const standardError =
    occupationCount > 1
      ? Math.sqrt(
          Math.max(0, occupationSquaredDeviations / (occupationCount - 1)) /
            occupationCount,
        )
      : null;
  const halfWidth =
    standardError === null ? 0 : 1.959963984540054 * standardError;

  const borrowingSE =
    occupationCount > 1
      ? Math.sqrt(
          Math.max(0, borrowingSquaredDeviations / (occupationCount - 1)) /
            occupationCount,
        )
      : null;
  const borrowingHalfWidth =
    borrowingSE === null ? 0 : 1.959963984540054 * borrowingSE;

  return {
    borrowingProbability: {
      estimate: borrowingMean,
      standardError: borrowingSE,
      interval95: borrowingSE
        ? {
            lower: Math.max(0, borrowingMean - borrowingHalfWidth),
            upper: Math.min(1, borrowingMean + borrowingHalfWidth),
          }
        : null,
    },
    borrowingOccupation: {
      estimateYears: occupationMean,
      standardErrorYears: standardError,
      interval95Years: standardError
        ? {
            lower: Math.max(0, occupationMean - halfWidth),
            upper: Math.min(
              snapshot.numerical.horizonYears,
              occupationMean + halfWidth,
            ),
          }
        : null,
    },
    backend,
    completedPaths,
    completedBatches,
    times,
    firstHitCounts,
    observedHits,
    firstHitTimes,
    projected,
  };
}
