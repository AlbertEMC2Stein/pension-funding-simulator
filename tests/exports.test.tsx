import assert from "node:assert/strict";
import { test } from "node:test";
import { makeCsv } from "../src/lib/export/csv";
import { chartTracesCsv } from "../src/components/ChartExport";
import { comparisonTableCsv } from "../src/lib/export/comparison-table";
import { createResultsExport } from "../src/lib/export/results";
import { initialSimulationDraft } from "../src/lib/options/simulation-options";
import { initialSetupTables } from "../src/lib/options/setup-file";
import {
  comparisonRowSignature,
  comparisonSetupSignature,
} from "../src/components/comparison/comparison-run";
import type { ComparisonRun } from "../src/components/comparison/useComparisonSimulation";

test("CSV quotes text and protects spreadsheet formulas without changing numerical negatives", () => {
  assert.equal(
    makeCsv([
      ["name", "value"],
      ["=1+1", -3],
      ['A, "B"', 0.5],
    ]),
    'name,value\r\n\'=1+1,-3\r\n"A, ""B""",0.5\r\n',
  );
});

test("chart CSV preserves displayed series, units, selected view and bar widths", () => {
  const csv = chartTracesCsv(
    [
      { name: "Simulation", x: [70.5, 71.5], y: [0.01, 0.02], width: [1, 1] },
      { name: "Selected age", x: [71], y: [0.015] },
    ],
    {
      title: "Timing",
      xUnit: "years",
      yUnit: "probability per year",
      view: "conditional",
    },
  );
  assert.match(
    csv,
    /Timing,conditional,Simulation,1,70\.5,years,0\.01,probability per year,1/,
  );
  assert.match(
    csv,
    /Timing,conditional,Selected age,1,71,years,0\.015,probability per year,/,
  );
});

test("table and results exports identify stale rows and preserve captured settings", () => {
  const draft = initialSimulationDraft();
  const fits = { gm: null, ce: null };
  const tables = initialSetupTables(draft.investor.impoverishmentLevel);
  const original = tables.withdrawal[0];
  const signature = comparisonSetupSignature(draft, fits);
  const capturedRow = {
    id: original.id,
    policy: original.policy,
    rowSignature: comparisonRowSignature(original),
    status: "calculated" as const,
    gm: {
      estimate: 0.052,
      standardError: 0.001,
      interval95: { lower: 0.05, upper: 0.054 },
    },
  };
  const run: ComparisonRun = {
    signature,
    rows: [capturedRow],
    running: false,
    cancelling: false,
  };
  const changed = { ...original, value: "7" };
  tables.withdrawal = [changed];
  const csv = comparisonTableCsv({
    kind: "withdrawal",
    rows: [changed],
    run,
    sharedStale: false,
    currentSetup: signature,
    withdrawalContext: { available: false, message: "No fit" },
    unavailable: false,
  });
  assert.match(csv, /needs updating/);
  assert.match(csv, /0\.052,0\.001,0\.05,0\.054/);
  assert.match(csv, /""value"":""5\.0""/);

  const result = createResultsExport({
    name: "Example",
    draft,
    fits,
    tables,
    evaluation: null,
    withdrawal: run,
    feasibility: null,
    exportedAt: "2026-01-01T00:00:00Z",
  });
  assert.equal(result.tables.withdrawal?.rows[0].stale, true);
  assert.equal(result.tables.withdrawal?.rows[0].capturedRow.value, "5.0");
  assert.equal(result.tables.withdrawal?.rows[0].gm?.estimate, 0.052);
  assert.deepEqual(
    result.tables.withdrawal?.capturedSetup,
    JSON.parse(signature),
  );

  tables.withdrawal = [];
  const afterDeletion = createResultsExport({
    name: "Example",
    draft,
    fits,
    tables,
    evaluation: null,
    withdrawal: run,
    feasibility: null,
    exportedAt: "2026-01-01T00:00:00Z",
  });
  assert.equal(afterDeletion.tables.withdrawal, null);
});
