# Financial simulation

This directory contains an initial scalar reference and a TensorFlow.js batch
prototype for the unconstrained CE wealth process and a paired projected-policy
prototype. The TensorFlow prototype is
available through a worker in the developer panel. It estimates first-passage
times with a local bridge approximation and reports CE- and GM-survival-weighted
risk within the simulated horizon.

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
   Initialize the backend first. Tensors are disposed internally. `time-grid.ts`
   and `prepared-grid.ts` remain shared
   between the reference and TensorFlow implementations.
5. **`tensorflow/run-scheduler.ts`** initializes a backend and runs the whole
   snapshot in batches using one seeded stream. It retains approximate
   first-hit times, aggregates counts by hit interval, reports progress after
   each batch, and can cancel between batches. It currently rejects trajectory
   recording and does not calculate mortality-weighted risk.
6. **`tensorflow/bridge-hit.ts`** is a policy-independent
   single-boundary bridge primitive. It accepts signed endpoint distances,
   step variance and caller-supplied draws, and returns hit masks and
   first-hit fractions. Inputs and outputs are caller-owned tensors; temporary
   tensors are disposed inside the primitive. The CE-specific adapter
   `tensorflow/ce-impoverishment-bridge.ts` converts each wealth step into
   bridge coordinates, using a linearized log boundary or a frozen wealth
   diffusion at the CE endpoint. These are local approximations.
7. **`risk-estimate.ts`** uses each hit time's CE or GM survival probability
   as a pathwise payoff, with zero for a path not hit by the horizon. It reports
   sample standard errors and approximate 95% normal Monte Carlo intervals for
   independent paths. No interval is returned when the sample has no variation
   or fewer than two paths. This sampling uncertainty does not include bridge,
   time-step or horizon effects. GM risk beyond the finite CE policy endpoint
   is not included.

The TensorFlow batch draws seeded standard normals on the CPU into a flat
Float32 buffer at each step. TensorFlow then applies the retained covariance
factor to all paths with a batched matrix multiplication on the selected
backend. Auxiliary bridge draws use fresh values from the same stream. This
still requires CPU loops and uploads per step; GPU random generation is not
implemented.

The provisional increment convention is asset-ordered return noise with
covariance `Σ × dt`: its volatility and time-step scaling have already been
applied. The wealth-step implementation must not apply those factors again.
Scalar-step and tensor-batch inputs group the investor's wealth and
impoverishment level together. Batch entry points construct these inputs from
the validated snapshot; the analytical model's threshold is derived from that
same investor input rather than maintained as a separate editable value.
All paths in a batch share one investor's initial capital. The tensor backend
creates the path-state vector internally from that amount and the batch size.
The snapshot and batch result format are not stable. Bridge-detected times
remain approximate for a curved boundary. The evaluation panel displays paired
projected-policy estimates when projection is selected. CPU TensorFlow has
deterministic bridge checks and an analytical CE risk sanity check; the new
bridge integration has not been verified on WebGPU.

The TensorFlow scheduler creates one stream from the snapshot seed; each batch
consumes it without resetting it. Reproducibility currently depends on keeping
the same batch sizes and call order; changing batch size can change which draws
are assigned to a path. The scalar reference batch still restarts from the
snapshot seed on each call and must not be combined as independent batches.

Research references for the step are `sections/5_first_passage.tex` and
`code/utils/+wealthSimulation/advanceWealthStep.m` in the separate research
project. Follow that project's `AGENTS.md` before using its files. The reference
code was read to inform these comments, not executed or modified.


## Projected wealth step

`tensorflow/projected-wealth-step.ts` evaluates the prepared, piecewise-linear
projection curve on the selected TensorFlow backend and advances wealth using
Euler–Maruyama in the risky region. It retains the exact risk-free update for
safe paths and freezes inactive paths. The step also returns the frozen wealth
variance rate used by the projected first-passage bridge. Its caller
creates and disposes the TensorFlow policy tensors once per batch.

For a projected run the batch loop uses this step alongside the unconstrained
update with the same market increments and auxiliary bridge draws. A separate
wealth-coordinate bridge freezes the projected diffusion over each step. Both
policies have independent stopped states and paired hit-time arrays; the worker
computes projected risks and standard errors of paired differences. The developer
and evaluation panels display these provisional results. CPU tests include a known CE reference where projection does not bind. Projected
risk depends on Euler and bridge approximations, and its time-step sensitivity,
GPU behavior and performance require further checks before production use.


## Policy wealth steps

`tensorflow/unconstrained-wealth-step.ts` advances the exact CE safe-gap
dynamics, while `tensorflow/projected-wealth-step.ts` advances the projected
Euler dynamics. The batch loop invokes each step and then its corresponding
first-passage adapter. Both policies share the same hit-recording logic and
market and bridge draws, but keep separate path states. The unconstrained
bridge retains its log-gap coordinate and endpoint fallback; the projected
bridge uses a frozen wealth variance.
