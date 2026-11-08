import assert from "node:assert/strict";
import { test } from "node:test";
import { calibrateMarket } from "../src/lib/calibrate-market";
import {
  buildMarketOptions,
  initialSimulationDraft,
} from "../src/lib/simulation-options";

function baseline() {
  const built = buildMarketOptions(initialSimulationDraft().market);
  assert.ok(built.ok);
  return built.market;
}

function close(actual: number, expected: number, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`,
  );
}

test("manual calibration matches the paper's two-asset reference", () => {
  const input = baseline();
  // The paper's reference rate is 0.5% real; the website default is 0.489%.
  input.realRiskFreeRate = 0.005;
  const copy = structuredClone(input);
  const result = calibrateMarket(input);
  assert.ok(result.ok);
  assert.deepEqual(input, copy);
  const market = result.market;
  [0.05602933882446285, 0.01346456284132178].forEach((value, i) =>
    close(market.realDrift[i], value),
  );
  [0.05102933882446285, 0.00846456284132178].forEach((value, i) =>
    close(market.excessReturn[i], value),
  );
  [
    [0.021025, 0.000464],
    [0.000464, 0.0016],
  ].forEach((row, i) =>
    row.forEach((value, j) => close(market.covariance[i][j], value)),
  );
  [2.325207875012663, 4.616041492072441].forEach((value, i) =>
    close(market.mertonDirection[i], value, 1e-11),
  );
  close(market.rho, 0.0788632968895632);
  market.covariance.forEach((row, i) =>
    close(
      row.reduce((sum, value, j) => sum + value * market.mertonDirection[j], 0),
      market.excessReturn[i],
    ),
  );
  assert.equal(market.paperAssumptions.positiveRho, true);
});

test("negative Merton components are reported without rejecting the market", () => {
  const result = calibrateMarket({
    currency: "EUR",
    realRiskFreeRate: 0.05,
    inflationRate: 0,
    assets: [{ name: "A", nominalReturn: 0, volatility: 0.2 }],
    correlation: [[1]],
  });
  assert.ok(result.ok);
  close(result.market.realDrift[0], 0.02);
  close(result.market.mertonDirection[0], -0.75);
  close(result.market.rho, 0.01125);
  assert.equal(result.market.paperAssumptions.nonnegativeMerton, false);
});

test("zero premium is calculated but marked outside the paper's scope", () => {
  const result = calibrateMarket({
    currency: "EUR",
    realRiskFreeRate: 0.125,
    inflationRate: 0,
    assets: [{ name: "A", nominalReturn: 0, volatility: 0.5 }],
    correlation: [[1]],
  });
  assert.ok(result.ok);
  assert.equal(result.market.rho, 0);
  assert.equal(result.market.mertonDirection[0], 0);
  assert.equal(result.market.paperAssumptions.positiveRho, false);
});

test("rejects singular, guarded near-singular and malformed matrices", () => {
  for (const correlation of [
    [
      [1, 1],
      [1, 1],
    ],
    [
      [1, 0.9999999999999],
      [0.9999999999999, 1],
    ],
    [
      [1, 0.5],
      [0.4, 1],
    ],
    [[1]],
  ]) {
    assert.equal(calibrateMarket({ ...baseline(), correlation }).ok, false);
  }
});

test("three-asset calibration preserves ordering and rho under permutations", () => {
  const input = {
    currency: "EUR" as const,
    realRiskFreeRate: 0.01,
    inflationRate: 0.02,
    assets: [
      { name: "A", nominalReturn: 0.05, volatility: 0.2 },
      { name: "B", nominalReturn: 0.03, volatility: 0.1 },
      { name: "C", nominalReturn: 0.07, volatility: 0.3 },
    ],
    correlation: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  };
  const first = calibrateMarket(input);
  assert.ok(first.ok);
  first.market.covariance.forEach((row, i) =>
    row.forEach((value, j) =>
      close(value, i === j ? input.assets[i].volatility ** 2 : 0),
    ),
  );
  first.market.mertonDirection.forEach((value, i) =>
    close(
      value,
      first.market.excessReturn[i] / input.assets[i].volatility ** 2,
    ),
  );
  const order = [2, 0, 1];
  const second = calibrateMarket({
    ...input,
    assets: order.map((i) => input.assets[i]),
    correlation: order.map((i) => order.map((j) => input.correlation[i][j])),
  });
  assert.ok(second.ok);
  close(second.market.rho, first.market.rho);
  order.forEach((oldIndex, i) =>
    close(
      second.market.mertonDirection[i],
      first.market.mertonDirection[oldIndex],
    ),
  );
});
