import assert from "node:assert/strict";
import { test } from "node:test";
import { compactifiedExponentialSurvival } from "../src/lib/mortality/mortality-models";
import { createRandomStream } from "../src/lib/model/simulation/random";
import { createTensorBridgeDraws } from "../src/lib/model/simulation/tensorflow/bridge-random";
import { initializeTensorBackend } from "../src/lib/model/simulation/tensorflow/backend";
import { simulateTensorWealthBatch } from "../src/lib/model/simulation/tensorflow/wealth-batch";

test("bridge-detected CE first-hit times reproduce the analytical lifetime risk", async () => {
  await initializeTensorBackend(["cpu"]);
  const rate = Math.LN2 / 10;
  const market = {
    realRiskFreeRate: rate,
    rho: 0.01,
    mertonDirection: [0.5, 0.5],
  };
  const mortality = {
    tau: 10,
    p: 2,
    kappa: rate,
    lambda: 2 * (2 * rate - 0.01),
  };
  const count = 5000;
  const stream = createRandomStream("ce-bridge-own-law");
  const times = Array.from({ length: 121 }, (_, index) => index / 12);
  const result = await simulateTensorWealthBatch({
    market,
    mortality,
    annualWithdrawal: 300000 * rate,
    investor: { initialCapital: 150000, impoverishmentLevel: 100000 },
    pathCount: count,
    times,
    increments: (_step, dt) => {
      const increments = new Float32Array(2 * count);

      // Both coordinates carry the same noise, so mᵀΔZ has variance 2ρ·dt.
      for (let path = 0; path < count; path += 1) {
        const value =
          Math.sqrt(2 * market.rho * dt) * stream.nextStandardNormal();
        increments[2 * path] = value;
        increments[2 * path + 1] = value;
      }

      return Array.from(increments);
    },
    bridgeDraws: () => createTensorBridgeDraws(count, stream),
  });

  const mean =
    Array.from(result.firstHitTime).reduce(
      (sum, hitTime) =>
        sum +
        (hitTime < 0 ? 0 : compactifiedExponentialSurvival(hitTime, mortality)),
      0,
    ) / count;

  // For this hand-computable model the compatible analytical CE risk is 25%.
  assert.ok(Math.abs(mean - 0.25) < 0.025, `Observed CE risk ${mean}`);
});

test("projected step approaches the CE reference when constraints never bind", async () => {
  await initializeTensorBackend(["cpu"]);
  const { prepareProjectionCurve } =
    await import("../src/lib/model/analytical/projection-curve");
  const rate = Math.LN2 / 10;
  const market = {
    realRiskFreeRate: rate,
    rho: 0.01,
    mertonDirection: [0.5, 0.5],
  };
  const mortality = {
    tau: 10,
    p: 2,
    kappa: rate,
    lambda: 2 * (2 * rate - 0.01),
  };
  const covariance = [
    [0.04, 0],
    [0, 0.04],
  ];
  const withdrawal = 300000 * rate;
  const curve = prepareProjectionCurve({
    covariance,
    mertonDirection: market.mertonDirection,
    realRiskFreeRate: rate,
    annualWithdrawal: withdrawal,
    impoverishmentLevel: 100000,
    mortalityEndpoint: 10,
    delta: 2,
  });
  const count = 5000;
  const stream = createRandomStream("paired-ce-reference");
  const times = Array.from({ length: 121 }, (_, index) => index / 12);
  const result = await simulateTensorWealthBatch({
    market,
    mortality,
    annualWithdrawal: withdrawal,
    investor: { initialCapital: 150000, impoverishmentLevel: 100000 },
    pathCount: count,
    times,
    projected: { curve, covariance, excessReturn: [0.02, 0.02] },
    increments: (_step, dt) => {
      const values = new Float32Array(2 * count);
      for (let i = 0; i < values.length; i += 1)
        values[i] = 0.2 * Math.sqrt(dt) * stream.nextStandardNormal();
      return Array.from(values);
    },
    bridgeDraws: () => createTensorBridgeDraws(count, stream),
  });

  assert.ok(result.projected);
  const payoff = (time: number) =>
    time < 0 ? 0 : compactifiedExponentialSurvival(time, mortality);
  let projectedTotal = 0;
  let differenceTotal = 0;
  for (let i = 0; i < count; i += 1) {
    const projected = payoff(result.projected.firstHitTime[i]);
    projectedTotal += projected;
    differenceTotal += projected - payoff(result.firstHitTime[i]);
  }

  assert.ok(Math.abs(projectedTotal / count - 0.25) < 0.025);
  assert.ok(Math.abs(differenceTotal / count) < 0.015);
});
