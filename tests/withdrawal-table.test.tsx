import assert from "node:assert/strict";
import {
  prepareComparisonRows,
  comparisonSetupSignature,
} from "../src/components/comparison/comparison-run";
import { test } from "node:test";
import {
  prepareWithdrawalTable,
  calculateWithdrawalRow,
} from "../src/lib/model/comparison/withdrawal-table";
import { createRunSnapshot } from "../src/lib/model/simulation/run-configuration";
import { compatibleRisk } from "../src/lib/model/analytical/compatible-policy";
import { calibrateMarket } from "../src/lib/market/calibrate-market";
import { mortalityFitKeys } from "../src/lib/mortality/fit-status";
import {
  buildMarketOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";

/** Build a validated, compatible CE fit for the initial shared setup. */
function example() {
  const draft = initialSimulationDraft();
  const input = buildMarketOptions(draft.market);
  assert.ok(input.ok);
  const calibration = calibrateMarket(input.market);
  assert.ok(calibration.ok);
  const market = calibration.market;
  const tau = 10;
  const b0 =
    market.realRiskFreeRate / -Math.expm1(-market.realRiskFreeRate * tau);
  const p = 2 + market.rho / b0;
  const key = mortalityFitKeys({ ...draft.investor, market }).ce!;
  const fit = {
    fittedSurvival: [],
    klDivergence: 0,
    maxSurvivalDifference: 0,
    converged: true,
    starts: 1,
    convergedStarts: 1,
    parameters: {
      tau,
      p,
      kappa: market.realRiskFreeRate,
      lambda: p * (b0 - market.rho / (p - 1)),
      deltaMin: 1 + market.rho / b0,
    },
  };
  return { draft, fits: { ce: { key, fit } } };
}

test("risk and withdrawal rows calculate inverse CE values and safe zero-risk cases", () => {
  const { draft, fits } = example();
  const context = prepareWithdrawalTable(draft, fits);
  assert.ok(context.available);
  const target = calculateWithdrawalRow(context, "Target risk", "5.00");
  assert.ok(target.ok);
  assert.equal(target.ceRisk, 0.05);
  assert.ok(
    Math.abs(
      compatibleRisk(
        context.model,
        context.initialCapital,
        target.annualWithdrawal,
      ) - 0.05,
    ) < 1e-12,
  );
  const fixed = calculateWithdrawalRow(
    context,
    "Withdrawal",
    target.annualWithdrawal.toFixed(4),
  );
  assert.ok(fixed.ok);
  assert.ok(Math.abs(fixed.ceRisk - target.ceRisk) < 1e-7);
  assert.deepEqual(calculateWithdrawalRow(context, "Target risk", "0"), {
    ok: true,
    annualWithdrawal: context.safeAnnualWithdrawal,
    ceRisk: 0,
  });
  assert.deepEqual(calculateWithdrawalRow(context, "Withdrawal", "0"), {
    ok: true,
    annualWithdrawal: 0,
    ceRisk: 0,
  });
  const grouped = calculateWithdrawalRow(context, "Withdrawal", "10,000.00");
  assert.ok(grouped.ok);
  assert.equal(grouped.annualWithdrawal, 10000);
});

test("invalid row inputs receive clear errors and do not affect other rows", () => {
  const { draft, fits } = example();
  const context = prepareWithdrawalTable(draft, fits);
  assert.ok(context.available);
  for (const value of ["", "-1", "100", "NaN", "1e2", "1,5"])
    assert.equal(
      calculateWithdrawalRow(context, "Target risk", value).ok,
      false,
    );
  for (const value of ["", "-1", "abc", "1,23", "1e3"])
    assert.equal(
      calculateWithdrawalRow(context, "Withdrawal", value).ok,
      false,
    );
  assert.equal(calculateWithdrawalRow(context, "Target risk", "1").ok, true);
});

test("missing, stale and incompatible fits make the shared context unavailable", () => {
  const { draft, fits } = example();
  assert.equal(prepareWithdrawalTable(draft, { ce: null }).available, false);
  assert.equal(
    prepareWithdrawalTable(draft, { ce: { ...fits.ce, key: "stale" } })
      .available,
    false,
  );
  const invalid = {
    ce: {
      ...fits.ce,
      fit: {
        ...fits.ce.fit,
        parameters: { ...fits.ce.fit.parameters, lambda: 1 },
      },
    },
  };
  assert.equal(prepareWithdrawalTable(draft, invalid).available, false);
  draft.investor.initialCapital = draft.investor.impoverishmentLevel;
  assert.equal(prepareWithdrawalTable(draft, fits).available, false);
});

test("table jobs capture one shared setup and independently prepare selected policies", () => {
  const { draft, fits } = example();
  const marketInput = buildMarketOptions(draft.market);
  assert.ok(marketInput.ok);
  const market = calibrateMarket(marketInput.market);
  assert.ok(market.ok);
  const gmKey = mortalityFitKeys({
    ...draft.investor,
    market: market.market,
  }).gm;
  const completeFits = {
    ...fits,
    gm: {
      key: gmKey,
      fit: {
        ...fits.ce.fit,
        parameters: { alpha: 0.01, beta: 0.1, lambda: 0.01 },
      },
    },
  };
  const prepared = prepareComparisonRows(
    [
      { id: 1, type: "Target risk", value: "5", policy: "Unconstrained" },
      { id: 2, type: "Target risk", value: "5", policy: "Projected" },
      { id: 3, type: "Target risk", value: "0", policy: "Projected" },
      { id: 4, type: "Target risk", value: "100", policy: "Unconstrained" },
    ],
    draft,
    completeFits,
  );
  assert.ok(prepared.ok);
  assert.deepEqual(
    prepared.rows.map((row) => row.status),
    ["queued", "queued", "calculated", "error"],
  );
  assert.ok(prepared.rows[0].input && prepared.rows[1].input);
  assert.equal(prepared.rows[0].input.options.policy.projected, false);
  assert.equal(
    createRunSnapshot(prepared.rows[0].input).options.policy.projected,
    false,
  );
  assert.equal(
    createRunSnapshot(prepared.rows[1].input).options.policy.projected,
    true,
  );
  assert.equal(prepared.rows[1].input.options.policy.projected, true);
  assert.equal(
    prepared.rows[0].input.options.policy.withdrawal.mode,
    "customAmount",
  );
  assert.notEqual(
    prepared.rows[0].input.numerical.seed,
    prepared.rows[1].input.numerical.seed,
  );
  assert.equal(prepared.rows[2].gm?.estimate, 0);
  assert.equal(prepared.rows[2].analytical, true);
  const capturedPaths = prepared.rows[0].input.options.numerical.paths;
  draft.simulation.paths = 50000;
  assert.equal(prepared.rows[0].input.options.numerical.paths, capturedPaths);
  assert.notEqual(
    prepared.signature,
    comparisonSetupSignature(draft, completeFits),
  );
});

test("completed rows are reused until their inputs or shared settings change", () => {
  const { draft, fits } = example();
  const marketInput = buildMarketOptions(draft.market);
  assert.ok(marketInput.ok);
  const market = calibrateMarket(marketInput.market);
  assert.ok(market.ok);
  const gmKey = mortalityFitKeys({
    ...draft.investor,
    market: market.market,
  }).gm;
  const completeFits = {
    ...fits,
    gm: {
      key: gmKey,
      fit: {
        ...fits.ce.fit,
        parameters: { alpha: 0.01, beta: 0.1, lambda: 0.01 },
      },
    },
  };
  const firstRow = {
    id: 1,
    type: "Target risk" as const,
    value: "5",
    policy: "Unconstrained" as const,
  };
  const secondRow = {
    id: 2,
    type: "Target risk" as const,
    value: "10",
    policy: "Projected" as const,
  };
  const initial = prepareComparisonRows([firstRow], draft, completeFits);
  assert.ok(initial.ok);
  const estimate = { estimate: 0.051, standardError: 0.001, interval95: null };
  const previous = {
    signature: initial.signature,
    rows: [{ ...initial.rows[0], status: "calculated" as const, gm: estimate }],
  };

  const added = prepareComparisonRows(
    [firstRow, secondRow],
    draft,
    completeFits,
    previous,
  );
  assert.ok(added.ok);
  assert.deepEqual(
    added.rows.map((row) => row.status),
    ["calculated", "queued"],
  );
  assert.equal(added.rows[0].gm, estimate);

  const edited = prepareComparisonRows(
    [{ ...firstRow, value: "6" }, secondRow],
    draft,
    completeFits,
    previous,
  );
  assert.ok(edited.ok);
  assert.deepEqual(
    edited.rows.map((row) => row.status),
    ["queued", "queued"],
  );

  const changedPolicy = prepareComparisonRows(
    [{ ...firstRow, policy: "Projected" }],
    draft,
    completeFits,
    previous,
  );
  assert.ok(changedPolicy.ok);
  assert.equal(changedPolicy.rows[0].status, "queued");

  const retry = prepareComparisonRows([firstRow], draft, completeFits, {
    ...previous,
    rows: [{ ...previous.rows[0], status: "cancelled" }],
  });
  assert.ok(retry.ok);
  assert.equal(retry.rows[0].status, "queued");

  draft.simulation.paths = 50000;
  const changedSetup = prepareComparisonRows(
    [firstRow, secondRow],
    draft,
    completeFits,
    previous,
  );
  assert.ok(changedSetup.ok);
  assert.deepEqual(
    changedSetup.rows.map((row) => row.status),
    ["queued", "queued"],
  );
});
