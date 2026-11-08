#!/usr/bin/env node

/**
 * Convert the research project's Destatis CSV exports into compact wide CSVs.
 *
 * Usage:
 *   node scripts/preprocess-cohort-tables.mjs [--source-dir PATH] [--check]
 *
 * By default the source is the sibling research project's cohort-data folder.
 * `--check` verifies existing outputs byte-for-byte without writing anything.
 * Generation creates missing files and refuses to replace differing files.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDir, "..");
const defaultSourceDir = path.resolve(
  websiteRoot,
  "../gompertz-pension-funding/code/resources/kohortensterbetafeln_1926_2026",
);
const outputDir = path.join(websiteRoot, "public/data/mortality");
const sourceFiles = [
  { number: "01", sex: "male", sourceSex: "maennlich", scenario: "low", variant: "V1 (niedrig)" },
  { number: "02", sex: "female", sourceSex: "weiblich", scenario: "low", variant: "V1 (niedrig)" },
  { number: "03", sex: "male", sourceSex: "maennlich", scenario: "medium", variant: "V2 (mittel)" },
  { number: "04", sex: "female", sourceSex: "weiblich", scenario: "medium", variant: "V2 (mittel)" },
  { number: "05", sex: "male", sourceSex: "maennlich", scenario: "high", variant: "V3 (hoch)" },
  { number: "06", sex: "female", sourceSex: "weiblich", scenario: "high", variant: "V3 (hoch)" },
];
const expectedHeader = ["Statistik", "Geburtsjahrgang", "Geschlecht", "Variante", "Alter", "qx"];

/** SHA-256 identifies the exact input and output bytes without publishing source paths. */
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Transform one semicolon-delimited source into cohort rows with one age column
 * per annual probability. Values are converted from decimal commas to decimal
 * points as text, so no rounding or numerical fitting occurs.
 *
 * The optional range is exposed for small synthetic tests; production uses
 * cohorts 1926–2026 and attained ages 0–99. Exactly one open 100+ row per
 * cohort must exist and is excluded, matching the MATLAB reader.
 */
export function convertCohortTable(source, spec, range = { firstYear: 1926, lastYear: 2026, maxAge: 99 }) {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const header = lines.shift()?.split(";").map((field) => field.trim());
  if (!header || header.length !== expectedHeader.length || header.some((field, i) => field !== expectedHeader[i])) {
    throw new Error("Unexpected source CSV header.");
  }
  if (!Number.isInteger(range.firstYear) || !Number.isInteger(range.lastYear) || !Number.isInteger(range.maxAge) || range.firstYear > range.lastYear || range.maxAge < 0 || range.maxAge > 99) {
    throw new Error("Invalid cohort or age range.");
  }

  const cohorts = new Map();
  for (let year = range.firstYear; year <= range.lastYear; year += 1) {
    cohorts.set(year, { values: Array(range.maxAge + 1).fill(null), terminal: false });
  }
  for (const [index, line] of lines.entries()) {
    const fields = line.split(";").map((field) => field.trim());
    if (fields.length !== 6) throw new Error(`Line ${index + 2}: expected six fields.`);
    const [statistic, cohortText, sex, variant, ageText, probabilityText] = fields;
    if (statistic !== "Kohortensterbetafel" || sex !== spec.sourceSex || variant !== spec.variant) {
      throw new Error(`Line ${index + 2}: unexpected statistic, sex, or variant.`);
    }
    if (!/^\d{4}$/.test(cohortText)) throw new Error(`Line ${index + 2}: invalid cohort.`);
    const cohort = cohorts.get(Number(cohortText));
    if (!cohort) throw new Error(`Line ${index + 2}: cohort outside the expected range.`);
    if (!/^\d+(?:,\d+)?$/.test(probabilityText)) throw new Error(`Line ${index + 2}: invalid probability.`);
    const probability = Number(probabilityText.replace(",", "."));
    if (!Number.isFinite(probability)) throw new Error(`Line ${index + 2}: non-finite probability.`);
    if (ageText === "100 und mehr") {
      if (cohort.terminal || probability !== 1) throw new Error(`Line ${index + 2}: invalid or duplicate open terminal row.`);
      cohort.terminal = true;
      continue;
    }
    if (!/^\d+$/.test(ageText)) throw new Error(`Line ${index + 2}: invalid age.`);
    const age = Number(ageText);
    if (age > range.maxAge || probability < 0 || probability >= 1) throw new Error(`Line ${index + 2}: age or annual probability outside the expected range.`);
    if (cohort.values[age] !== null) throw new Error(`Line ${index + 2}: duplicate cohort/age.`);
    cohort.values[age] = probabilityText.replace(",", ".");
  }

  const rows = [["birth_year", ...Array.from({ length: range.maxAge + 1 }, (_, age) => `age_${age}`)].join(",")];
  for (const [year, cohort] of cohorts) {
    if (!cohort.terminal || cohort.values.some((value) => value === null)) {
      throw new Error(`Cohort ${year} is incomplete or missing its terminal row.`);
    }
    rows.push([year, ...cohort.values].join(","));
  }
  return `${rows.join("\n")}\n`;
}

