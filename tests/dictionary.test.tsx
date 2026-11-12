import assert from "node:assert/strict";
import { test } from "node:test";
import katex from "katex";
import { dictionaryEntries } from "../src/lib/help/dictionary";
import { TermLink } from "../src/components/common";
import { renderWithDictionary } from "./dictionary-render";

test("dictionary IDs are unique and mathematical expressions render", () => {
  const ids = dictionaryEntries.map((entry) => entry.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("gm-risk"));
  assert.ok(ids.includes("global-feasibility"));

  for (const entry of dictionaryEntries) {
    if ("equation" in entry) {
      assert.doesNotThrow(
        () => katex.renderToString(entry.equation, { throwOnError: true }),
        entry.id,
      );
    }
  }
});

test("term links expose a descriptive accessible name", () => {
  const html = renderWithDictionary(
    <TermLink term="safe-boundary">safe level</TermLink>,
  );

  assert.match(html, /aria-label="Learn about Safe boundary"/);
  assert.match(html, />safe level<\/button>/);
});
