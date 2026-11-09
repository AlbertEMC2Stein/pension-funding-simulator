#!/usr/bin/env node

/**
 * Generate a reproducible calendar-time Black–Scholes example on stdout.
 * Pass --complete or --missing; see examples/market-data/README.md.
 * Prices and missingness use separate seeded random streams so the complete
 * and incomplete exports contain exactly the same underlying price paths.
 */
const mode = process.argv[2];
if (process.argv.length !== 3 || !["--complete", "--missing"].includes(mode)) {
  console.error(
    "Usage: node scripts/generate-three-asset-market.mjs --complete|--missing",
  );
  process.exit(1);
}

/** Deterministic Mulberry32 uniform generator; not cryptographically secure. */
function createUniform(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller transforms two uniform draws into independent standard normals. */
function normalPair(random) {
  let first = 0;
  while (first === 0) first = random();
  const radius = Math.sqrt(-2 * Math.log(first));
  const angle = 2 * Math.PI * random();
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

const priceRandom = createUniform(20261109);
const maskRandom = createUniform(20261110);
const drift = [0.07, 0.035, 0.08];
const volatility = [0.16, 0.07, 0.22];
const prices = [450, 200, 75];
const missingProbability = 0.03;
const firstDate = Date.UTC(2016, 0, 1);
const lastDate = Date.UTC(2025, 11, 31);
const dayMs = 86_400_000;
const lines = [
  "date,Synthetic Global Equity,Synthetic Government Bonds,Synthetic Small-Cap Equity",
];
let previousTime = null;

// Lower Cholesky factor of the agreed correlation matrix in asset order.
const l21 = 0.25;
const l22 = Math.sqrt(1 - l21 ** 2);
const l31 = 0.6;
const l32 = (0.1 - l31 * l21) / l22;
const l33 = Math.sqrt(1 - l31 ** 2 - l32 ** 2);

for (let time = firstDate; time <= lastDate; time += dayMs) {
  const date = new Date(time);
  if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
  if (previousTime !== null) {
    const dt = (time - previousTime) / dayMs / 365.25;
    const [z1, z2] = normalPair(priceRandom);
    const [z3] = normalPair(priceRandom);
    const correlated = [
      z1,
      l21 * z1 + l22 * z2,
      l31 * z1 + l32 * z2 + l33 * z3,
    ];
    for (let i = 0; i < prices.length; i += 1) {
      prices[i] *= Math.exp(
        (drift[i] - volatility[i] ** 2 / 2) * dt +
          volatility[i] * Math.sqrt(dt) * correlated[i],
      );
    }
  }
  const endpoint = time === firstDate || time === lastDate;
  const fields = prices.map((price) => {
    // Consume the same mask stream in either mode, independently per asset.
    const missing = !endpoint && maskRandom() < missingProbability;
    return mode === "--missing" && missing ? "" : price.toFixed(6);
  });
  lines.push(`${date.toISOString().slice(0, 10)},${fields.join(",")}`);
  previousTime = time;
}
process.stdout.write(`${lines.join("\n")}\n`);
