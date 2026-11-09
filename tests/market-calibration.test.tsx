import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CorrelationMatrix } from "../src/components/setup/MarketEditor";
import {
  addAsset,
  correlationMatrixError,
  initialMarketCalibration,
  inflationRateError,
  isEditableDecimal,
  marketValidationErrors,
  MAX_ASSETS,
  removeAsset,
  nominalRiskFreeRateError,
  realRateFromNominal,
  updateMarketWithUndo,
  setCorrelation,
} from "../src/lib/market-calibration";

test("market fields accept decimal editing and reject letters and commas", () => {
  for (const value of ["", "-", ".", "-.", "1.2", "0.34", "-0.075", "12."])
    assert.equal(isEditableDecimal(value), true);
  for (const value of ["a3,1", "3,1", "1e3", "2-3", "1.2.3", " "])
    assert.equal(isEditableDecimal(value), false);
});

test("inflation validation identifies empty and out-of-range values", () => {
  assert.ok(inflationRateError(""));
  assert.ok(inflationRateError("-100"));
  assert.equal(inflationRateError("2.00"), null);
});

test("reset and undo preserve the complete prior market draft", () => {
  const initial = initialMarketCalibration();
  const manual = setCorrelation(addAsset(initial), 1, 0, "0.42");
  manual.assets[0].nominalReturnPercent = "8.10";
  const reset = updateMarketWithUndo(manual, null, { type: "reset" });
  assert.deepEqual(reset.market, initialMarketCalibration());
  assert.equal(reset.undo, manual);
  const restored = updateMarketWithUndo(reset.market, reset.undo, {
    type: "undo",
  });
  assert.equal(restored.market, manual);
  assert.equal(restored.market.assets.length, 3);
  assert.equal(restored.market.correlations[1][0], "0.42");
  assert.equal(restored.undo, null);
  const edited = updateMarketWithUndo(reset.market, reset.undo, {
    type: "edit",
    market: addAsset(reset.market),
  });
  assert.equal(edited.undo, null);
  assert.equal(
    updateMarketWithUndo(edited.market, edited.undo, { type: "undo" }).market,
    edited.market,
  );
});

test("the derived real risk-free rate must be strictly positive", () => {
  for (const value of ["0", "-0.5", "2", "", "not a number"])
    assert.ok(nominalRiskFreeRateError(value, "2"));
  assert.equal(nominalRiskFreeRateError("2.5", "2"), null);
  assert.equal(nominalRiskFreeRateError("0", "-1"), null);
  const market = initialMarketCalibration();
  market.nominalRiskFreePercent = "0";
  assert.ok(
    marketValidationErrors(market).some((error) =>
      /greater than 0%/.test(error),
    ),
  );
});

test("nominal rate converts using the exact compounded inflation relationship", () => {
  const market = initialMarketCalibration();
  const realRate = realRateFromNominal(
    market.nominalRiskFreePercent,
    market.inflationPercent,
  )!;
  assert.ok(Math.abs(realRate - Math.log(1.025 / 1.02)) < 1e-14);
  assert.ok(
    Math.abs(realRateFromNominal("2.5", "1")! - Math.log(1.025 / 1.01)) < 1e-14,
  );
  assert.equal(realRateFromNominal("2.5", "-100"), null);
});

test("initial correlation matrix uses the paper's correlation and is valid", () => {
  const market = initialMarketCalibration();
  assert.deepEqual(market.correlations, [
    ["1", "0.08"],
    ["0.08", "1"],
  ]);
  assert.deepEqual(marketValidationErrors(market), []);
});

test("correlation changes mirror and do not modify the diagonal", () => {
  const initial = initialMarketCalibration();
  const changed = setCorrelation(initial, 0, 1, "-0.35");
  assert.deepEqual(changed.correlations, [
    ["1", "-0.35"],
    ["-0.35", "1"],
  ]);
  assert.deepEqual(initial.correlations, [
    ["1", "0.08"],
    ["0.08", "1"],
  ]);
  assert.equal(setCorrelation(changed, 0, 0, "0"), changed);
});

test("the matrix renders editable lower entries and read-only mirrored upper entries", () => {
  const market = setCorrelation(initialMarketCalibration(), 1, 0, "0.35");
  const html = renderToStaticMarkup(
    <CorrelationMatrix market={market} onChange={() => {}} />,
  );
  assert.equal((html.match(/<input\b/g) || []).length, 1);
  assert.match(html, /Correlation of asset 2 with asset 1/);
  assert.match(html, /Mirrored correlation of asset 1 with asset 2: 0.35/);
  assert.equal((html.match(/fixed at 1/g) || []).length, 2);
});

test("adding and removing assets preserves the remaining correlations", () => {
  const initial = setCorrelation(initialMarketCalibration(), 0, 1, "0.4");
  const added = addAsset(initial);
  assert.deepEqual(added.correlations, [
    ["1", "0.4", "0"],
    ["0.4", "1", "0"],
    ["0", "0", "1"],
  ]);
  const removed = removeAsset(added, 1);
  assert.deepEqual(
    removed.assets.map((asset) => asset.id),
    [1, 3],
  );
  assert.deepEqual(removed.correlations, [
    ["1", "0"],
    ["0", "1"],
  ]);
  let full = initial;
  while (full.assets.length < MAX_ASSETS) full = addAsset(full);
  assert.equal(addAsset(full), full);
  const one = removeAsset(initial, 0);
  assert.equal(removeAsset(one, 0), one);
});

test("correlation validation rejects missing, out-of-range and non-positive-definite entries", () => {
  assert.match(
    correlationMatrixError([
      ["1", ""],
      ["", "1"],
    ])!,
    /between/,
  );
  assert.match(
    correlationMatrixError([
      ["1", "1.2"],
      ["1.2", "1"],
    ])!,
    /between/,
  );
  assert.match(
    correlationMatrixError([
      ["1", "1"],
      ["1", "1"],
    ])!,
    /positive definite/,
  );
  assert.match(
    correlationMatrixError([
      ["1", ".9", ".9"],
      [".9", "1", "-.9"],
      [".9", "-.9", "1"],
    ])!,
    /positive definite/,
  );
  assert.equal(
    correlationMatrixError([
      ["1", ".2", ".1"],
      [".2", "1", ".3"],
      [".1", ".3", "1"],
    ]),
    null,
  );
});

test("market validation catches invalid asset and rate inputs", () => {
  const market = initialMarketCalibration();
  market.assets[0].volatilityPercent = "";
  market.assets[1].name = market.assets[0].name;
  market.inflationPercent = "-100";
  const errors = marketValidationErrors(market).join(" ");
  assert.match(errors, /unique/);
  assert.match(errors, /volatility/);
  assert.match(errors, /inflation/);
});
