import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MortalityDataInfo } from "../src/components/setup/MortalityDataInfo";
import manifest from "../public/data/mortality/manifest.json";

test("mortality data information describes the packaged snapshot and links to its source", () => {
  const html = renderToStaticMarkup(<MortalityDataInfo />);
  assert.match(html, /About the data/);
  assert.ok(html.includes(manifest.sourcePage));
  assert.match(html, /1926–2026/);
  assert.match(html, /not updated automatically/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
