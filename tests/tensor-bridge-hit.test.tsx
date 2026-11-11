import assert from "node:assert/strict";
import { test } from "node:test";
import * as tf from "@tensorflow/tfjs";
import { initializeTensorBackend } from "../src/lib/model/simulation/tensorflow/backend";
import { detectBridgeHit } from "../src/lib/model/simulation/tensorflow/bridge-hit";
import { createRandomStream } from "../src/lib/model/simulation/random";

/** Numeric pathwise inputs used to exercise the tensor-only bridge primitive. */
interface BridgeCase {
  start: number;
  end: number;
  variance: number;
  hitThreshold: number;
  normal: number;
  uniform: number;
}

/** Run supplied bridge cases on TensorFlow CPU and dispose every owned tensor. */
async function evaluate(
  cases: BridgeCase[],
): Promise<{ hit: number[]; fraction: number[] }> {
  await initializeTensorBackend(["cpu"]);
  const before = tf.memory().numTensors;
  const inputs = [
    tf.tensor1d(cases.map((row) => row.start)),
    tf.tensor1d(cases.map((row) => row.end)),
    tf.tensor1d(cases.map((row) => row.variance)),
    tf.tensor1d(cases.map((row) => row.hitThreshold)),
    tf.tensor1d(cases.map((row) => row.normal)),
    tf.tensor1d(cases.map((row) => row.uniform)),
  ];

  try {
    const result = detectBridgeHit({
      distanceStart: inputs[0],
      distanceEnd: inputs[1],
      stepVariance: inputs[2],
      draws: {
        hitThreshold: inputs[3],
        timeNormal: inputs[4],
        timeUniform: inputs[5],
      },
    });

    try {
      const [hit, fraction] = await Promise.all([
        result.hit.data(),
        result.fraction.data(),
      ]);

      return { hit: Array.from(hit), fraction: Array.from(fraction) };
    } finally {
      result.hit.dispose();
      result.fraction.dispose();
    }
  } finally {
    inputs.forEach((tensor) => tensor.dispose());
    assert.equal(tf.memory().numTensors, before);
  }
}

test("bridge handles start hits, deterministic crossings, and missed grid crossings", async () => {
  const base = { hitThreshold: 1, normal: 1, uniform: 0.1 };
  const result = await evaluate([
    { ...base, start: 0, end: 3, variance: 1 },
    { ...base, start: 2, end: -1, variance: 0 },
    { ...base, start: 2, end: 1, variance: 0 },
    { ...base, start: 1, end: 1, variance: 1, hitThreshold: 3 },
    { ...base, start: 1, end: 1, variance: 1, hitThreshold: 1 },
    { ...base, start: 1, end: -1, variance: 1 },
  ]);

  assert.deepEqual(result.hit, [1, 1, 0, 1, 0, 1]);
  assert.equal(result.fraction[0], 0);
  assert.ok(Math.abs(result.fraction[1] - 2 / 3) < 1e-6);
  assert.equal(result.fraction[2], 1);
  assert.equal(result.fraction[4], 1);
  assert.ok(
    result.fraction.every(
      (fraction) => Number.isFinite(fraction) && fraction >= 0 && fraction <= 1,
    ),
  );
});

test("conditional hit-time sampler matches hand-computable branches", async () => {
  const base = { start: 1, variance: 1, hitThreshold: 3 };
  const result = await evaluate([
    { ...base, end: 1, normal: 0, uniform: 0.5 },
    { ...base, end: 1, normal: 1, uniform: 0.1 },
    { ...base, end: 1, normal: 1, uniform: 0.9 },
    { ...base, end: 0, normal: 1, uniform: 0.5 },
    { ...base, end: -1, normal: 1, uniform: 0.1 },
  ]);
  const expected = [
    0.5,
    (1 - 1 / Math.sqrt(5)) / 2,
    (1 + 1 / Math.sqrt(5)) / 2,
    0.5,
    (1 - 1 / Math.sqrt(5)) / 2,
  ];

  assert.deepEqual(result.hit, [1, 1, 1, 1, 1]);
  result.fraction.forEach((value, index) =>
    assert.ok(Math.abs(value - expected[index]) < 1e-6),
  );
});

test("bridge crossing frequency matches the linear-boundary probability", async () => {
  const count = 10000;
  const cases = Array.from({ length: count }, (_, index) => ({
    start: 1,
    end: 1,
    variance: 1,
    hitThreshold: -Math.log((index + 0.5) / count),
    normal: 1,
    uniform: 0.5,
  }));
  const result = await evaluate(cases);
  const frequency = result.hit.reduce((sum, value) => sum + value, 0) / count;

  assert.ok(Math.abs(frequency - Math.exp(-2)) < 1 / count);
});

test("conditional first-hit times agree with the midpoint bridge probability", async () => {
  const stream = createRandomStream("bridge-midpoint-check");
  const count = 20000;
  const cases = Array.from({ length: count }, () => ({
    start: 1,
    end: 1,
    variance: 1,
    hitThreshold: 3,
    normal: stream.nextStandardNormal(),
    uniform: stream.nextUniform(),
  }));
  const result = await evaluate(cases);
  const observed =
    result.fraction.filter((fraction) => fraction <= 0.5).length / count;

  // Reflection principle: P(hit by 1/2 | hit and endpoints 1,1)
  // = 1/2 + Φ(−2)/exp(−2), with Φ(−2) given to 10 decimals.
  const expected = 0.5 + 0.0227501319 / Math.exp(-2);
  assert.ok(Math.abs(observed - expected) < 0.015);
});
