import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialSimulationDraft,
  buildSimulationOptions,
} from "../src/lib/options/simulation-options";
import { makeDevelopmentDraft } from "../src/components/dev/development-draft";
import { captureTableInspection } from "../src/components/comparison/inspection";
import type { ComparisonRunRow } from "../src/components/comparison/comparison-run";
import type { RunConfigurationInput } from "../src/lib/model/simulation/run-configuration";

test("worker check numerical options are independent of Evaluation", () => {
  const draft = initialSimulationDraft();
  const original = structuredClone(draft);
  const check = makeDevelopmentDraft(draft, {
    paths: 1000,
    timeStep: "weekly",
    batchSize: 4096,
    seed: "check",
  });
  const options = buildSimulationOptions(check);

  assert.deepEqual(draft, original);
  assert.equal(check.simulation.timeStep, "weekly");
  assert.equal(check.simulation.batchSize, 4096);
  assert.equal(check.simulation.seed, "check");
  assert.equal(check.simulation.paths, 1000);
  assert.equal(check.simulation.projected, draft.simulation.projected);
  assert.equal(options.ok, true);
});

test("table inspector keeps captured inputs and identifies non-worker rows", () => {
  const input = { numerical: { seed: "original" } } as RunConfigurationInput;
  const common = { rowSignature: "row", policy: "Unconstrained" as const };
  const rows: ComparisonRunRow[] = [
    { ...common, id: 1, status: "queued", input },
    { ...common, id: 2, status: "calculated", analytical: true },
    { ...common, id: 3, status: "error", message: "Invalid value" },
    { ...common, id: 4, status: "calculated", input },
  ];
  const captured = captureTableInspection(
    [
      {
        id: 1,
        name: "First",
        type: "Target risk",
        value: "5",
        policy: "Unconstrained",
      },
    ],
    rows,
  );
  input.numerical.seed = "changed";

  assert.equal(captured[0].name, "First");
  assert.equal(captured[0].input?.numerical.seed, "original");
  assert.match(captured[1].outcome, /analytically/);
  assert.equal(captured[2].outcome, "Invalid value");
  assert.match(captured[3].outcome, /Reused/);
});
