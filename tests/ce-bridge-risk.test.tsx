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

      // Both coordinates carry the same noise, so mᵀΔZ has variance ρ·dt.
      for (let path = 0; path < count; path += 1) {
        const value = 0.1 * Math.sqrt(dt) * stream.nextStandardNormal();
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
