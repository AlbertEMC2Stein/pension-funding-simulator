import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

test("bundled worker executes both fits and reports completion", () => {
  const messages = [];
  const worker = { postMessage: (message) => messages.push(message) };
  const code = readFileSync(
    new URL("../public/workers/mortality-fit.worker.js", import.meta.url),
    "utf8",
  );
  runInNewContext(code, { self: worker });
  const times = Array.from({ length: 41 }, (_, i) => i);
  const target = times.map((t) =>
    Math.exp(-0.001 * t - (0.002 / 0.09) * Math.expm1(0.09 * t)),
  );
  worker.onmessage({
    data: { times, target, market: { r: 0.005, rho: 0.0788632968895632 } },
  });
  assert.ok(
    messages.some(
      (message) => message.type === "gm" && message.fit.klDivergence < 1e-10,
    ),
  );
  assert.ok(
    messages.some(
      (message) =>
        message.type === "ce" && Number.isFinite(message.fit.klDivergence),
    ),
  );
  assert.equal(messages.at(-1).type, "done");
});
