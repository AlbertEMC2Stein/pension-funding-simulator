import assert from "node:assert/strict";
import { test } from "node:test";
import { renderWithDictionary as renderToStaticMarkup } from "./dictionary-render";
import type { EvaluationRun } from "../src/components/evaluation/useEvaluationRun";
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
      diagnostics={{ available: false }}
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

test("completed simulated borrowing displays its estimate and MC interval", () => {
  const run = {
    phase: "complete",
    borrowingProbability: {
      estimate: 0.125,
      standardError: 0.01,
      interval95: { lower: 0.105, upper: 0.145 },
    },
    borrowingOccupation: {
      estimateYears: 1.25,
      standardErrorYears: 0.1,
      interval95Years: { lower: 1.05, upper: 1.45 },
    },
  } as unknown as EvaluationRun;
  const html = renderToStaticMarkup(
    <BorrowingCard
      feasibility={{
        status: "borrowing",
        zeta: 2,
        message: "Borrowing possible",
      }}
      projected={false}
      run={run}
      stale={false}
      diagnostics={{ available: false }}
    />,
  );

  assert.match(html, /<strong>12\.50%<\/strong>/);
  assert.match(html, /10\.500% – 14\.500%/);
  assert.match(html, /does not condition on impoverishment/);
  assert.doesNotMatch(
    html,
    /probability of ever borrowing is not calculated yet/i,
  );
});

test("analytical borrowing diagnostics are displayed independently of simulation", () => {
  const html = renderToStaticMarkup(
    <BorrowingCard
      feasibility={{
        status: "borrowing",
        zeta: 2,
        message: "Borrowing possible",
      }}
      projected={false}
      run={null}
      stale={false}
      diagnostics={{
        available: true,
        borrowingAtRetirement: true,
        lastPossibleTimeYears: 5.85,
      }}
    />,
  );
  assert.match(html, /Borrowing at retirement<\/dt><dd>Yes/);
  assert.match(
    html,
    /Last possible borrowing time<\/dt><dd>5\.85 years after retirement/,
  );
  assert.match(html, /not a predicted borrowing time/);
});
