import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("calendar-time three-asset samples reproduce and share their observed prices", () => {
  const directory = new URL("../examples/market-data/", import.meta.url);
  const complete = readFileSync(
    new URL("three-asset-calendar-complete.csv", directory),
    "utf8",
  );
  const missing = readFileSync(
    new URL("three-asset-calendar-missing.csv", directory),
    "utf8",
  );
  const generator = new URL(
    "../scripts/generate-three-asset-market.mjs",
    import.meta.url,
  );
  assert.equal(
    execFileSync(process.execPath, [fileURLToPath(generator), "--complete"], {
      encoding: "utf8",
    }),
    complete,
  );
  assert.equal(
    execFileSync(process.execPath, [fileURLToPath(generator), "--missing"], {
      encoding: "utf8",
    }),
    missing,
  );
  const completeRows = complete
    .trimEnd()
    .split("\n")
    .map((line) => line.split(","));
  const missingRows = missing
    .trimEnd()
    .split("\n")
    .map((line) => line.split(","));
  assert.equal(completeRows.length, 2610);
  assert.deepEqual(completeRows[0], [
    "date",
    "Synthetic Global Equity",
    "Synthetic Government Bonds",
    "Synthetic Small-Cap Equity",
  ]);
  assert.deepEqual(completeRows[1], [
    "2016-01-01",
    "450.000000",
    "200.000000",
    "75.000000",
  ]);
  assert.deepEqual(missingRows[1], completeRows[1]);
  assert.deepEqual(missingRows.at(-1), completeRows.at(-1));
  assert.equal(completeRows.at(-1)[0], "2025-12-31");
  let missingCount = 0;
  for (let i = 1; i < completeRows.length; i += 1) {
    const full = completeRows[i];
    const partial = missingRows[i];
    assert.equal(full.length, 4);
    assert.equal(partial.length, 4);
    assert.equal(full[0], partial[0]);
    assert.ok(new Date(`${full[0]}T00:00:00Z`).getUTCDay() % 6 !== 0);
    for (let j = 1; j < 4; j += 1) {
      assert.ok(Number(full[j]) > 0);
      if (partial[j] === "") missingCount += 1;
      else assert.equal(partial[j], full[j]);
    }
  }
  assert.equal(missingCount, 255);
});
