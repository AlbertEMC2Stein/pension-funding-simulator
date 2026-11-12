import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateImpoverishmentForecast,
  type ForecastMortality,
} from "../src/lib/model/simulation/impoverishment-forecast";
import { estimateMortalityRisk } from "../src/lib/model/simulation/risk-estimate";
import {
  compactifiedExponentialSurvival,
  gompertzMakehamSurvival,
} from "../src/lib/mortality/mortality-models";

const gm = { alpha: 0.01, beta: 0.1, lambda: 0.02 };
const ce = { tau: 10, p: 2, kappa: 0.05, lambda: 0.1 };

test("forecast accumulates weighted hits once at their actual times", () => {
  const hits = new Float32Array([3, -1, 1, 1, 0, -1]);
  const original = Array.from(hits);
  const result = calculateImpoverishmentForecast({
    firstHitTimes: hits,
    horizonYears: 5,
    mortality: { model: "gm", parameters: gm },
  });
  const s1 = gompertzMakehamSurvival(1, gm);
  const s3 = gompertzMakehamSurvival(3, gm);

  assert.deepEqual(
    result.points.map((point) => point.timeYears),
    [0, 1, 3, 5],
  );
  assert.ok(Math.abs(result.points[0].cumulativeRisk - 1 / 6) < 1e-15);
  assert.ok(
    Math.abs(result.points[1].cumulativeRisk - (1 + 2 * s1) / 6) < 1e-15,
  );
  assert.ok(
    Math.abs(result.points[2].cumulativeRisk - (1 + 2 * s1 + s3) / 6) < 1e-15,
  );
  assert.equal(
    result.points[3].cumulativeRisk,
    result.points[2].cumulativeRisk,
  );
  assert.deepEqual(Array.from(hits), original);
});

test("forecast endpoints agree with the existing GM and CE risk estimates", () => {
  const hits = new Float32Array([-1, 0.5, 4, 4, 9, -1]);
  const reference = estimateMortalityRisk({
    firstHitTimes: hits,
    gm,
    ce,
    horizonYears: 10,
    ceBenchmark: 0.05,
  });
  const laws: ForecastMortality[] = [
    { model: "gm", parameters: gm },
    { model: "ce", parameters: ce },
  ];

  for (const mortality of laws) {
    const result = calculateImpoverishmentForecast({
      firstHitTimes: hits,
      horizonYears: 10,
      mortality,
    });
    assert.ok(
      Math.abs(
        result.points.at(-1)!.cumulativeRisk -
          reference[mortality.model].estimate,
      ) < 1e-15,
    );
    assert.ok(
      result.points.every(
        (point, i) =>
          i === 0 ||
          point.cumulativeRisk >= result.points[i - 1].cumulativeRisk,
      ),
    );
  }

  assert.ok(compactifiedExponentialSurvival(10, ce) === 0);
});

test("no hits produce a zero curve and endpoint roundoff stays inside the horizon", () => {
  const empty = calculateImpoverishmentForecast({
    firstHitTimes: [-1, -1],
    horizonYears: 4,
    mortality: { model: "gm", parameters: gm },
  });
  assert.deepEqual(empty.points, [
    { timeYears: 0, cumulativeRisk: 0 },
    { timeYears: 4, cumulativeRisk: 0 },
  ]);

  const horizon = 0.1;
  const rounded = new Float32Array([horizon]);
  assert.ok(rounded[0] > horizon);
  const result = calculateImpoverishmentForecast({
    firstHitTimes: rounded,
    horizonYears: horizon,
    mortality: { model: "gm", parameters: gm },
  });
  assert.equal(result.points.at(-1)!.timeYears, horizon);
  assert.equal(
    result.points.at(-1)!.cumulativeRisk,
    gompertzMakehamSurvival(rounded[0], gm),
  );
});
