import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftContext } from "../src/components/common";
import { Evaluation } from "../src/components/evaluation/Evaluation";
import { Setup } from "../src/components/setup/Setup";
import { DataView } from "../src/components/DataView";
import { HelpView } from "../src/components/HelpView";
import { SimulationDraftProvider } from "../src/components/SimulationDraftContext";

const actions = { navigate: () => {}, notice: () => {} };

test("evaluation renders illustrative results and the main controls", () => {
  const html = renderToStaticMarkup(
    <DraftContext.Provider value={actions}>
      <SimulationDraftProvider>
        <Evaluation />
      </SimulationDraftProvider>
    </DraftContext.Provider>,
  );
  assert.match(html, /Run simulation/);
  assert.match(html, /Gompertz–Makeham/);
  assert.match(html, /Borrowing exposure/);
  assert.match(html, /NOT CALCULATED/);
  assert.match(html, /YOUR SETUP/);
  assert.match(html, /Retirement age/);
  assert.match(html, /Starting capital/);
  assert.match(
    html.slice(html.indexOf("YOUR SETUP"), html.indexOf("Run simulation")),
    /Impoverishment level/,
  );
  assert.match(html, /Target risk/);
  assert.ok(html.indexOf("YOUR SETUP") < html.indexOf("Run simulation"));
  assert.match(html, /Edit setup/);
  assert.match(html, /id="evaluation-paths"/);
  assert.match(html, /id="evaluation-step"/);
  assert.match(html, /id="evaluation-batch-size"/);
  assert.doesNotMatch(html, />Policy comparison</);
});

test("setup and data views retain the requested design elements", () => {
  const setup = renderToStaticMarkup(
    <DraftContext.Provider value={actions}>
      <SimulationDraftProvider>
        <Setup />
      </SimulationDraftProvider>
    </DraftContext.Provider>,
  );
  const data = renderToStaticMarkup(
    <DraftContext.Provider value={actions}>
      <SimulationDraftProvider>
        <DataView />
      </SimulationDraftProvider>
    </DraftContext.Provider>,
  );
  assert.doesNotMatch(setup, /Estimation uncertainty/);
  assert.doesNotMatch(setup, /Recalibrated market scenarios/);
  assert.match(setup, /Custom mixture/);
  assert.match(setup, /compatible CE fit depends on market assumptions/);
  assert.match(
    setup,
    /Market assumptions can affect the fitted mortality model/,
  );
  assert.match(setup, /cohort data themselves do not change/i);
  assert.match(setup, /Import setup/);
  assert.match(setup, /Export setup/);
  assert.match(data, /Comparison table/);
  assert.match(data, /Simulation settings/);
  assert.match(data, /shared with Evaluation/);
  assert.match(data, /id="table-paths"/);
  assert.match(data, /id="table-step"/);
  assert.match(data, /id="table-batch-size"/);
  assert.match(data, /Withdrawal, risk &amp; policy/);
  assert.match(data, /CALCULATED CE VALUE/);
  assert.match(data, /ESTIMATED GM RISK/);
  assert.match(data, /GM STATUS/);
  assert.match(data, /Policy for variation 1/);
  assert.doesNotMatch(data, /<option value="policy"/);
  assert.match(data, /Export table/);
  assert.match(data, /Import setup/);
  assert.match(data, /Export setup/);
  assert.match(data, /Export results/);
});

test("dictionary renders its examples and mathematical notation", () => {
  const html = renderToStaticMarkup(<HelpView selectedTerm={null} />);
  assert.match(html, /Safe boundary/);
  assert.match(html, /class="katex"/);
  for (const label of [
    "NOT CALCULATED",
    "NOT AVAILABLE",
    "RUNNING",
    "NEEDS UPDATING",
    "ERROR",
    "CANCELLED",
    "CALCULATED",
    "CHECK INPUTS",
    "VALID",
    "FAILED",
    "NOT PREPARED",
    "CURRENT",
  ]) {
    assert.ok(html.includes(label), `Missing status: ${label}`);
  }
});
