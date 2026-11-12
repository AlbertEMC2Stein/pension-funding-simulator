import assert from "node:assert/strict";
import { test } from "node:test";
import {
  makeTimingDensityBins,
  timingDensityAt,
} from "../src/components/evaluation/timing-curve";

test("annual density bin areas reproduce cumulative probability, including the final partial year", () => {
  const points = [
    { timeYears: 0, cumulativeRisk: 0 },
    { timeYears: 0.5, cumulativeRisk: 0.01 },
    { timeYears: 1, cumulativeRisk: 0.03 },
    { timeYears: 2.25, cumulativeRisk: 0.05 },
    { timeYears: 2.5, cumulativeRisk: 0.06 },
  ];
  const bins = makeTimingDensityBins(points);

  assert.deepEqual(
    bins.map(({ startTime, endTime }) => [startTime, endTime]),
    [
      [0, 1],
      [1, 2],
      [2, 2.5],
    ],
  );
  assert.ok(Math.abs(bins[0].density - 0.03) < 1e-15);
  assert.equal(bins[1].density, 0);
  assert.ok(Math.abs(bins[2].density - 0.06) < 1e-15);
  const area = bins.reduce(
    (sum, bin) => sum + (bin.endTime - bin.startTime) * bin.density,
    0,
  );
  assert.ok(Math.abs(area - 0.06) < 1e-15);
  assert.equal(timingDensityAt(bins, 1), bins[0].density);
});

test("conditional bins start at selected time and include only their conditional curve", () => {
  const points = [
    { timeYears: 2.4, cumulativeRisk: 0 },
    { timeYears: 2.9, cumulativeRisk: 0.02 },
    { timeYears: 3.4, cumulativeRisk: 0.04 },
    { timeYears: 4, cumulativeRisk: 0.05 },
  ];
  const bins = makeTimingDensityBins(points);

  assert.equal(bins[0].startTime, 2.4);
  assert.equal(bins.at(-1)!.endTime, 4);
  assert.ok(Math.abs(timingDensityAt(bins, 2.4) - 0.04) < 1e-15);
  const area = bins.reduce(
    (sum, bin) => sum + (bin.endTime - bin.startTime) * bin.density,
    0,
  );
  assert.ok(Math.abs(area - 0.05) < 1e-15);
});

test("a time-zero hit contributes to the first bin", () => {
  const bins = makeTimingDensityBins([
    { timeYears: 0, cumulativeRisk: 0.01 },
    { timeYears: 2, cumulativeRisk: 0.01 },
  ]);
  assert.equal(bins[0].density, 0.01);
  assert.equal(bins[1].density, 0);
});

test("fixed-count conditional bins keep 30 equal intervals and preserve probability", () => {
  for (const start of [2.4, 9.9]) {
    const points = [
      { timeYears: start, cumulativeRisk: 0 },
      { timeYears: (start + 10) / 2, cumulativeRisk: 0.03 },
      { timeYears: 10, cumulativeRisk: 0.05 },
    ];
    const bins = makeTimingDensityBins(points, { binCount: 30 });
    const expectedWidth = (10 - start) / 30;

    assert.equal(bins.length, 30);
    assert.equal(bins[0].startTime, start);
    assert.equal(bins.at(-1)!.endTime, 10);
    assert.ok(
      bins.every(
        (bin) => Math.abs(bin.endTime - bin.startTime - expectedWidth) < 1e-12,
      ),
    );
    const area = bins.reduce(
      (sum, bin) => sum + (bin.endTime - bin.startTime) * bin.density,
      0,
    );
    assert.ok(Math.abs(area - 0.05) < 1e-15);
  }
});
