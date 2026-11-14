import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mortalityFitNeedsUpdate,
  scheduleMortalityFit,
} from "../src/lib/mortality/automatic-fit";

test("automatic fitting follows cohort and market keys without retrying matching fits", () => {
  const state = {
    storageRestored: true,
    cohortValid: true,
    cohortReady: true,
    gmKey: "cohort",
    ceKey: "cohort/market",
    fittedGmKey: "cohort",
    fittedCeKey: "cohort/market",
    retry: false,
  };

  assert.equal(mortalityFitNeedsUpdate(state), false);
  assert.equal(
    mortalityFitNeedsUpdate({ ...state, ceKey: "cohort/new-market" }),
    true,
  );
  assert.equal(
    mortalityFitNeedsUpdate({ ...state, gmKey: "new-cohort" }),
    true,
  );
  assert.equal(mortalityFitNeedsUpdate({ ...state, ceKey: null }), false);
  assert.equal(
    mortalityFitNeedsUpdate({ ...state, gmKey: "new-cohort", ceKey: null }),
    true,
  );
  assert.equal(
    mortalityFitNeedsUpdate({ ...state, cohortReady: false, retry: true }),
    false,
  );
  assert.equal(
    mortalityFitNeedsUpdate({ ...state, cohortValid: false, retry: true }),
    false,
  );
  assert.equal(mortalityFitNeedsUpdate({ ...state, retry: true }), true);
});

test("superseded edits cancel a pending mortality fit", async () => {
  const starts: string[] = [];
  const cancelFirst = scheduleMortalityFit(() => {
    starts.push("first");
    return () => {};
  }, 10);

  cancelFirst();
  const cancelSecond = scheduleMortalityFit(() => {
    starts.push("second");
    return () => {};
  }, 10);

  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.deepEqual(starts, ["second"]);
  cancelSecond();
});

test("replacing a running fit invokes its worker cleanup", async () => {
  let stopped = 0;
  const cancel = scheduleMortalityFit(
    () => () => {
      stopped += 1;
    },
    0,
  );

  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(stopped, 0);
  cancel();
  assert.equal(stopped, 1);
});
