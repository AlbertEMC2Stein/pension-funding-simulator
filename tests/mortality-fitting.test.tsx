import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  createSurvivalKlObjective,
  survivalKlDivergence,
} from "../src/lib/mortality/survival-fit-loss";
import {
  fitCompatibleCe,
  fitGompertzMakeham,
} from "../src/lib/mortality/mortality-fitting";
import {
  compactifiedExponentialSurvival,
  gompertzMakehamSurvival,
} from "../src/lib/mortality/mortality-models";
import {
  mixCohortSurvival,
  parseCohortCsv,
} from "../src/lib/mortality/cohort-survival";

test("KL uses the last survival value as the final tail bin", () => {
  const loss = survivalKlDivergence([0, 1, 2], [1, 0.7, 0.2], [1, 0.6, 0.1]);
  const expected = 0.3 * Math.log(0.3 / 0.4) + 0.2 * Math.log(0.2 / 0.1);
  assert.ok(Math.abs(loss - expected) < 1e-14);
  assert.equal(
    survivalKlDivergence([0, 1, 2], [1, 0.7, 0.2], [1, 0.6, 0]),
    Infinity,
  );
  assert.equal(survivalKlDivergence([0, 1], [1, 0], [1, 0]), 0);
  assert.throws(() => survivalKlDivergence([0, 1], [1, 1.1], [1, 0.5]));
});

test("prepared KL objective captures the target and still checks each candidate", () => {
  const times = [0, 1, 2];
  const target = [1, 0.7, 0.2];
  const loss = createSurvivalKlObjective(times, target);
  const expected = survivalKlDivergence(times, target, [1, 0.6, 0.1]);
  target[1] = 0.4;
  times[1] = 3;
  assert.equal(loss([1, 0.6, 0.1]), expected);
  assert.equal(loss([1, 0.8, 0.9]), Infinity);
  assert.throws(() => loss([1, 0.6]));
});

test("GM multistart recovers a synthetic survival curve", () => {
  const times = Array.from({ length: 41 }, (_, i) => i);
  const target = times.map((t) =>
    gompertzMakehamSurvival(t, { alpha: 0.002, beta: 0.09, lambda: 0.001 }),
  );
  const fit = fitGompertzMakeham(times, target);
  assert.ok(fit.klDivergence < 1e-10);
  assert.ok(fit.maxSurvivalDifference < 1e-4);
  assert.equal(fit.converged, true);
});

test("CE multistart recovers a compatible synthetic survival curve", () => {
  const times = Array.from({ length: 41 }, (_, i) => i);
  const r = 0.005,
    rho = 0.0788632968895632,
    tau = 50;
  const b0 = r / -Math.expm1(-r * tau);
  const p = 1 + rho / b0 + 2;
  const lambda = p * (b0 - rho / (p - 1));
  const target = times.map((t) =>
    compactifiedExponentialSurvival(t, { lambda, p, kappa: r, tau }),
  );
  const fit = fitCompatibleCe(times, target, r, rho);
  assert.ok(fit.klDivergence < 1e-10);
  assert.ok(fit.maxSurvivalDifference < 1e-4);
  assert.ok(fit.parameters.tau > 40);
  assert.ok(fit.parameters.p > fit.parameters.deltaMin);
  assert.equal(fit.converged, true);
  assert.throws(() => fitCompatibleCe(times, target, r, 0));
});

test("age-67 mixed cohort fits agree with saved MATLAB study outputs", () => {
  // Research source: figures/numerical/mortality_calibration/mortality_fit_parameters.csv,
  // row Age 67, BirthYear 1959; medium variant, equal conditional-survival mix.
  const load = (sex: string) =>
    parseCohortCsv(
      readFileSync(
        new URL(
          `../public/data/mortality/cohort_table_1926_2026_${sex}_medium.csv`,
          import.meta.url,
        ),
        "utf8",
      ),
      1959,
    );
  const curve = mixCohortSurvival(load("female"), load("male"), 67, 0.5);
  const times = curve.map((point) => point.age - 67);
  const target = curve.map((point) => point.survival);
  const gm = fitGompertzMakeham(times, target);
  const ce = fitCompatibleCe(times, target, 0.005, 0.0788632968895632);
  assert.ok(Math.abs(gm.klDivergence - 0.000405418430788909) < 1e-10);
  assert.ok(Math.abs(gm.parameters.alpha - 0.00570616258882826) < 1e-6);
  assert.ok(Math.abs(gm.parameters.beta - 0.130797113896016) < 1e-6);
  assert.ok(Math.abs(gm.parameters.lambda - 0.00766237503720938) < 1e-6);
  assert.ok(Math.abs(ce.klDivergence - 0.0164904173488328) < 1e-10);
  assert.ok(Math.abs(ce.parameters.tau - 42.6510561113266) < 1e-5);
  assert.ok(Math.abs(ce.parameters.p - 4.20483406986404) < 1e-5);
});
