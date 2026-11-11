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
2. **`random.ts`** generates seeded draws shared by the backends. Calibration
   retains the covariance factor, so batches reuse it without refactorization.
   The RNG uses a string hash, sfc32 and Box–Muller. Full known-answer,
   statistical and stream-partition tests are still needed.
3. **`legacy/`** contains the scalar reference's matrix, wealth-step and
   wealth-path modules. These advance and stop scalar reference
   paths on grid-observed impoverishment. A batch prepares the time grid and
   safe-boundary coefficients once; its inner loop trusts those inputs and
   checks computed wealth for numerical failures. Standalone reference entry
   points check arbitrary caller inputs before using the same calculations.
4. **`tensorflow/`** contains backend selection and a batched Float32 analogue
   using supplied increments. Each step's increments may be provided by a
   callback to avoid retaining all time steps. The low-level supplied-increment
   entry point is a trusted test harness; `simulateTensorBatch` accepts a
   validated snapshot, actual batch size and caller-owned random stream.
   Initialize the backend first. Tensors are disposed internally; no financial
   worker is connected yet. `time-grid.ts` and `prepared-grid.ts` remain shared
   between the reference and TensorFlow implementations.

The TensorFlow batch draws seeded standard normals on the CPU into a flat
Float32 buffer at each step. TensorFlow then applies the retained covariance
factor to all paths with a batched matrix multiplication on the selected
backend. This preserves the existing random stream but still requires a CPU
loop and one upload per step; GPU random generation is not implemented.

The provisional increment convention is asset-ordered return noise with
covariance `Σ × dt`: its volatility and time-step scaling have already been
applied. The wealth-step implementation must not apply those factors again.
Scalar-step and tensor-batch inputs group the investor's wealth and
impoverishment level together. Batch entry points construct these inputs from
the validated snapshot; the analytical model's threshold is derived from that
same investor input rather than maintained as a separate editable value.
All paths in a batch share one investor's initial capital. The tensor backend
creates the path-state vector internally from that amount and the batch size.
The snapshot and batch result format are not stable. A finite grid alone does
not detect all within-step crossings; first-passage and mortality estimates,
projection, worker execution and Monte Carlo intervals are later work. CPU
TensorFlow has a small deterministic comparison against the scalar reference;
WebGPU, browser fallback, GPU precision and performance have not been verified.

The TensorFlow batch consumes its caller-owned stream without resetting it. A
future run coordinator must create that stream once from the snapshot seed and
use it for successive batches. Reproducibility currently depends on keeping the
same batch sizes and call order; changing batch size can change which draws are
assigned to a path. The scalar reference batch still restarts from the snapshot
seed on each call and must not be combined as independent batches.

Research references for the step are `sections/5_first_passage.tex` and
`code/utils/+wealthSimulation/advanceWealthStep.m` in the separate research
project. Follow that project's `AGENTS.md` before using its files. The reference
code was read to inform these comments, not executed or modified.
