# Financial simulation

This directory contains an initial scalar reference and a TensorFlow.js batch
prototype for the unconstrained CE wealth process. They are not connected to the
interface. They report impoverishment observed at grid points, not continuous
first-passage events, and do not compute mortality-weighted risk.

Suggested order:

1. **`run-configuration.ts`** validates and copies a provisional snapshot. It
   checks market consistency and CE compatibility, but cannot verify the
   provenance or freshness of the supplied mortality fit. Its version strings
   and seed are supplied by the caller; cross-version reproducibility remains
   to be specified.
2. **`random.ts` and `matrix.ts`** generate seeded draws and transform them to
   market increments. The RNG uses a string hash, sfc32 and Box–Muller. Full
   known-answer, statistical and stream-partition tests are still needed.
3. **`wealth-step.ts` and `wealth-path.ts`** advance and stop scalar reference
   paths on grid-observed impoverishment. Invalid inputs are errors, not hits.
4. **`tensorflow/`** contains backend selection and a batched Float32 analogue
   using supplied increments. Each step's increments may be provided by a
   callback to avoid retaining all time steps. Initialize the backend first.
   Tensors are disposed internally; no financial worker is connected yet.

The provisional increment convention is asset-ordered return noise with
covariance `Σ × dt`: its volatility and time-step scaling have already been
applied. The wealth-step implementation must not apply those factors again.
The snapshot and batch result format are not stable. A finite grid alone does
not detect all within-step crossings; first-passage and mortality estimates,
projection, worker execution and Monte Carlo intervals are later work. CPU
TensorFlow has a small deterministic comparison against the scalar reference;
WebGPU, browser fallback, GPU precision and performance have not been verified.

Research references for the step are `sections/5_first_passage.tex` and
`code/utils/+wealthSimulation/advanceWealthStep.m` in the separate research
project. Follow that project's `AGENTS.md` before using its files. The reference
code was read to inform these comments, not executed or modified.
