import assert from "node:assert/strict";
import { test } from "node:test";
import { initialSimulationDraft } from "../src/lib/options/simulation-options";
import {
  initialSetupTables,
  parseSetupFile,
  SETUP_METADATA,
  type SetupFile,
} from "../src/lib/options/setup-file";

/** Build a representative input-only setup for import and export tests. */
function example(): SetupFile {
  const draft = initialSimulationDraft();
  const tables = initialSetupTables(draft.investor.impoverishmentLevel);
  tables.withdrawal[0].name = "My variation";
  draft.simulation.seed = "my seed";
  return {
    format: "pension-funding-setup",
    version: 1,
    metadata: { ...SETUP_METADATA },
    name: "My setup",
    draft,
    tables,
  };
}

test("setup JSON round-trips editable inputs and table configurations", () => {
  const file = example();
  file.tables.feasibility[0].impoverishmentLevel = "250,000";
  assert.deepEqual(parseSetupFile(JSON.stringify(file)), file);
});

test("invalid market, investor and row values are rejected before import", () => {
  const diagonal = example();
  diagonal.draft.market.correlations[0][0] = "-3";
  assert.throws(() => parseSetupFile(JSON.stringify(diagonal)), /diagonal.*1/i);

  const asymmetric = example();
  asymmetric.draft.market.correlations[0][1] = "0.3";
  assert.throws(() => parseSetupFile(JSON.stringify(asymmetric)), /symmetric/i);

  const singular = example();
  singular.draft.market.correlations[0][1] = "1";
  singular.draft.market.correlations[1][0] = "1";
  assert.throws(
    () => parseSetupFile(JSON.stringify(singular)),
    /positive definite/i,
  );

  const emptyRate = example();
  emptyRate.draft.market.assets[0].nominalReturnPercent = "";
  assert.throws(() => parseSetupFile(JSON.stringify(emptyRate)), /growth/i);

  const invalidInvestor = example();
  invalidInvestor.draft.investor.impoverishmentLevel =
    invalidInvestor.draft.investor.initialCapital;
  assert.throws(
    () => parseSetupFile(JSON.stringify(invalidInvestor)),
    /capital/i,
  );

  const invalidRow = example();
  invalidRow.tables.feasibility[0].impoverishmentLevel = "900,000";
  assert.throws(
    () => parseSetupFile(JSON.stringify(invalidRow)),
    /impoverishment level/i,
  );
});

test("invalid or unsupported files cannot be applied", () => {
  assert.throws(() => parseSetupFile("{"), /valid JSON/);
  const wrongVersion = { ...example(), version: 2 };
  assert.throws(
    () => parseSetupFile(JSON.stringify(wrongVersion)),
    /version 1/,
  );
  const invalid = example();
  invalid.draft.market.correlations = [["1"]];
  assert.throws(
    () => parseSetupFile(JSON.stringify(invalid)),
    /market|matrix/i,
  );
  const duplicate = example();
  duplicate.tables.withdrawal[1].id = duplicate.tables.withdrawal[0].id;
  assert.throws(() => parseSetupFile(JSON.stringify(duplicate)), /duplicate/);
  const badSeed = example();
  badSeed.draft.simulation.seed = " ";
  assert.throws(() => parseSetupFile(JSON.stringify(badSeed)), /simulation/);
});

test("unrecognized and result fields are stripped from imported setups", () => {
  const file = example();
  const extended = {
    ...file,
    results: { secret: 1 },
    draft: { ...file.draft, results: { gm: 0.5 } },
  };
  assert.deepEqual(parseSetupFile(JSON.stringify(extended)), file);
});
