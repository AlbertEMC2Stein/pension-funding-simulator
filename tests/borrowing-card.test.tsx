import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BorrowingCard } from "../src/components/evaluation/Evaluation";
import type { FeasibilityResult } from "../src/components/evaluation/global-feasibility";

/** Render the borrowing diagnostics for the current feasibility and policy. */
function renderCard(feasibility: FeasibilityResult, projected = false) {
  return renderToStaticMarkup(
    <BorrowingCard
      feasibility={feasibility}
      projected={projected}
      run={null}
      stale={false}
    />,
  );
}

test("global feasibility produces analytical borrowing zeros without a simulation", () => {
  const html = renderCard({ status: "feasible", zeta: 1, message: "Feasible" });
  assert.match(html, /CALCULATED/);
  assert.match(html, /<strong>0%<\/strong>/);
  assert.match(html, /<strong>0 years<\/strong>/);
  assert.match(html, /do not require a simulation/);
  assert.doesNotMatch(
    html,
    /probability of ever borrowing is not calculated yet/i,
  );
});

test("other diagnostics do not infer zeros and projection remains unavailable", () => {
  for (const feasibility of [
    { status: "borrowing", zeta: 1.1, message: "Borrowing possible" },
    { status: "unavailable", message: "No fit" },
  ] satisfies FeasibilityResult[]) {
    const html = renderCard(feasibility);
    assert.doesNotMatch(html, /<strong>0%<\/strong>|<strong>0 years<\/strong>/);
    assert.match(html, /probability of ever borrowing is not calculated yet/i);
  }

  const projected = renderCard(
    { status: "feasible", zeta: 0.5, message: "Feasible" },
    true,
  );
  assert.match(projected, /NOT AVAILABLE/);
  assert.doesNotMatch(projected, /<strong>0%<\/strong>/);
});

test("negative Merton components make borrowing diagnostics unavailable", () => {
  const html = renderCard({
    status: "negative-merton",
    message: "Negative component",
  });
  assert.match(html, /NOT AVAILABLE/);
  assert.match(html, /short selling/);
  assert.doesNotMatch(
    html,
    /Probability of ever borrowing|Expected time borrowing/,
  );
});
