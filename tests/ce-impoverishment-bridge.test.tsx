import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { detectCeImpoverishment } from "../src/lib/model/simulation/tensorflow/ce-impoverishment-bridge";
import { initializeTensorBackend } from "../src/lib/model/simulation/tensorflow/backend";

test("CE adapter detects a missed crossing and respects inactive paths", async () => {
  await initializeTensorBackend(["cpu"]);
  const before = tf.memory().numTensors;
  const input = tf.tidy(() => ({
    currentWealth: tf.tensor1d([150000, 150000, 150000]),
    proposedWealth: tf.tensor1d([140000, 140000, 140000]),
    active: tf.tensor1d([true, true, false], "bool"),
    draws: {
      hitThreshold: tf.tensor1d([2, 1, 2]),
      timeNormal: tf.ones<tf.Rank.R1>([3]),
      timeUniform: tf.zeros<tf.Rank.R1>([3]),
    },
  }));

  try {
    const result = detectCeImpoverishment({
      ...input,
      impoverishmentLevel: 100000,
      currentSafeBoundary: 200000,
      nextSafeBoundary: 190000,
      timeStepYears: 1,
      logGapVarianceRate: 0.5,
    });

    try {
      assert.deepEqual(Array.from(await result.hit.data()), [1, 0, 0]);
      const fraction = await result.fraction.data();
      assert.ok(fraction[0] > 0 && fraction[0] < 1);
    } finally {
      result.hit.dispose();
      result.fraction.dispose();
    }
  } finally {
    tf.dispose(input);
    assert.equal(tf.memory().numTensors, before);
  }
});

test("CE adapter handles the endpoint and zero-variance paths", async () => {
  await initializeTensorBackend(["cpu"]);
  const result = tf.tidy(() => {
    const bridge = detectCeImpoverishment({
      currentWealth: tf.tensor1d([150000, 200000]),
      proposedWealth: tf.tensor1d([90000, 90000]),
      active: tf.tensor1d([true, true], "bool"),
      impoverishmentLevel: 100000,
      currentSafeBoundary: 200000,
      nextSafeBoundary: 100000,
      timeStepYears: 1,
      logGapVarianceRate: 0.5,
      draws: {
        hitThreshold: tf.ones([2]),
        timeNormal: tf.ones([2]),
        timeUniform: tf.zeros([2]),
      },
    });

    return { hit: bridge.hit, fraction: bridge.fraction };
  });

  try {
    assert.deepEqual(Array.from(await result.hit.data()), [1, 1]);
    const fraction = await result.fraction.data();
    assert.ok(fraction[0] > 0 && fraction[0] < 1);
    assert.ok(Math.abs(fraction[1] - 10 / 11) < 1e-6);
  } finally {
    result.hit.dispose();
    result.fraction.dispose();
  }
});
