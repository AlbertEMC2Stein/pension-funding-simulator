import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FeasibilityControls } from "../src/components/evaluation/FeasibilityControls";
import { makeChartData } from "../src/components/evaluation/RiskWithdrawalChart";
import {
  evaluateGlobalFeasibility,
  feasibilityForCurrentMarket,
} from "../src/components/evaluation/global-feasibility";
import { initialMarketCalibration } from "../src/lib/market/market-calibration";
import { BorrowingCard } from "../src/components/evaluation/Evaluation";
import type { CompatiblePolicyInputs } from "../src/lib/model/analytical/compatible-policy";

const rate = Math.LN2 / 10;
const model: CompatiblePolicyInputs = {
  market: { realRiskFreeRate: rate, rho: 0.01, mertonDirection: [0, 1] },
  mortality: { tau: 10, p: 2, kappa: rate, lambda: 2 * (2 * rate - 0.01) },
  impoverishmentLevel: 100000,
};

test("global diagnostic accepts zero Merton components when another is positive", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const result = evaluateGlobalFeasibility({ model, data });

  assert.equal(result.status, "feasible");
  if ("zeta" in result) assert.ok(Math.abs(result.zeta - 1) < 1e-12);
});

test("global diagnostic separates short-selling and borrowing possibilities", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const negative = {
    ...model,
    market: { ...model.market, mertonDirection: [-0.1, 1] },
  };
  const borrowing = {
    ...model,
    market: { ...model.market, mertonDirection: [1, 1] },
  };

  assert.equal(
    evaluateGlobalFeasibility({ model: negative, data }).status,
    "negative-merton",
  );
  assert.equal(
    evaluateGlobalFeasibility({ model: borrowing, data }).status,
    "borrowing",
  );
  assert.equal(
    evaluateGlobalFeasibility({ message: "Fit needed" }).status,
    "unavailable",
  );
});

test("global diagnostic rejects an all-zero Merton vector", () => {
  const data = makeChartData(model, 150000, { mode: "targetRisk", risk: 0.25 });
  const zero = {
    ...model,
    market: { ...model.market, mertonDirection: [0, 0] },
  };

  assert.equal(
    evaluateGlobalFeasibility({ model: zero, data }).status,
    "unavailable",
  );
});

test("projected policy is shown feasible and its threshold action is disabled", () => {
  const html = renderToStaticMarkup(
    <FeasibilityControls
      projected
      custom={false}
      feasibility={{
        status: "borrowing",
        message: "Borrowing possible",
        zeta: 2,
      }}
      threshold={{ value: "100000.00", amount: 100000 }}
      onApply={() => {}}
    />,
  );

  assert.match(html, /data-status="feasible"/);
  assert.match(html, /globally feasible by construction/);
  assert.match(html, /projected allocation stays within the simplex/);
  assert.match(html, /disabled=""/);
  assert.match(html, /only applies to the unconstrained policy/);
});

test("unconstrained policy retains its diagnostic and enabled threshold action", () => {
  const html = renderToStaticMarkup(
    <FeasibilityControls
      projected={false}
      custom={false}
      feasibility={{
        status: "borrowing",
        message: "Borrowing possible",
        zeta: 2,
      }}
      threshold={{ value: "100000.00", amount: 100000 }}
      onApply={() => {}}
    />,
  );

  assert.match(html, /data-status="borrowing"/);
  assert.match(html, /Borrowing possible/);
  assert.doesNotMatch(html, /disabled=""/);
});

test("current negative Merton direction is detected even when mortality fit is stale", () => {
  const market = initialMarketCalibration();
  market.assets[0].nominalReturnPercent = "-5.75";
  const result = feasibilityForCurrentMarket(market, {
    status: "unavailable",
    message: "The CE mortality fit needs updating.",
  });

  assert.equal(result.status, "negative-merton");
  const html = renderToStaticMarkup(
    <BorrowingCard
      feasibility={result}
      projected={false}
      run={null}
      stale={true}
    />,
  );
  assert.match(html, /NOT AVAILABLE/);
  assert.match(html, /short selling/);
  assert.doesNotMatch(html, /0 years/);
});
