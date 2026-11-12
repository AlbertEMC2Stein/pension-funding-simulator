import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TrajectoryCard,
  trajectoryOpacity,
  trajectoryPlotPoints,
} from "../src/components/evaluation/TrajectoryCard";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";
import type { EvaluationRun } from "../src/components/evaluation/useEvaluationRun";
import type { TrajectorySamples } from "../src/lib/model/simulation/tensorflow/run-scheduler";

const sample: TrajectorySamples = {
  times: [0, 1, 2, 3],
  safeBoundary: [150, 140, 130, 120],
  values: new Float32Array([100, 90, 50, 50, 100, 120, 110, 130]),
  firstHitTimes: new Float32Array([1.5, -1]),
  count: 2,
  projected: false,
};

test("trajectory opacity decreases with the number displayed", () => {
  assert.equal(trajectoryOpacity(1), 0.75);
  assert.ok(trajectoryOpacity(20) < 0.2);
  assert.equal(trajectoryOpacity(150), 0.07);
});

test("displayed paths stop at the recorded bridge hit and retain no-hit endpoints", () => {
  assert.deepEqual(trajectoryPlotPoints(sample, 0, 50), {
    times: [0, 1, 1.5],
    wealth: [100, 90, 50],
  });
  assert.deepEqual(trajectoryPlotPoints(sample, 1, 50), {
    times: [0, 1, 2, 3],
    wealth: [100, 120, 110, 130],
  });
});

test("trajectory panel explains when recording requires a new run", () => {
  const html = renderToStaticMarkup(
    <TrajectoryCard run={null} stale={false} />,
  );
  assert.match(html, /Enable this visual before starting a simulation/);
  assert.match(html, /assume you remain alive/);
});

test("trajectory legend names the available visual elements", () => {
  const built = buildSimulationOptions(initialSimulationDraft());
  assert.ok(built.ok);
  const displaySample = {
    ...sample,
    safeBoundary: [150000, 140000, 130000, 120000],
  };
  const run = {
    signature: "test",
    phase: "complete",
    options: built.options,
    numerical: {
      seed: "test",
      horizonYears: 3,
      batchSize: 2,
      recordTrajectories: true,
    },
    trajectories: displaySample,
  } satisfies EvaluationRun;
  const html = renderToStaticMarkup(<TrajectoryCard run={run} stale={false} />);
  assert.match(html, /Sample paths/);
  assert.match(html, /Safe boundary/);
  assert.match(html, /Impoverishment level/);
});
