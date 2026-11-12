import {
  prepareCompactifiedExponentialSurvival,
  prepareGompertzMakehamSurvival,
  type CompactifiedExponentialParameters,
  type GompertzMakehamParameters,
} from "../../mortality/mortality-models";

/** Mean and Monte Carlo uncertainty of path payoffs or paired payoff differences. */
export interface RiskEstimate {
  estimate: number;
  /** Sample-based Monte Carlo standard error, unavailable with fewer than two paths. */
  standardError: number | null;
  /** Approximate 95% normal interval, clipped to the estimand range; null if uninformative. */
  interval95: { lower: number; upper: number } | null;
}

/** CE and GM estimates over the observed horizon, with a full-horizon CE benchmark. */
export interface MortalityRiskResults {
  ce: RiskEstimate;
  gm: RiskEstimate;
  ceBenchmark: number;
  horizonYears: number;
  ceEndpoint: number;
  /** Paired projected-policy results, when both policies were simulated. */
  projected?: {
    ce: RiskEstimate;
    gm: RiskEstimate;
    /** Projected minus unconstrained risk, with uncertainty from paired payoffs. */
    ceDifference: RiskEstimate;
    gmDifference: RiskEstimate;
  };
}

/** Incremental moments for the pathwise Monte Carlo payoffs. */
interface Moments {
  count: number;
  mean: number;
  sumSquaredDeviations: number;
}

/** Incorporate one payoff using Welford's numerically stable update. */
function addPayoff(moments: Moments, payoff: number): void {
  moments.count += 1;
  const delta = payoff - moments.mean;
  moments.mean += delta / moments.count;
  moments.sumSquaredDeviations += delta * (payoff - moments.mean);
}

/**
 * Convert pathwise sample moments into a normal Monte Carlo interval. With no
 * observed variation, the sample cannot support an informative normal
 * interval; in particular, zero hits must not be presented as zero uncertainty.
 * Probability estimates use [0, 1]; paired differences use [-1, 1].
 */
function summarizeMoments(
  moments: Moments,
  lowerBound = 0,
  upperBound = 1,
): RiskEstimate {
  if (moments.count < 2)
    return { estimate: moments.mean, standardError: null, interval95: null };

  const sampleVariance = Math.max(
    0,
    moments.sumSquaredDeviations / (moments.count - 1),
  );
  const standardError = Math.sqrt(sampleVariance / moments.count);
  if (standardError === 0)
    return { estimate: moments.mean, standardError, interval95: null };

  const halfWidth = 1.959963984540054 * standardError;

  return {
    estimate: moments.mean,
    standardError,
    interval95: {
      lower: Math.max(lowerBound, moments.mean - halfWidth),
      upper: Math.min(upperBound, moments.mean + halfWidth),
    },
  };
}

/**
 * Estimate P(financial hit ≤ horizon and hit before death) under independent
 * CE and GM mortality. Each hit contributes its mortality survival probability
 * at the approximate first-hit time; a no-hit path (−1) contributes zero.
 * Matching projected hit times yield paired payoff differences and their own
 * standard errors. Paths are independent samples, not antithetic pair averages.
 * Inputs come from a validated run and its trusted simulation output.
 *
 * The intervals quantify Monte Carlo sampling only. They do not cover finite
 * horizon truncation, approximate bridge crossing or time-step effects.
 */
export function estimateMortalityRisk(input: {
  firstHitTimes: ArrayLike<number>;
  projectedFirstHitTimes?: ArrayLike<number>;
  gm: GompertzMakehamParameters;
  ce: CompactifiedExponentialParameters;
  horizonYears: number;
  ceBenchmark: number;
}): MortalityRiskResults {
  const gmSurvival = prepareGompertzMakehamSurvival(input.gm);
  const ceSurvival = prepareCompactifiedExponentialSurvival(input.ce);
  const gm: Moments = { count: 0, mean: 0, sumSquaredDeviations: 0 };
  const ce: Moments = { count: 0, mean: 0, sumSquaredDeviations: 0 };

  const projectedGm: Moments = { count: 0, mean: 0, sumSquaredDeviations: 0 };
  const projectedCe: Moments = { count: 0, mean: 0, sumSquaredDeviations: 0 };
  const gmDifference: Moments = { count: 0, mean: 0, sumSquaredDeviations: 0 };
  const ceDifference: Moments = { count: 0, mean: 0, sumSquaredDeviations: 0 };

  if (
    input.projectedFirstHitTimes &&
    input.projectedFirstHitTimes.length !== input.firstHitTimes.length
  )
    throw new RangeError(
      "Paired policy results must have matching path counts.",
    );

  for (let index = 0; index < input.firstHitTimes.length; index += 1) {
    const time = input.firstHitTimes[index];
    const gmPayoff = time < 0 ? 0 : gmSurvival(time);
    const cePayoff = time < 0 ? 0 : ceSurvival(time);
    addPayoff(gm, gmPayoff);
    addPayoff(ce, cePayoff);

    if (input.projectedFirstHitTimes) {
      const projectedTime = input.projectedFirstHitTimes[index];
      const projectedGmPayoff =
        projectedTime < 0 ? 0 : gmSurvival(projectedTime);
      const projectedCePayoff =
        projectedTime < 0 ? 0 : ceSurvival(projectedTime);
      addPayoff(projectedGm, projectedGmPayoff);
      addPayoff(projectedCe, projectedCePayoff);
      addPayoff(gmDifference, projectedGmPayoff - gmPayoff);
      addPayoff(ceDifference, projectedCePayoff - cePayoff);
    }
  }

  return {
    ce: summarizeMoments(ce),
    gm: summarizeMoments(gm),
    ceBenchmark: input.ceBenchmark,
    horizonYears: input.horizonYears,
    ceEndpoint: input.ce.tau,
    projected: input.projectedFirstHitTimes
      ? {
          gm: summarizeMoments(projectedGm),
          ce: summarizeMoments(projectedCe),
          gmDifference: summarizeMoments(gmDifference, -1, 1),
          ceDifference: summarizeMoments(ceDifference, -1, 1),
        }
      : undefined,
  };
}
