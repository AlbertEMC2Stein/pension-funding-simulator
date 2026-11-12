import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import {
  interpolateProjection,
  prepareProjectionCurve,
} from "../src/lib/model/analytical/projection-curve";
import {
  advanceProjectedWealthStep,
  createTensorProjectedPolicy,
  disposeTensorProjectedPolicy,
} from "../src/lib/model/simulation/tensorflow/projected-wealth-step";
import { safeBoundary } from "../src/lib/model/analytical/safe-boundary";

const covariance = [
  [0.04, 0.006],
  [0.006, 0.01],
];
const direction = [2, 1];
const excessReturn = [0.086, 0.022];
const common = {
  covariance,
  mertonDirection: direction,
  realRiskFreeRate: 0.05,
  annualWithdrawal: 30,
  impoverishmentLevel: 100,
  mortalityEndpoint: 10,
  delta: 2,
};

test("projected tensor step matches scalar Euler values and freezes inactive paths", async () => {
  await tf.setBackend("cpu");
  const curve = prepareProjectionCurve(common);
  const boundary = safeBoundary({ ...common, time: 0 });
  const values = [120, 180, boundary + 20, 100];
  const increments = [
    [0.02, -0.01],
    [-0.01, 0.03],
    [0.01, 0.01],
    [0.02, 0.02],
  ];
  const dt = 0.1;
  const annuity =
    Math.expm1(common.realRiskFreeRate * dt) / common.realRiskFreeRate;
  const policy = createTensorProjectedPolicy(curve, excessReturn, covariance);
  const wealth = tf.tensor1d(values);
  const active = tf.tensor1d([true, true, true, false], "bool");
  const noise = tf.tensor2d(increments);
  let result: ReturnType<typeof advanceProjectedWealthStep> | undefined;

  try {
    result = advanceProjectedWealthStep({
      policy,
      wealth,
      active,
      increments: noise,
      currentSafeBoundary: boundary,
      impoverishmentLevel: common.impoverishmentLevel,
      realRiskFreeRate: common.realRiskFreeRate,
      annualWithdrawal: common.annualWithdrawal,
      delta: common.delta,
      timeStepYears: dt,
      riskFreeAnnuityFactor: annuity,
    });
    const actual = await result.wealth.array();
    const variance = await result.varianceRate.array();

    for (let i = 0; i < 2; i += 1) {
      const scale = (boundary - values[i]) / values[i] / (common.delta - 1);
      const pi = interpolateProjection(curve, scale);
      const drift = pi.reduce(
        (sum, weight, j) => sum + weight * excessReturn[j],
        0,
      );
      const random = pi.reduce(
        (sum, weight, j) => sum + weight * increments[i][j],
        0,
      );
      const expected =
        values[i] +
        (values[i] * (common.realRiskFreeRate + drift) -
          common.annualWithdrawal) *
          dt +
        values[i] * random;
      const expectedVariance =
        values[i] ** 2 *
        pi.reduce(
          (sum, weight, j) =>
            sum +
            weight *
              covariance[j].reduce((subtotal, c, k) => subtotal + c * pi[k], 0),
          0,
        );

      assert.ok(Math.abs(actual[i] - expected) < 1e-4);
      assert.ok(Math.abs(variance[i] - expectedVariance) < 1e-4);
    }

    assert.ok(
      Math.abs(
        actual[2] -
          (values[2] +
            (values[2] * common.realRiskFreeRate - common.annualWithdrawal) *
              annuity),
      ) < 1e-4,
    );
    assert.equal(actual[3], 100);
    assert.equal(variance[2], 0);
    assert.equal(variance[3], 0);
  } finally {
    result?.wealth.dispose();
    result?.varianceRate.dispose();
    wealth.dispose();
    active.dispose();
    noise.dispose();
    disposeTensorProjectedPolicy(policy);
  }
});
