import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftContext } from "../src/components/common";
import { GmRiskCard } from "../src/components/evaluation/Evaluation";
import { prepareEvaluationRun } from "../src/components/evaluation/evaluation-run-input";
import type { EvaluationRun } from "../src/components/evaluation/useEvaluationRun";
import { calibrateMarket } from "../src/lib/market/calibrate-market";
import { mortalityFitKeys } from "../src/lib/mortality/fit-status";
import {
  buildSimulationOptions,
  initialSimulationDraft,
} from "../src/lib/options/simulation-options";
import { createRunSnapshot } from "../src/lib/model/simulation/run-configuration";

/** Construct current synthetic fits compatible with the default market. */
function setup() {
  const draft = initialSimulationDraft();
  const built = buildSimulationOptions(draft);
  assert.ok(built.ok);
  const calibrated = calibrateMarket(built.options.market);
  assert.ok(calibrated.ok);
  const market = calibrated.market;
  const keys = mortalityFitKeys({ ...draft.investor, market });
  assert.ok(keys.ce);
  const tau = 10;
  const b0 =
    market.realRiskFreeRate / -Math.expm1(-market.realRiskFreeRate * tau);
  const p = 2 + market.rho / b0;
  const diagnostics = {
    fittedSurvival: [],
    klDivergence: 0,
    maxSurvivalDifference: 0,
    converged: true,
    starts: 1,
    convergedStarts: 1,
  };
  const fits = {
    gm: {
      key: keys.gm,
      fit: {
        ...diagnostics,
        parameters: { alpha: 0.01, beta: 0.1, lambda: 0.01 },
      },
    },
    ce: {
      key: keys.ce,
      fit: {
        ...diagnostics,
        parameters: {
          tau,
          p,
          deltaMin: 1 + market.rho / b0,
          kappa: market.realRiskFreeRate,
          lambda: p * (b0 - market.rho / (p - 1)),
        },
      },
    },
  };

  return { draft, fits };
}

test("evaluation prepares a validated full-horizon snapshot from current settings", () => {
  const { draft, fits } = setup();
  const result = prepareEvaluationRun(draft, fits);
  assert.ok(result.ok);
  const snapshot = createRunSnapshot(result.input);

  assert.equal(snapshot.numerical.horizonYears, fits.ce.fit.parameters.tau);
  assert.equal(snapshot.options.numerical.paths, draft.simulation.paths);
  assert.equal(snapshot.numerical.seed, "evaluation-1");
  assert.equal(snapshot.numerical.batchSize, 2500);
});

test("evaluation accepts projection and refuses stale and missing mortality inputs", () => {
  const { draft, fits } = setup();
  draft.simulation.projected = true;
  const paired = prepareEvaluationRun(draft, fits);
  assert.ok(paired.ok);
  assert.equal(createRunSnapshot(paired.input).options.policy.projected, true);
  assert.equal(
    paired.input.versions.simulationAlgorithm,
    "tensorflow-paired-euler-1",
  );
  draft.simulation.projected = false;
  assert.equal(prepareEvaluationRun(draft, { ...fits, ce: null }).ok, false);
  draft.investor.retirementYear = "2033";
  assert.equal(prepareEvaluationRun(draft, fits).ok, false);
});

test("evaluation captures the selected seed and rejects a blank seed", () => {
  const { draft, fits } = setup();
  draft.simulation.seed = "example seed";
  const prepared = prepareEvaluationRun(draft, fits);
  assert.ok(prepared.ok);
  assert.equal(
    createRunSnapshot(prepared.input).numerical.seed,
    "example seed",
  );

  draft.simulation.seed = "   ";
  assert.equal(prepareEvaluationRun(draft, fits).ok, false);
});

