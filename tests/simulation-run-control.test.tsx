import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SimulationRunControl } from "../src/components/evaluation/SimulationRunControl";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";
import type { EvaluationRun } from "../src/components/evaluation/useEvaluationRun";

/** Build an evaluation run whose captured values can be checked in the summary. */
function exampleRun(): EvaluationRun {
  const options = buildSimulationOptions(initialSimulationDraft());
  assert.ok(options.ok);

  return {
    signature: "captured",
    phase: "complete",
    options: options.options,
    numerical: {
      seed: "test",
      horizonYears: 10,
      batchSize: 100,
      recordTrajectories: false,
    },
  };
}

/** Render the shared run control without invoking its callbacks. */
function render(run: EvaluationRun | null): string {
  return renderToStaticMarkup(
    <SimulationRunControl
      run={run}
      errors={[]}
      settingsOpen
      onToggleSettings={() => {}}
      onStart={() => {}}
      onCancel={() => {}}
    />,
  );
}

test("run control offers a single run button before a simulation", () => {
  const html = render(null);
  assert.match(html, /Run simulation/);
  assert.match(html, /Simulation settings/);
  assert.match(html, /aria-expanded="true"/);
  assert.doesNotMatch(
    html,
    /Cancel simulation|Settings used for the completed run/,
  );
});

test("running control replaces run with cancel and displays batch progress and ETA", () => {
  const run: EvaluationRun = {
    ...exampleRun(),
    phase: "running",
    batchElapsedMs: 4000,
    progress: {
      completedPaths: 200,
      totalPaths: 1000,
      completedBatches: 2,
      totalBatches: 10,
    },
  };
  const html = render(run);

  assert.match(html, /Cancel simulation/);
  assert.doesNotMatch(html, /Run simulation/);
  assert.match(html, /<progress[^>]*value="200"/);
  assert.match(html, /200 \/ 1,000 paths/);
  assert.match(html, /About 16 s remaining/);
  assert.doesNotMatch(html, /Settings used for the completed run/);
});

test("finished control offers a new run without progress", () => {
  const html = render(exampleRun());
  assert.match(html, /Run simulation/);
  assert.doesNotMatch(html, /<progress/);
});

test("cancelling control reports that the current batch must finish", () => {
  const html = render({ ...exampleRun(), phase: "cancelling" });
  assert.match(html, /Stopping after the current batch/);
  assert.match(html, /disabled=""/);
});
