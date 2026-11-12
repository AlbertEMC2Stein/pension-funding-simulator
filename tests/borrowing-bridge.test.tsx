import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { detectFirstBorrowing } from "../src/lib/model/simulation/tensorflow/borrowing-bridge";

test("borrowing bridge detects hidden crossings, initial borrowing and truncated steps", async () => {
  await tf.setBackend("cpu");
  const result = tf.tidy(() => {
    const crossing = detectFirstBorrowing({
      currentWealth: tf.tensor1d([70, 70, 40, 70, 70, 110]),
      proposedWealth: tf.tensor1d([60, 60, 60, 60, 90, 110]),
      pending: tf.tensor1d([1, 1, 1, 0, 1, 1], "bool"),
      impoverishmentHit: {
        hit: tf.tensor1d([0, 0, 0, 0, 1, 0], "bool"),
        fraction: tf.tensor1d([1, 1, 1, 1, 0.5, 1]),
      },
      impoverishmentLevel: 40,
      currentSafeBoundary: 100,
      nextSafeBoundary: 100,
      boundaryScale: 0.5,
      realRiskFreeRate: 0.02,
      timeStepYears: 1,
      logGapVarianceRate: 1,
      draws: {
        hitThreshold: tf.tensor1d([10, 0, 0, 10, 0, 10]),
        timeNormal: tf.ones([6]) as tf.Tensor1D,
        timeUniform: tf.zeros([6]) as tf.Tensor1D,
      },
    });
    return { hit: crossing.hit, fraction: crossing.fraction };
  });
  const [hits, fractions] = await Promise.all([
    result.hit.data(),
    result.fraction.data(),
  ]);
  assert.deepEqual(Array.from(hits), [1, 0, 1, 0, 1, 0]);
  assert.equal(fractions[2], 0);
  assert.ok(fractions[0] > 0 && fractions[0] < 1);
  assert.ok(fractions[4] > 0 && fractions[4] < 1);
  result.hit.dispose();
  result.fraction.dispose();
});
