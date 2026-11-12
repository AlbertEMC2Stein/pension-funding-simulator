import assert from "node:assert/strict";
import { test } from "node:test";
import {
  interpolateProjection,
  prepareProjectionCurve,
} from "../src/lib/model/analytical/projection-curve";
import { projectCovarianceSimplex } from "../src/lib/model/analytical/simplex-projection";

const common = {
  realRiskFreeRate: 0.05,
  annualWithdrawal: 30,
  impoverishmentLevel: 100,
  mortalityEndpoint: 10,
  delta: 2,
};

test("scale range uses the limiting safe boundaries at retirement and the CE endpoint", () => {
  const curve = prepareProjectionCurve({
    ...common,
    covariance: [[1]],
    mertonDirection: [1],
  });
  const expectedMax = ((30 / 0.05 - 100) * (1 - Math.exp(-0.5))) / 100;

  assert.equal(curve.minScale, 0);
  assert.ok(Math.abs(curve.maxScale - expectedMax) < 1e-12);
  assert.equal(curve.knots[0].scale, curve.minScale);
  assert.equal(curve.knots.at(-1)?.scale, curve.maxScale);
  assert.ok(curve.knots.some((knot) => Math.abs(knot.scale - 1) < 1e-12));
  assert.throws(
    () => interpolateProjection(curve, curve.maxScale + 1),
    /outside/,
  );
});

test("interpolation agrees with direct projection across correlated markets", () => {
  for (const n of [1, 2, 3, 5, 10]) {
    for (let sample = 0; sample < 8; sample += 1) {
      // B B^T + diagonal is positive definite, including nonzero correlations.
      const factor = Array.from({ length: n }, (_, i) =>
        Array.from(
          { length: n },
          (_, j) => Math.sin((i + 1) * (j + 2) * (sample + 1)) / Math.sqrt(n),
        ),
      );
      const covariance = factor.map((row, i) =>
        factor.map((other, j) =>
          row.reduce(
            (sum, value, k) => sum + value * other[k],
            i === j ? 0.2 : 0,
          ),
        ),
      );
      const direction = Array.from(
        { length: n },
        (_, i) => Math.sin((i + 1) * (sample + 2)) * 1.7,
      );
      const curve = prepareProjectionCurve({
        ...common,
        covariance,
        mertonDirection: direction,
      });

      for (let index = 0; index <= 60; index += 1) {
        const scale = (curve.maxScale * index) / 60;
        const actual = interpolateProjection(curve, scale);
        const expected = projectCovarianceSimplex({
          allocation: direction.map((value) => value * scale),
          covariance,
        });

        actual.forEach((value, i) =>
          assert.ok(
            Math.abs(value - expected[i]) < 1e-7,
            `n=${n}, sample=${sample}, scale=${scale}, asset=${i}: ${value} vs ${expected[i]}`,
          ),
        );
      }
    }
  }
});

test("simultaneous constraint changes and scales near breakpoints match directly", () => {
  const covariance = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const direction = [1, 1, -0.5];
  const curve = prepareProjectionCurve({
    ...common,
    covariance,
    mertonDirection: direction,
  });

  assert.ok(curve.knots.some((knot) => Math.abs(knot.scale - 0.5) < 1e-12));

  for (const knot of curve.knots) {
    for (const offset of [-1e-9, 0, 1e-9]) {
      const scale = Math.max(
        curve.minScale,
        Math.min(curve.maxScale, knot.scale + offset),
      );
      const actual = interpolateProjection(curve, scale);
      const expected = projectCovarianceSimplex({
        allocation: direction.map((value) => value * scale),
        covariance,
      });
      actual.forEach((value, i) =>
        assert.ok(Math.abs(value - expected[i]) < 1e-8),
      );
    }
  }
});
