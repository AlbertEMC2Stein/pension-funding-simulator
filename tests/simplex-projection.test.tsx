import assert from "node:assert/strict";
import { test } from "node:test";
import { projectCovarianceSimplex } from "../src/lib/model/analytical/simplex-projection";

test("projection uses the covariance metric rather than Euclidean distance", () => {
  const result = projectCovarianceSimplex({
    allocation: [0.8, 0.8],
    covariance: [
      [4, 0],
      [0, 1],
    ],
  });

  assert.ok(Math.abs(result[0] - 0.68) < 1e-9);
  assert.ok(Math.abs(result[1] - 0.32) < 1e-9);
});

test("projection satisfies optimality conditions for up to ten assets", () => {
  for (const size of [1, 2, 5, 10]) {
    const covariance = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => (i === j ? 1 + i / 10 : 0.12)),
    );

    for (let sample = 0; sample < 30; sample += 1) {
      const allocation = Array.from(
        { length: size },
        (_, i) => 2 * Math.sin((sample + 1) * (i + 1)),
      );
      const projected = projectCovarianceSimplex({ allocation, covariance });
      const sum = projected.reduce((total, value) => total + value, 0);
      const gradient = covariance.map((row) =>
        row.reduce(
          (total, value, j) => total + value * (projected[j] - allocation[j]),
          0,
        ),
      );
      const free = projected.findIndex((value) => value > 1e-8);
      const multiplier = sum > 1 - 1e-8 && free >= 0 ? -gradient[free] : 0;

      assert.ok(sum <= 1 + 1e-8);
      assert.ok(multiplier >= -1e-8);

      projected.forEach((value, i) => {
        assert.ok(value >= -1e-8);
        const reduced = gradient[i] + multiplier;
        assert.ok(value > 1e-8 ? Math.abs(reduced) < 1e-8 : reduced >= -1e-8);
      });
    }
  }
});
