import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ImportedMarketDiagnostics } from "../src/components/setup/ImportedMarketDiagnostics";
import { estimateHistoricalMarket } from "../src/lib/historical-market";

test("imported diagnostics show estimates, coverage and explicitly uncalculated intervals", () => {
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
  assert.match(current, /Current/);
  assert.match(current, /16\.89%/);
  assert.match(
    current,
    /Confidence intervals and half-widths are not calculated yet/,
  );
  assert.match(current, /Pairwise coverage &amp; covariance uncertainty/);
  const stale = renderToStaticMarkup(
    <ImportedMarketDiagnostics
      name="sample.csv"
      estimate={estimate}
      current={false}
    />,
  );
  assert.match(stale, /Needs updating/);
  assert.match(stale, /previous import/);
});
