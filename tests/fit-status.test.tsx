import assert from "node:assert/strict";
import { test } from "node:test";
import { ceFitStatus } from "../src/lib/mortality/fit-status";

test("CE fit status follows the captured inputs and current usable settings", () => {
  assert.equal(ceFitStatus(null, "current"), "not-fitted");
  assert.equal(ceFitStatus("a", "a"), "current");
  assert.equal(ceFitStatus("a", "b"), "needs-update");
  assert.equal(ceFitStatus("a", null), "needs-update");
  assert.equal(ceFitStatus("b", "b"), "current");
});
