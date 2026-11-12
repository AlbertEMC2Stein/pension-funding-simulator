import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TimingCard } from "../src/components/evaluation/TimingCard";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";
import type { EvaluationRun } from "../src/components/evaluation/useEvaluationRun";

/** Create a completed run with distinct policy hit times for the timing card. */
function sampleRun(): EvaluationRun {
  const options = buildSimulationOptions(initialSimulationDraft());
  assert.ok(options.ok);

  return {
    signature: "captured",
    phase: "complete",
    options: options.options,
    numerical: {
      seed: "test",
      horizonYears: 10,
      batchSize: 3,
      recordTrajectories: false,
    },
    timing: {
      gm: { alpha: 0.01, beta: 0.1, lambda: 0.02 },
      firstHitTimes: new Float32Array([-1, 1, 2]),
      projectedFirstHitTimes: new Float32Array([-1, -1, 2]),
    },
  };
}

test("timing card presents captured GM forecast and age control", () => {
  const html = renderToStaticMarkup(
    <TimingCard run={sampleRun()} stale={false} projected={false} />,
  );

  assert.match(html, /UNCONSTRAINED POLICY/);
  assert.match(html, /GM MORTALITY/);
  assert.match(html, /Forecast remaining impoverishment risk by attained age/);
  assert.match(html, /Selected age/);
  assert.match(html, /assessed at retirement/);
  assert.match(html, /Density view is not available yet/);
  assert.match(html, /GM mortality may extend beyond this horizon/);
});

test("timing card labels projected and stale results without silently substituting paths", () => {
  const run = sampleRun();
  const projected = renderToStaticMarkup(
    <TimingCard run={run} stale projected />,
  );
  assert.match(projected, /PROJECTED POLICY/);
  assert.match(projected, /NEEDS UPDATING/);
  assert.match(projected, /earlier settings/);

  const unpaired = {
    ...run,
    timing: { ...run.timing!, projectedFirstHitTimes: undefined },
  };
  const missing = renderToStaticMarkup(
    <TimingCard run={unpaired} stale projected />,
  );
  assert.match(missing, /Run a projected-policy simulation/);
  assert.doesNotMatch(
    missing,
    /Forecast remaining impoverishment risk by attained age/,
  );
});

test("timing card remains a prompt until a run is available", () => {
  const html = renderToStaticMarkup(
    <TimingCard run={null} stale={false} projected={false} />,
  );
  assert.match(html, /Run a simulation to see this chart/);
  assert.match(html, /NOT CALCULATED/);
});
