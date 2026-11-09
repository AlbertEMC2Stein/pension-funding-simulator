import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  estimateHistoricalMarket,
  historicalMarketToDraft,
} from "../src/lib/historical-market";
import { initialMarketCalibration } from "../src/lib/market-calibration";

test("calendar-time estimates agree with an independently calculated irregular example", () => {
  const dates = [
    "2020-01-01",
    "2020-01-02",
    "2020-01-04",
    "2020-01-07",
    "2020-01-11",
  ];
  const increments = [
    [0.01, 0.02, -0.01, 0.03],
    [0.02, -0.01, 0.015, 0.005],
  ];
  const prices = [100, 100];
  const rows = ['date,"Asset, A",B', `${dates[0]},100,100`];
  for (let i = 0; i < increments[0].length; i += 1) {
    prices[0] *= Math.exp(increments[0][i]);
    prices[1] *= Math.exp(increments[1][i]);
    rows.push(`${dates[i + 1]},${prices[0]},${prices[1]}`);
  }
  const result = estimateHistoricalMarket(rows.join("\r\n"));
  assert.equal(
    estimateHistoricalMarket(rows.join("\r\n").replace("date,", ",")).assets
      .length,
    2,
  );
  assert.equal(result.assets[0].name, "Asset, A");
  assert.ok(Math.abs(result.assets[0].annualLogGrowth - 1.82625) < 1e-12);
  assert.ok(
    Math.abs(result.assets[0].volatility ** 2 - 0.037539583333333335) < 1e-12,
  );
  assert.ok(Math.abs(result.assets[1].annualLogGrowth - 1.09575) < 1e-12);
  assert.ok(Math.abs(result.correlation[0][1] - -0.16944447756631048) < 1e-12);
  assert.equal(result.pairs[0].maxGapDays, 4);
});

test("synthetic incomplete data retains endpoints and reports pairwise coverage", () => {
  const load = (kind: string) =>
    readFileSync(
      new URL(
        `../examples/market-data/three-asset-calendar-${kind}.csv`,
        import.meta.url,
      ),
      "utf8",
    );
  const full = estimateHistoricalMarket(load("complete"));
  const incomplete = estimateHistoricalMarket(load("missing"));
  assert.equal(incomplete.missingCells, 255);
  assert.deepEqual(
    incomplete.assets.map((asset) => asset.intervals),
    [2523, 2503, 2543],
  );
  assert.deepEqual(
    incomplete.pairs.map((pair) => pair.intervals),
    [2421, 2462, 2438],
  );
  incomplete.assets.forEach((asset, i) => {
    assert.ok(
      Math.abs(asset.annualLogGrowth - full.assets[i].annualLogGrowth) < 1e-12,
    );
    assert.ok(Math.abs(asset.volatility - full.assets[i].volatility) < 0.001);
  });
  const current = initialMarketCalibration();
  const draft = historicalMarketToDraft(incomplete, current);
  assert.equal(draft.assets.length, 3);
  assert.equal(draft.nominalRiskFreePercent, current.nominalRiskFreePercent);
  assert.equal(draft.inflationPercent, current.inflationPercent);
  assert.equal(draft.correlations[0][1], draft.correlations[1][0]);
  assert.equal(draft.assets[0].nominalReturnPercent, "16.89");
  assert.equal(draft.assets[0].volatilityPercent, "15.97");
  assert.equal(draft.correlations[0][1], "0.26");
});

test("rejects rounded estimates if they become singular or zero-volatility", () => {
  const csv = readFileSync(
    new URL(
      "../examples/market-data/three-asset-calendar-complete.csv",
      import.meta.url,
    ),
    "utf8",
  );
  const estimate = estimateHistoricalMarket(csv);
  const tiny = structuredClone(estimate);
  tiny.assets[0].volatility = 0.000001;
  assert.throws(
    () => historicalMarketToDraft(tiny, initialMarketCalibration()),
    /after rounding/,
  );
  const nearlyIdentical = structuredClone(estimate);
  nearlyIdentical.correlation = [
    [1, 0.999, 0],
    [0.999, 1, 0],
    [0, 0, 1],
  ];
  assert.throws(
    () => historicalMarketToDraft(nearlyIdentical, initialMarketCalibration()),
    /after rounding/,
  );
});

test("invalid dates, prices, coverage and pairwise matrices fail explicitly", () => {
  assert.throws(
    () => estimateHistoricalMarket("date,A\n2020-01-02,100\n2020-01-02,101\n"),
    /ascending/,
  );
  assert.throws(
    () => estimateHistoricalMarket("date,A\n2020-01-02,-1\n"),
    /price/i,
  );
  assert.throws(
    () => estimateHistoricalMarket("date,A\n2020-01-02,100\n2020-01-03,101\n"),
    /at least 3/,
  );
  assert.throws(
    () => estimateHistoricalMarket("date,A,a\n2020-01-02,100,101\n"),
    /unique/,
  );
  const data = ["date,A,B,C"];
  const patterns = [
    [1, 1, null],
    [1, null, 1],
    [null, 1, -1],
  ];
  let day = 1;
  for (const pattern of patterns)
    for (const v of [0, 0.01, -0.02, 0.03]) {
      const fields = pattern.map((sign) =>
        sign === null ? "" : String(100 * Math.exp(sign * v)),
      );
      data.push(
        `2020-01-${String(day++).padStart(2, "0")},${fields.join(",")}`,
      );
    }
  assert.throws(
    () => estimateHistoricalMarket(data.join("\n")),
    /correlation matrix/i,
  );
});
