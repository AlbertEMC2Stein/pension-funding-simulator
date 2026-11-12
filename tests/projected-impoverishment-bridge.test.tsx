import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { detectProjectedImpoverishment } from "../src/lib/model/simulation/tensorflow/projected-impoverishment-bridge";

test("projected bridge detects stochastic and deterministic crossings and ignores stopped paths", async () => {
  await tf.setBackend("cpu");
  const before = tf.memory().numTensors;
  const result = tf.tidy(() => {
    const bridge = detectProjectedImpoverishment({
      currentWealth: tf.tensor1d([110, 110, 110, 110]),
      proposedWealth: tf.tensor1d([110, 110, 90, 90]),
      active: tf.tensor1d([true, true, true, false], "bool"),
      impoverishmentLevel: 100,
      varianceRate: tf.tensor1d([200, 200, 0, 0]),
      timeStepYears: 1,
      draws: {
        hitThreshold: tf.tensor1d([2, 0.5, 1, 1]),
        timeNormal: tf.ones([4]),
        timeUniform: tf.zeros([4]),
      },
    });

    return { hit: bridge.hit, fraction: bridge.fraction };
  });

  try {
    assert.deepEqual(Array.from(await result.hit.data()), [1, 0, 1, 0]);
    const fractions = await result.fraction.data();
    assert.ok(fractions[0] > 0 && fractions[0] < 1);
    assert.equal(fractions[2], 0.5);
  } finally {
    result.hit.dispose();
    result.fraction.dispose();
    assert.equal(tf.memory().numTensors, before);
  }
});
