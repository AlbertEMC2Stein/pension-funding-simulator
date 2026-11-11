import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftContext } from "../src/components/common";
import { CapitalCard } from "../src/components/evaluation/Evaluation";
import { makeChartData } from "../src/components/evaluation/RiskWithdrawalChart";
import { calculateCapitalComparison } from "../src/components/evaluation/capital-comparison";
import type { CompatiblePolicyInputs } from "../src/lib/model/analytical/compatible-policy";

const rate = Math.LN2 / 10;
const model: CompatiblePolicyInputs = {
  market: { realRiskFreeRate: rate, rho: 0.01, mertonDirection: [0.5, 0.5] },
  mortality: { tau: 10, p: 2, kappa: rate, lambda: 2 * (2 * rate - 0.01) },
  impoverishmentLevel: 100000,
};

test("capital sensitivity holds withdrawal fixed and compares with starting capital", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const result = calculateCapitalComparison({ model, data }, false);
  assert.ok("rows" in result);

  assert.ok(Math.abs(result.safeCapital - 200000) < 1e-8);
  assert.equal(result.rows[1].capital, 150000);
  assert.equal(result.rows[1].difference, 0);
  assert.ok(result.rows[0].difference! > 0);
  assert.ok(result.rows[2].difference! < 0);
});

test("zero risk compares the risk-free minimum with 1% and 5% targets", () => {
  const data = makeChartData(model, 150000, {
    mode: "customAmount",
    amount: 150000 * rate,
  });
  const result = calculateCapitalComparison({ model, data }, false);
  assert.ok("rows" in result);

  assert.equal(result.zeroRisk, true);
  assert.deepEqual(
    result.rows.map((row) => row.risk),
    [0, 0.01, 0.05],
  );
  assert.ok(Math.abs(result.rows[0].capital! - 125000) < 1e-8);
  assert.ok(result.rows[0].difference! < 0);
  assert.ok(result.rows[1].capital! < result.rows[0].capital!);
  assert.ok(result.rows[2].capital! < result.rows[1].capital!);
  const html = renderToStaticMarkup(
    <DraftContext.Provider value={{ navigate: () => {}, notice: () => {} }}>
      <CapitalCard comparison={result} />
    </DraftContext.Provider>,
  );
  assert.equal((html.match(/<tr/g) ?? []).length, 4);
  assert.equal((html.match(/Comparison <span>\(1\.00%\)/g) ?? []).length, 1);
  assert.equal((html.match(/Comparison <span>\(5\.00%\)/g) ?? []).length, 1);
  assert.match(
    (calculateCapitalComparison({ model, data }, true) as { message: string })
      .message,
    /unconstrained/,
  );
});

test("withdrawals at or below interest on the threshold remain explicitly unsupported", () => {
  const data = makeChartData(model, 150000, {
    mode: "customAmount",
    amount: 0,
  });
  const result = calculateCapitalComparison({ model, data }, false);

  assert.ok("message" in result);
  assert.match(result.message, /interest on the impoverishment level/);
});

test("risk variations outside the probability range remain unavailable", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.96 });
  const result = calculateCapitalComparison({ model, data }, false);
  assert.ok("rows" in result);

  assert.equal(result.rows[2].capital, null);
  assert.equal(result.rows[2].difference, null);
});
