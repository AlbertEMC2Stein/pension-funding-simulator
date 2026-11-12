import assert from "node:assert/strict";
import { test } from "node:test";
import { renderWithDictionary as renderToStaticMarkup } from "./dictionary-render";
import { MarketValidation } from "../src/components/setup/MarketValidation";
import { MarketAssumptionChecks } from "../src/components/setup/MarketAssumptionChecks";
import { initialMarketCalibration } from "../src/lib/market/market-calibration";

test("market checks report validated inputs without claiming mortality conditions", () => {
  const html = renderToStaticMarkup(
    <MarketAssumptionChecks market={initialMarketCalibration()} />,
  );
  assert.match(html, /data-status="feasible"/);
  assert.match(html, /covariance matrix<\/button> is positive definite/);
  assert.match(
    html,
    /Mortality fit and policy-specific conditions are checked separately/,
  );
});

test("market checks identify the negative Merton asset and explain short selling", () => {
  const market = initialMarketCalibration();
  market.assets[0].nominalReturnPercent = "-5.75";
  const html = renderToStaticMarkup(<MarketAssumptionChecks market={market} />);
  assert.match(html, /data-status="negative-merton"/);
  assert.match(html, /negative for Global equities/);
  assert.match(
    html,
    /requires short selling whenever wealth is below the safe boundary/,
  );
  assert.match(html, /Borrowing diagnostics are unavailable/);
});

test("invalid and singular markets leave the checks unavailable", () => {
  const market = initialMarketCalibration();
  market.correlations = [
    ["1", "1"],
    ["1", "1"],
  ];
  const html = renderToStaticMarkup(<MarketAssumptionChecks market={market} />);
  assert.match(html, /data-status="unavailable"/);
  assert.match(html, /Not available/);
  assert.doesNotMatch(html, /<span>Passed<\/span>/);
});

test("zero market premium is identified as outside the CE model", () => {
  const market = initialMarketCalibration();
  market.assets = [
    {
      id: 1,
      name: "Asset",
      nominalReturnPercent: "0",
      volatilityPercent: "25",
    },
  ];
  market.correlations = [["1"]];
  market.inflationPercent = "0";
  market.nominalRiskFreePercent = String(100 * Math.expm1(0.25 ** 2 / 2));
  const html = renderToStaticMarkup(<MarketAssumptionChecks market={market} />);
  assert.match(html, /risk premium is zero/);
  assert.match(html, /require ρ &gt; 0/);
});

test("market input validation uses the shared good and invalid status styles", () => {
  const market = initialMarketCalibration();
  const valid = renderToStaticMarkup(<MarketValidation market={market} />);
  assert.match(
    valid,
    /class="feasibility-status market-validation" data-status="feasible"/,
  );
  assert.match(valid, /Market input validation/);
  market.assets[0].volatilityPercent = "0";
  const invalid = renderToStaticMarkup(<MarketValidation market={market} />);
  assert.match(
    invalid,
    /class="feasibility-status market-validation" data-status="invalid"/,
  );
  assert.match(invalid, /positive annual volatility/);
});