test("GM card displays the captured estimate and marks changed settings", () => {
  const { draft, fits } = setup();
  draft.simulation.withdrawalMode = "customAmount";
  const prepared = prepareEvaluationRun(draft, fits);
  assert.ok(prepared.ok);
  const run: EvaluationRun = {
    signature: "captured",
    phase: "complete",
    options: prepared.input.options,
    numerical: prepared.input.numerical,
    risk: {
      ce: {
        estimate: 0.05,
        standardError: 0.001,
        interval95: { lower: 0.048, upper: 0.052 },
      },
      gm: {
        estimate: 0.052,
        standardError: 0.001,
        interval95: { lower: 0.05, upper: 0.054 },
      },
      ceBenchmark: 0.05,
      horizonYears: 10,
      ceEndpoint: 10,
    },
  };
  const html = renderToStaticMarkup(
    <DraftContext.Provider value={{ navigate: () => {}, notice: () => {} }}>
      <GmRiskCard projected={false} run={run} stale custom />
    </DraftContext.Provider>,
  );

  assert.match(html, /NEEDS UPDATING/);
  assert.match(html, /CE-model risk/);
  assert.match(html, /5.200%/);
  assert.match(html, /5.000% – 5.400%/);
  assert.match(html, /outcomes|extend beyond the CE endpoint/);
});

test("GM card displays paired projected values and labels stale runs", () => {
  const { draft, fits } = setup();
  draft.simulation.projected = true;
  const prepared = prepareEvaluationRun(draft, fits);
  assert.ok(prepared.ok);
  const baseEstimate = {
    estimate: 0.052,
    standardError: 0.001,
    interval95: { lower: 0.05, upper: 0.054 },
  };
  const projectedEstimate = {
    estimate: 0.055,
    standardError: 0.001,
    interval95: { lower: 0.053, upper: 0.057 },
  };
  const pairedDifference = {
    estimate: 0.003,
    standardError: 0.0005,
    interval95: { lower: 0.002, upper: 0.004 },
  };
  const run: EvaluationRun = {
    signature: "captured",
    phase: "complete",
    options: prepared.input.options,
    numerical: prepared.input.numerical,
    risk: {
      ce: baseEstimate,
      gm: baseEstimate,
      ceBenchmark: 0.05,
      horizonYears: 10,
      ceEndpoint: 10,
      projected: {
        ce: projectedEstimate,
        gm: projectedEstimate,
        ceDifference: pairedDifference,
        gmDifference: pairedDifference,
      },
    },
  };
  const html = renderToStaticMarkup(
    <DraftContext.Provider value={{ navigate: () => {}, notice: () => {} }}>
      <GmRiskCard projected run={run} stale custom={false} />
    </DraftContext.Provider>,
  );

  assert.match(html, /NEEDS UPDATING/);
  assert.match(html, /5\.500%/);
  assert.match(html, /\+0\.300 pp/);
  assert.match(html, /\+0\.500 pp/);
  assert.match(html, /0\.200 pp – 0\.400 pp/);
  assert.match(html, /time-step and bridge errors are not included/);
  assert.doesNotMatch(html, /Settings used for this run/);
  assert.doesNotMatch(html, /When projection is selected/);
});

test("selecting projection does not present an earlier unconstrained run as paired", () => {
  const { draft, fits } = setup();
  const prepared = prepareEvaluationRun(draft, fits);
  assert.ok(prepared.ok);
  const estimate = { estimate: 0.05, standardError: null, interval95: null };
  const run: EvaluationRun = {
    signature: "earlier",
    phase: "complete",
    options: prepared.input.options,
    numerical: prepared.input.numerical,
    risk: {
      ce: estimate,
      gm: estimate,
      ceBenchmark: 0.05,
      horizonYears: 10,
      ceEndpoint: 10,
    },
  };
  const html = renderToStaticMarkup(
    <DraftContext.Provider value={{ navigate: () => {}, notice: () => {} }}>
      <GmRiskCard projected run={run} stale custom={false} />
    </DraftContext.Provider>,
  );

  assert.match(html, /NEEDS UPDATING/);
  assert.match(html, /NOT CALCULATED/);
  assert.match(html, /after a projected-policy run/);
});

test("trajectory recording is captured only when selected for the run", () => {
  const { draft, fits } = setup();
  const ordinary = prepareEvaluationRun(draft, fits);
  const recorded = prepareEvaluationRun(draft, fits, true);
  assert.ok(ordinary.ok && recorded.ok);
  assert.equal(ordinary.input.numerical.recordTrajectories, false);
  assert.equal(recorded.input.numerical.recordTrajectories, true);
});
