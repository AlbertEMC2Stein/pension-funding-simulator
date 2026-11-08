import {
  compactifiedExponentialSurvival,
  gompertzMakehamSurvival,
  type CompactifiedExponentialParameters,
  type GompertzMakehamParameters,
} from "./mortality-models";
import { nelderMead } from "./nelder-mead";
import { survivalKlDivergence } from "./survival-fit-loss";

export interface MortalityFit<P> {
  parameters: P;
  fittedSurvival: number[];
  klDivergence: number;
  maxSurvivalDifference: number;
  converged: boolean;
  starts: number;
  convergedStarts: number;
}
export type GmFit = MortalityFit<GompertzMakehamParameters>;
export type CeFit = MortalityFit<
  CompactifiedExponentialParameters & { deltaMin: number }
>;

/** Clamp log coordinates as in the reference implementation. */
const positive = (value: number) =>
  Math.exp(Math.max(-50, Math.min(50, value)));

function runStarts<P>(
  times: number[],
  target: number[],
  starts: number[][],
  decode: (point: number[]) => P,
  survival: (time: number, params: P) => number,
  onProgress?: (completed: number, total: number) => void,
): MortalityFit<P> {
  // Validate target/grid before calling the optimizer.
  survivalKlDivergence(times, target, target);
  const objective = (point: number[]) => {
    try {
      const params = decode(point);
      return survivalKlDivergence(
        times,
        target,
        times.map((time) => survival(time, params)),
      );
    } catch {
      return Infinity;
    }
  };
  let best: ReturnType<typeof nelderMead> | null = null;
  let convergedStarts = 0;
  starts.forEach((start, index) => {
    const run = nelderMead(objective, start);
    if (run.converged) convergedStarts += 1;
    if (Number.isFinite(run.loss) && (!best || run.loss < best.loss))
      best = run;
    onProgress?.(index + 1, starts.length);
  });
  const winner = best as ReturnType<typeof nelderMead> | null;
  if (!winner) throw new Error("No optimizer start produced a finite fit.");
  const parameters = decode(winner.point);
  const fittedSurvival = times.map((time) => survival(time, parameters));
  return {
    parameters,
    fittedSurvival,
    klDivergence: survivalKlDivergence(times, target, fittedSurvival),
    maxSurvivalDifference: Math.max(
      ...target.map((value, i) => Math.abs(value - fittedSurvival[i])),
    ),
    converged: winner.converged,
    starts: starts.length,
    convergedStarts,
  };
}

/** Fit GM to annual cohort survival; log coordinates keep parameters positive. */
export function fitGompertzMakeham(
  times: number[],
  target: number[],
  onProgress?: (completed: number, total: number) => void,
): GmFit {
  survivalKlDivergence(times, target, target);
  let numerator = 0;
  let denominator = 0;
  times.forEach((time, i) => {
    if (time > 0 && target[i] > 0 && target[i] < 1) {
      numerator -= time * Math.log(target[i]);
      denominator += time * time;
    }
  });
  const hazard =
    denominator > 0
      ? Math.max(numerator / denominator, 1e-10)
      : 1 / Math.max(times.at(-1)!, 1);
  const betaStarts = Array.from({ length: 8 }, (_, i) =>
    Math.exp(Math.log(0.005) + (i * (Math.log(0.2) - Math.log(0.005))) / 7),
  );
  const fractions = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9];
  const starts = betaStarts.flatMap((beta) =>
    fractions.map((fraction) => [
      Math.log((1 - fraction) * hazard),
      Math.log(beta),
      Math.log(fraction * hazard),
    ]),
  );
  return runStarts(
    times,
    target,
    starts,
    (point) => ({
      alpha: positive(point[0]),
      beta: positive(point[1]),
      lambda: positive(point[2]),
    }),
    gompertzMakehamSurvival,
    onProgress,
  );
}

/** Fit the CE law with endpoint and elasticity constrained by the market. */
export function fitCompatibleCe(
  times: number[],
  target: number[],
  r: number,
  rho: number,
  onProgress?: (completed: number, total: number) => void,
): CeFit {
  survivalKlDivergence(times, target, target);
  if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(rho) || rho <= 0)
    throw new RangeError(
      "CE fitting requires a positive real rate and positive rho.",
    );
  const horizon = times.at(-1)!;
  const starts = [2, 5, 10, 20, 40].flatMap((endpoint) =>
    [0.01, 0.1, 0.5, 2, 10].map((delta) => [
      Math.log(endpoint),
      Math.log(delta),
    ]),
  );
  const decode = (point: number[]) => {
    const tau = horizon + positive(point[0]);
    const b0 = r / -Math.expm1(-r * tau);
    const deltaExcess = positive(point[1]);
    const deltaMin = 1 + rho / b0;
    const p = deltaMin + deltaExcess;
    const lambda = (p * b0 * deltaExcess) / (rho / b0 + deltaExcess);
    if (
      !Number.isFinite(tau) ||
      tau <= horizon ||
      !Number.isFinite(p) ||
      p <= deltaMin ||
      !Number.isFinite(lambda) ||
      lambda <= 0
    )
      throw new RangeError("Invalid CE fit parameters.");
    return { tau, p, kappa: r, lambda, deltaMin };
  };
  return runStarts(
    times,
    target,
    starts,
    decode,
    compactifiedExponentialSurvival,
    onProgress,
  );
}
