import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ImportedMarketDiagnostics } from "../src/components/setup/ImportedMarketDiagnostics";
import { estimateHistoricalMarket } from "../src/lib/historical-market";

test("imported diagnostics show coverage and confidence intervals without nested disclosures", () => {
  const csv = readFileSync(
    new URL(
      "../examples/market-data/three-asset-calendar-missing.csv",
      import.meta.url,
    ),
    "utf8",
  );
  const estimate = estimateHistoricalMarket(csv);
  const current = renderToStaticMarkup(
    <ImportedMarketDiagnostics name="sample.csv" estimate={estimate} current />,
  );
  assert.match(current, /Imported data &amp; estimation uncertainty/);
  assert.match(current, /Matches inputs/);
  assert.equal((current.match(/<details\b/g) ?? []).length, 1);
  assert.equal((current.match(/<table\b/g) ?? []).length, 2);
  assert.match(current, /95% interval for annual growth/);
  assert.match(current, /95% interval for volatility/);
  assert.match(current, /95% interval for correlation/);
  assert.equal((current.match(/Lower bound/g) ?? []).length, 3);
  assert.equal((current.match(/Upper bound/g) ?? []).length, 3);
  assert.ok(
    current.includes(
      (estimate.assets[0].growthInterval.lower * 100).toFixed(2),
    ),
  );
  assert.ok(
    current.includes(
      (estimate.assets[0].volatilityInterval.upper * 100).toFixed(2),
    ),
  );
  assert.ok(
    current.includes(estimate.pairs[0].correlationInterval!.lower.toFixed(2)),
  );
  assert.match(current, /Longest gap/);
  const stale = renderToStaticMarkup(
    <ImportedMarketDiagnostics
      name="sample.csv"
      estimate={estimate}
      current={false}
    />,
  );
  assert.match(stale, /Inputs changed/);
  assert.match(stale, /diagnostics describe the original CSV import/);
});
