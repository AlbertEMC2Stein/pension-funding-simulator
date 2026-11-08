import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { convertCohortTable } from "../scripts/preprocess-cohort-tables.mjs";

const header = "Statistik;Geburtsjahrgang;Geschlecht;Variante;Alter ;qx";
const spec = { sourceSex: "maennlich", variant: "V1 (niedrig)" };
const range = { firstYear: 1926, lastYear: 1926, maxAge: 1 };
const rows = [
  "Kohortensterbetafel;1926;maennlich;V1 (niedrig);0;0,012300",
  "Kohortensterbetafel;1926;maennlich;V1 (niedrig);1;0,001",
  "Kohortensterbetafel;1926;maennlich;V1 (niedrig);100 und mehr;1",
];
const source = (lines) => [header, ...lines].join("\n");

test("cohort conversion retains decimal precision and excludes the open terminal row", () => {
  assert.equal(convertCohortTable(source(rows), spec, range), "birth_year,age_0,age_1\n1926,0.012300,0.001\n");
});

test("cohort conversion rejects missing, duplicated, and mismatched data", () => {
  assert.throws(() => convertCohortTable(source([rows[0], rows[2]]), spec, range), /incomplete/);
  assert.throws(() => convertCohortTable(source([...rows, rows[0]]), spec, range), /duplicate/);
  assert.throws(() => convertCohortTable(source(rows.slice(0, 2)), spec, range), /terminal/);
  assert.throws(() => convertCohortTable(source(rows), { ...spec, sourceSex: "weiblich" }, range), /unexpected/);
});

test("packaged cohort tables match their manifest and expected dimensions", () => {
  const directory = new URL("../public/data/mortality/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));
  assert.equal(manifest.files.length, 6);
  assert.equal(new Set(manifest.files.map((file) => `${file.sex}/${file.scenario}`)).size, 6);
  for (const file of manifest.files) {
    const content = readFileSync(new URL(file.outputName, directory), "utf8");
    assert.equal(createHash("sha256").update(content).digest("hex"), file.outputSha256);
    const lines = content.trimEnd().split("\n");
    assert.equal(lines.length, 102);
    assert.equal(lines[0], ["birth_year", ...Array.from({ length: 100 }, (_, age) => `age_${age}`)].join(","));
    for (const [index, line] of lines.slice(1).entries()) {
      const values = line.split(",");
      assert.equal(values.length, 101);
      assert.equal(Number(values[0]), 1926 + index);
      assert.ok(values.slice(1).every((value) => /^\d+(?:\.\d+)?$/.test(value) && Number(value) >= 0 && Number(value) < 1));
    }
  }
});
