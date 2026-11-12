import assert from "node:assert/strict";
import { test } from "node:test";
import { PanelHelp, type PanelHelpId } from "../src/components/PanelHelp";
import { renderWithDictionary } from "./dictionary-render";

/** Verify every panel has a labeled native dialog and related dictionary links. */
test("panel help dialogs have accessible titles and related terms", () => {
  const panels: PanelHelpId[] = [
    "withdrawal",
    "gm",
    "capital",
    "timing",
    "borrowing",
    "allocation",
    "mortality",
    "withdrawalTable",
    "feasibilityTable",
  ];

  for (const panel of panels) {
    const html = renderWithDictionary(<PanelHelp panel={panel} />);
    const titleId = html.match(/<dialog[^>]*aria-labelledby="([^"]+)"/)?.[1];

    assert.ok(titleId, `${panel}: dialog must have a label`);
    assert.ok(
      html.includes(`id="${titleId}"`),
      `${panel}: label must name its heading`,
    );
    assert.match(html, /aria-label="Close help"/);
    assert.match(html, /aria-label="Related dictionary entries"/);
  }
});
