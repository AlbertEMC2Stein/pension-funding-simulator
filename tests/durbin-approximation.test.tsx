import assert from "node:assert/strict";
import { test } from "node:test";
import { adaptiveQuadrature } from "../src/lib/numerics/adaptive-quadrature";
import { prepareDurbinApproximation } from "../src/lib/model/analytical/durbin-approximation";

/** A compatible synthetic CE fit and a separate GM reference law. */
function inputForRisk(ceRisk: number) {
  const r = Math.LN2 / 10;

  return {
    realRiskFreeRate: r,
    rho: 0.01,
    ce: { tau: 10, p: 2, kappa: r, lambda: 2 * (2 * r - 0.01) },
    gm: { alpha: 0.01, beta: 0.1, lambda: 0.02 },
    ceRisk,
    horizonYears: 10,
  };
}

test("adaptive quadrature integrates smooth functions with a numerical error estimate", () => {
  const result = adaptiveQuadrature(Math.sin, 0, Math.PI, 1e-12, 1e-10);
  assert.ok(Math.abs(result.value - 2) < 1e-10);
  assert.ok(result.estimatedError >= 0);
});

test("Durbin produces horizon-limited forecast and conditional curves", () => {
  const approximation = prepareDurbinApproximation(inputForRisk(0.25));
  assert.ok(approximation.ceWeightedMass >= 0.25);
  assert.ok(approximation.ceConditionalEventTvBound! >= 0);
  const forecast = approximation.view(null);
  const atZero = approximation.view(0);
  const conditional = approximation.view(2);
  assert.ok(forecast.available && atZero.available && conditional.available);

  assert.ok(Math.abs(forecast.tail[0].value - atZero.tail[0].value) < 1e-12);
  assert.equal(forecast.tail.at(-1)!.value, 0);
  assert.equal(conditional.tail[0].timeYears, 2);
  assert.equal(conditional.tail.at(-1)!.value, 0);
  assert.ok(
    forecast.tail.every(
      (point, index) =>
        index === 0 || point.value <= forecast.tail[index - 1].value + 1e-12,
    ),
  );
  assert.ok(
    forecast.density.every(
      (point) => Number.isFinite(point.value) && point.value >= 0,
    ),
  );
  assert.deepEqual(approximation.view(10), {
    available: false,
    reason: "outside-horizon",
  });
});

test("safe starting wealth has zero risk and no normalized CE error bound", () => {
  const approximation = prepareDurbinApproximation(inputForRisk(0));
  const result = approximation.view(null);
  assert.equal(approximation.ceConditionalEventTvBound, null);
  assert.ok(result.available);
  assert.ok(result.tail.every((point) => point.value === 0));
});

test("first term is close to the manuscript's rounded baseline calibration", () => {
  const r = 0.005;
  const s11 = 0.145 ** 2;
  const s22 = 0.04 ** 2;
  const s12 = 0.08 * 0.145 * 0.04;
  const determinant = s11 * s22 - s12 ** 2;
  const theta1 = 0.051029;
  const theta2 = 0.008465;
  const rho =
    (s22 * theta1 ** 2 - 2 * s12 * theta1 * theta2 + s11 * theta2 ** 2) /
    (2 * determinant);
  const tau = 42.65;
  const p = 4.205;
  const b0 = r / -Math.expm1(-r * tau);
  const lambda = p * (b0 - rho / (p - 1));
  const result = prepareDurbinApproximation({
    realRiskFreeRate: r,
    rho,
    ce: { tau, p, kappa: r, lambda },
    gm: { alpha: 0.01, beta: 0.1, lambda: 0.02 },
    ceRisk: 0.05,
    horizonYears: tau,
  });

  // The manuscript reports these values using unrounded fitted parameters.
  assert.ok(Math.abs(result.ceWeightedMass - 0.0533755) < 0.0002);
  assert.notEqual(result.ceConditionalEventTvBound, null);
  assert.ok(
    Math.abs(
      result.ceConditionalEventTvBound! - (1 - 0.05 / result.ceWeightedMass),
    ) < 1e-14,
  );
  assert.ok(Math.abs(result.ceConditionalEventTvBound! - 0.063241) < 0.004);
});

test("Durbin GM density matches the wealth-boundary formula independently", () => {
  const input = inputForRisk(0.25);
  const approximation = prepareDurbinApproximation(input);
  const view = approximation.view(null);
  assert.ok(view.available);
  const t = 3.90625;
  const r = input.realRiskFreeRate;
  const T = input.ce.tau;
  const delta = input.ce.p;
  const sigma = Math.sqrt(2 * input.rho) / (delta - 1);
  const drift = r - (2 * input.rho) / (delta - 1) - sigma ** 2 / 2;
  const width = (time: number) => -Math.expm1(-r * (T - time));
  const initialGap = width(0) * input.ceRisk ** (1 / delta);
  const h = (Math.log(width(t) / initialGap) - drift * t) / sigma;
  const hPrime = (-r / Math.expm1(r * (T - t)) - drift) / sigma;
  const financial =
    ((h - t * hPrime) / Math.sqrt(2 * Math.PI * t ** 3)) *
    Math.exp(-(h ** 2) / (2 * t));
  const survival = Math.exp(
    -input.gm.lambda * t -
      (input.gm.alpha / input.gm.beta) * Math.expm1(input.gm.beta * t),
  );
  const point = view.density.find((item) => item.timeYears === t);
  assert.ok(point);
  assert.ok(Math.abs(point.value - financial * survival) < 1e-12);
});

test("conditional approximation refuses a non-positive survival denominator", () => {
  const approximation = prepareDurbinApproximation(inputForRisk(0.25));
  assert.deepEqual(approximation.view(9.999), {
    available: false,
    reason: "unstable-conditioning",
  });
});

test("finite-horizon forecast agrees with its full-horizon tail at the cutoff", () => {
  const input = inputForRisk(0.25);
  const full = prepareDurbinApproximation(input).view(null);
  const short = prepareDurbinApproximation({ ...input, horizonYears: 5 }).view(
    null,
  );
  assert.ok(full.available && short.available);
  const fullAtFive = full.tail.find((point) => point.timeYears === 5);
  assert.ok(fullAtFive);
  assert.ok(
    Math.abs(short.tail[0].value - (full.tail[0].value - fullAtFive.value)) <
      1e-10,
  );
  assert.equal(short.tail.at(-1)!.value, 0);
});

test("first-term consistency checks hold for a range of CE risks", () => {
  for (const q of [0.001, 0.01, 0.05, 0.5, 0.95]) {
    const approximation = prepareDurbinApproximation(inputForRisk(q));
    assert.ok(approximation.ceWeightedMass >= q - 1e-7);
    assert.ok(Number.isFinite(approximation.quadratureErrorEstimate));
  }
});