/** Parse only the documented flags; fail rather than ignore a typo. */
function parseArguments(args) {
  let sourceDir = defaultSourceDir;
  let check = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--check") check = true;
    else if (args[i] === "--source-dir" && args[i + 1] && !args[i + 1].startsWith("--")) sourceDir = path.resolve(args[++i]);
    else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  return { sourceDir, check };
}

function main() {
  const { sourceDir, check } = parseArguments(process.argv.slice(2));
  // Validate all six inputs and construct all outputs in memory before writing.
  const outputs = sourceFiles.map((spec) => {
    const sourceName = `csv-12621-b${spec.number}-Table 1.csv`;
    const bytes = readFileSync(path.join(sourceDir, sourceName));
    const csv = convertCohortTable(bytes.toString("utf8"), spec);
    return {
      sourceName,
      sourceSha256: sha256(bytes),
      outputName: `cohort_table_1926_2026_${spec.sex}_${spec.scenario}.csv`,
      outputSha256: sha256(csv),
      sex: spec.sex,
      scenario: spec.scenario,
      variant: spec.variant,
      csv,
    };
  });
  const manifest = {
    schemaVersion: 1,
    source: "Destatis cohort life tables, local 1926–2026 source snapshot",
    sourcePage: "https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Sterbefaelle-Lebenserwartung/kohortensterbetafeln.html",
    firstBirthYear: 1926,
    lastBirthYear: 2026,
    firstAge: 0,
    lastAge: 99,
    files: outputs.map(({ csv, ...metadata }) => metadata),
  };
  const files = [
    ...outputs.map(({ outputName, csv }) => ({ name: outputName, content: csv })),
    { name: "manifest.json", content: `${JSON.stringify(manifest, null, 2)}\n` },
  ];

  // Never overwrite a changed file. Check every target before creating any.
  for (const file of files) {
    const target = path.join(outputDir, file.name);
    if (!existsSync(target)) {
      if (check) throw new Error(`Missing output: ${target}`);
    } else if (readFileSync(target, "utf8") !== file.content) {
      throw new Error(`Output differs; refusing to overwrite: ${target}`);
    }
  }
  if (!check) {
    mkdirSync(outputDir, { recursive: true });
    for (const file of files) {
      const target = path.join(outputDir, file.name);
      if (!existsSync(target)) writeFileSync(target, file.content, { encoding: "utf8", flag: "wx" });
    }
  }
  console.log(`${check ? "Verified" : "Prepared"} ${outputs.length} cohort tables: 101 cohorts × 100 ages each.`);
  console.log(`Output: ${outputDir}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`Cohort preprocessing failed: ${error.message}`);
    process.exitCode = 1;
  }
}
