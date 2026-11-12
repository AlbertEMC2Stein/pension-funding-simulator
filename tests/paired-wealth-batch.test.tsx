import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { prepareProjectionCurve } from "../src/lib/model/analytical/projection-curve";
import { simulateTensorWealthBatch } from "../src/lib/model/simulation/tensorflow/wealth-batch";

test("paired batch freezes each projected path after its own first hit", async () => {
  await tf.setBackend("cpu");
  const covariance = [
    [0.04, 0.006],
    [0.006, 0.01],
  ];
  const market = {
    realRiskFreeRate: 0.05,
    rho: 0.097,
    mertonDirection: [2, 1],
  };
  const mortality = { tau: 10, p: 2, kappa: 0.05, lambda: 0.1 };
  const curve = prepareProjectionCurve({
    covariance,
    mertonDirection: market.mertonDirection,
    realRiskFreeRate: 0.05,
    annualWithdrawal: 30,
    impoverishmentLevel: 100,
    mortalityEndpoint: 10,
    delta: 2,
  });
  const before = tf.memory().numTensors;
  const result = await simulateTensorWealthBatch({
    market,
    mortality,
    annualWithdrawal: 30,
    investor: { initialCapital: 150, impoverishmentLevel: 100 },
    pathCount: 2,
    times: [0, 0.1, 0.2],
    increments: [
      [-2, -2, 0, 0],
      [2, 2, 0, 0],
    ],
    projected: { curve, covariance, excessReturn: [0.086, 0.022] },
    bridgeDraws: () => ({
      hitThreshold: tf.zeros([2]),
      timeNormal: tf.ones([2]),
      timeUniform: tf.zeros([2]),
    }),
  });

  assert.ok(result.projected);
  assert.equal(result.projected.firstHitStep[0], 1);
  assert.equal(result.projected.finalWealth[0], 100);
  assert.equal(result.projected.firstHitStep[1], -1);
  assert.ok(
    result.projected.firstHitTime[0] >= 0 &&
      result.projected.firstHitTime[0] <= 0.1,
  );
  assert.equal(result.projected.firstHitTime[1], -1);
  assert.equal(tf.memory().numTensors, before);
});
