import test from "node:test";
import assert from "node:assert/strict";
import * as tf from "@tensorflow/tfjs";
import { advanceBorrowingOccupation } from "../src/lib/model/simulation/tensorflow/borrowing-occupation-step";
import { prepareBorrowingOccupation } from "../src/lib/model/simulation/borrowing-occupation";
import { prepareGompertzMakehamSurvival } from "../src/lib/mortality/mortality-models";
import { calibrateMarket } from "../src/lib/market/calibrate-market";
import {
  initialSimulationDraft,
  buildSimulationOptions,
} from "../src/lib/options/simulation-options";

test("occupation interpolates entries, exits, stopped steps, and ignores inactive paths", async () => {
  await tf.setBackend("cpu");
  const value = tf.tidy(() =>
    advanceBorrowingOccupation({
      wealth: tf.tensor1d([12, 8, 8, 12, 8]),
      proposedWealth: tf.tensor1d([8, 12, 8, 12, 8]),
      active: tf.tensor1d([1, 1, 1, 1, 0], "bool"),
      crossing: {
        hit: tf.tensor1d([0, 0, 1, 0, 0], "bool"),
        fraction: tf.tensor1d([1, 1, 0.5, 1, 1]),
      },
      impoverishmentLevel: 4,
      accumulated: tf.tensor1d([0, 0, 0, 0, 3]),
      step: { boundaryStart: 10, boundaryEnd: 10, survivalIntegral: 0.8 },
    }),
  );
  const result = Array.from(await value.data());
  value.dispose();
  for (const [i, expected] of [0.4, 0.4, 0.4, 0, 3].entries())
    assert.ok(Math.abs(result[i] - expected) < 1e-6);
});

test("precomputed survival increments and borrowing boundary agree with independent calculations", () => {
  const built = buildSimulationOptions(initialSimulationDraft());
  assert.ok(built.ok);
  const calibrated = calibrateMarket(built.options.market);
  assert.ok(calibrated.ok);
  const gm = { alpha: 0.02, beta: 0.1, lambda: 0.01 };
  const mortality = { p: 3, tau: 10, kappa: 0.02, lambda: 0.03 };
  const times = [0, 0.5, 1];
  const steps = prepareBorrowingOccupation({
    market: calibrated.market,
    mortality,
    gm,
    annualWithdrawal: 30000,
    impoverishmentLevel: 100000,
    times,
  });
  assert.ok(steps);
  const survival = prepareGompertzMakehamSurvival(gm);
  const h = 1 / 10000;
  let numericalIntegral = 0;
  for (let i = 0; i < 10000; i += 1)
    numericalIntegral += h * survival((i + 0.5) * h);
  assert.ok(
    Math.abs(
      steps.reduce((sum, step) => sum + step.survivalIntegral, 0) -
        numericalIntegral,
    ) < 1e-8,
  );
  const m = calibrated.market.mertonDirection.reduce((a, b) => a + b, 0);
  const safe =
    100000 * Math.exp(-calibrated.market.realRiskFreeRate * 10) +
    (30000 * -Math.expm1(-calibrated.market.realRiskFreeRate * 10)) /
      calibrated.market.realRiskFreeRate;
  assert.ok(
    Math.abs(steps[0].boundaryStart - (safe * m) / (m + mortality.p - 1)) <
      1e-8,
  );
});
