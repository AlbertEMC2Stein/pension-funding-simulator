#!/usr/bin/env node

/**
 * Print a reproducible, synthetic two-asset price CSV to standard output.
 * Run: node scripts/generate-example-market.mjs > examples/market-data/two-asset-black-scholes.csv
 * Each weekday is treated as one trading day; public holidays are not removed.
 */

// Mulberry32 supplies reproducible pseudo-random values; it is not a source
// of cryptographic randomness. Box–Muller converts pairs to normal variates.
let randomState = 20251108;
/** Advance the seeded pseudo-random generator and return its next uniform draw. */
function uniform() {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let value = randomState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

/** Transform uniform draws into a pair of independent standard normal samples. */
function independentNormals() {
  // The first uniform must be nonzero for the natural logarithm.
  let first = 0;
  while (first === 0) first = uniform();
  const radius = Math.sqrt(-2 * Math.log(first));
  const angle = 2 * Math.PI * uniform();
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

const annualReturns = [0.07, 0.035];
const annualVolatilities = [0.16, 0.07];
const correlation = 0.25;
const dt = 1 / 252;
const prices = [100, 100];
const lines = ["date,Synthetic Equity,Synthetic Bonds"];
const date = new Date("2016-01-01T00:00:00Z");
const end = new Date("2025-12-31T00:00:00Z");
let firstObservation = true;

while (date <= end) {
  const day = date.getUTCDay();
  if (day !== 0 && day !== 6) {
    if (!firstObservation) {
      const [z1, independent] = independentNormals();
      const shocks = [z1, correlation * z1 + Math.sqrt(1 - correlation ** 2) * independent];
      for (let asset = 0; asset < prices.length; asset += 1) {
        const volatility = annualVolatilities[asset];
        prices[asset] *= Math.exp(
          (annualReturns[asset] - volatility ** 2 / 2) * dt +
            volatility * Math.sqrt(dt) * shocks[asset],
        );
      }
    }
    lines.push(`${date.toISOString().slice(0, 10)},${prices.map((price) => price.toFixed(4)).join(",")}`);
    firstObservation = false;
  }
  date.setUTCDate(date.getUTCDate() + 1);
}

process.stdout.write(`${lines.join("\n")}\n`);
