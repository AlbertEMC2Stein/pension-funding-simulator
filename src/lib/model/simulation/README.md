# Financial simulation

This directory contains an initial scalar reference and a TensorFlow.js batch
prototype for the unconstrained CE wealth process. They are not connected to the
interface. They report impoverishment observed at grid points, not continuous
first-passage events, and do not compute mortality-weighted risk.

Suggested order:

1. **`run-configuration.ts`** validates, copies and deeply freezes a provisional
   snapshot. Batch entry points accept snapshots created by this validator.
   Object identity does not survive worker transfer: validate transferred data
   in the receiving context. The validator checks market consistency and CE
   compatibility, but cannot verify mortality-fit provenance or freshness.
   Cross-version reproducibility remains to be specified.
2. **`random.ts` and `matrix.ts`** generate seeded draws and transform them to
   market increments. The RNG uses a string hash, sfc32 and Box–Muller. Full
   known-answer, statistical and stream-partition tests are still needed.
3. **`wealth-step.ts` and `wealth-path.ts`** advance and stop scalar reference
   paths on grid-observed impoverishment. A batch prepares the time grid and
   safe-boundary coefficients once; its inner loop trusts those inputs and
   checks computed wealth for numerical failures. Standalone reference entry
   points check arbitrary caller inputs before using the same calculations.
4. **`tensorflow/`** contains backend selection and a batched Float32 analogue
   using supplied increments. Each step's increments may be provided by a
   callback to avoid retaining all time steps. The low-level supplied-increment
   entry point is a trusted test harness; `simulateTensorSnapshotBatch` accepts
   a validated snapshot. Initialize the backend first. Tensors are disposed
   internally; no financial worker is connected yet.

The provisional increment convention is asset-ordered return noise with
covariance `Σ × dt`: its volatility and time-step scaling have already been
applied. The wealth-step implementation must not apply those factors again.
The snapshot and batch result format are not stable. A finite grid alone does
not detect all within-step crossings; first-passage and mortality estimates,
projection, worker execution and Monte Carlo intervals are later work. CPU
TensorFlow has a small deterministic comparison against the scalar reference;
WebGPU, browser fallback, GPU precision and performance have not been verified.

Both current batch entry points restart the random stream from the snapshot seed
on each call. Repeated calls therefore repeat draws and must not yet be combined
as independent batches. Full-run stream partitioning remains to be specified.

Research references for the step are `sections/5_first_passage.tex` and
`code/utils/+wealthSimulation/advanceWealthStep.m` in the separate research
project. Follow that project's `AGENTS.md` before using its files. The reference
code was read to inform these comments, not executed or modified.
