# Mathematical backend and website: implementation plan

This is a working roadmap, not a specification of unverified mathematical
results. Statuses describe what the website currently implements; they do not
claim that the research results or every numerical approximation have been
independently verified. Continue in small, reviewable steps and adjust the plan
when findings warrant it.

The website is independent of `gompertz-pension-funding` at runtime. Before
using the research manuscript or code for future work, read that project's
`AGENTS.md` and follow its instructions. Treat research files as reference
material and do not modify them without authorization.

## Current state

The app has editable market and investor inputs, cohort-based GM and
market-compatible CE mortality fits, analytical CE policy calculations, and a
TensorFlow.js financial simulation running in Web Workers. Evaluation and both
comparison tables display calculated results. Local draft recovery, setup
import/export, results export, table CSV export and chart exports are connected.

The current implementation remains a prototype. Its results depend on the
model and input assumptions, finite simulation horizon, time discretization,
first-passage approximations and numerical backend. Monte Carlo intervals cover
sampling uncertainty only. Validation, documentation and usability work remain
before treating the application as production-ready.

## Working agreement

1. State the inputs, outputs, units, assumptions and failure cases of each new
   calculation before implementing it.
2. Keep numerical calculations, worker execution and presentation distinct;
   validate the front-end/worker snapshot boundary and avoid repeated checks in
   the simulation's inner loop.
3. Verify with hand-checkable examples, invariants and matched reference cases
   where available. Record tolerances and intentional differences; do not treat
   an approximate match as formal validation.
4. Show results only where their assumptions hold, mark outdated results, and
   review numerical behavior and presentation together.

## Milestones

### 1. Conventions and reference cases — established; maintain as work evolves

Nominal returns and inflation are entered as annual percentages; the model uses
continuously compounded real rates, decimal probabilities and real euro values.
The covariance, Merton direction and `rho` conventions are documented in the
[market-calibration specification](market-calibration-specification.md).
Result-specific assumptions are reported separately from input validity.

**Remaining:** Keep reference cases and their provenance current as the model
changes. Review near-zero and boundary cases against the applicable result's
assumptions rather than extending conclusions from a different diagnostic.

### 2. Market calibration — implemented; further validation ongoing

Manual asset inputs, a mirrored correlation matrix, covariance construction,
calibration and assumption diagnostics are connected. Invalid, singular and
numerically near-singular matrices are rejected. Negative Merton components
remain valid market inputs but restrict applicable policy diagnostics.

**Remaining:** Continue checking numerical behavior in ill-conditioned and
higher-dimensional markets. The maximum of ten assets is a calibration and
computation limit, not a claim that every ten-asset case performs equally well.

### 3. Cohort data and mortality models — implemented

The six packaged cohort tables support female, male and custom survival-curve
mixtures. GM and market-compatible CE models are fitted in a worker; changes to
relevant inputs make the appropriate fit outdated. The fresh default example
starts a one-time background fit. Imported or locally restored setups do not
fit automatically. The exponential law remains a research benchmark, not a
user-facing model.

**Remaining:** Continue comparisons with appropriately matched reference fits,
especially optimizer failures and difficult cohorts. KL divergence and the
largest survival difference are available as technical diagnostics; do not
introduce qualitative fit grades without defensible thresholds. Preserve the
rule that loading a saved setup does not silently calculate results.

### 4. Unconstrained CE analysis and Evaluation — implemented

Safe boundary and withdrawal, CE withdrawal/risk and required-capital relations,
feedback allocation and global simplex feasibility are connected to Evaluation.
The risk-taking comparison holds withdrawal fixed. Its applicability and the
availability of the feasibility diagnostic depend on their respective model
assumptions. Global simplex feasibility requires a componentwise non-negative
Merton direction with at least one positive component; `zeta <= 1` then gives
the relevant no-borrowing condition.

**Remaining:** Keep unsupported parameter regions explicit, including capital
comparisons where withdrawal is at or below interest on the impoverishment
level. Verify edge and limiting cases as further formulas are added. The
[analytical module notes](../src/lib/model/analytical/README.md) contain useful
formula provenance but also need a separate review for outdated connection
status.

### 5. Run snapshots, workers and reproducibility — implemented; format provisional

The worker validates a captured run snapshot, including market consistency,
fit parameters, numerical settings, seed, algorithm identifiers and available
provenance. Editing inputs does not change a running snapshot. Replacement runs
and setup imports that interrupt active work require confirmation; cancellation
is observed between batches. Progress and ETA are batch-based.

A shared seed is configurable. A run consumes one stream across batches;
comparison rows derive separate streams. Matching the seed alone does not ensure
identical results after changes to batch size, backend, algorithm or data.
Model/data identifiers are descriptive rather than data checksums, and original
historical price data and their source are not retained in the current snapshot.

**Remaining:** Review snapshot versioning and provenance for a stable future
format. Add random-stream known-answer and statistical checks where appropriate;
do not promise path-by-path equality across batch sizes or numerical backends.
Review the development panel and its event log, including how prepared options
from Evaluation and Data & tables are represented.

### 6. Batched financial simulation — implemented; numerical checks ongoing

TensorFlow.js simulates batches in workers, preferring WebGPU with WebGL and CPU
fallbacks. Automatic batch sizing targets approximately four batches and is
capped at 32,768 paths; manual choices are available. The scheduler retains
first-hit information and only a bounded sample of trajectories when requested.
The scalar implementation remains in `legacy/` as a reference.

The unconstrained CE step uses exact safe-gap dynamics within its applicable
region. First-passage times use local bridge approximations. The projected policy
uses Euler stepping and a frozen-variance bridge. TensorFlow's GPU computations
are generally Float32, and backend or time-step differences can affect results.
See the [simulation notes](../src/lib/model/simulation/README.md) for details;
some introductory status text there also needs a documentation review.

**Remaining:** Run systematic time-step, batch-size, backend and path-count
sensitivity checks, including projected cases and representative devices.
Compare matched outputs with MATLAB and analytical benchmarks, documenting
uncertainty and tolerances. Profile worker/GPU memory and throughput before
considering alternative kernels. Antithetic sampling is a possible later
variance-reduction experiment, not an existing feature.

### 7. GM risk and paired projection — implemented; verification ongoing

The GM risk panel shows the unconstrained CE reference, the GM Monte Carlo
estimate and sampling uncertainty. When projection is selected, paired
projected results and projected-minus-unconstrained differences are also shown.
Projection uses the covariance-weighted simplex metric and a prepared
piecewise-linear allocation curve. It is a feasible comparison policy, not a
claim of constrained optimality.

**Remaining:** Compare matched projected and unconstrained cases against
suitable references, and examine discretization and bridge sensitivity
separately from Monte Carlo error. Confirm behavior and performance across GPU
backends, near-degenerate markets and more than two assets. GM mortality can
extend past the CE policy horizon; exported and displayed estimates cover only
the simulated horizon.

### 8. Borrowing, timing and trajectories — implemented; verification ongoing

Evaluation includes borrowing probability and GM-weighted occupation time,
analytical borrowing boundaries, an impoverishment timing view with forecast
and conditional-update modes, and optional sampled wealth trajectories. The
timing view offers cumulative remaining risk and density. Its optional Durbin
approximation and diagnostics apply only where the unconstrained assumptions
hold. Borrowing diagnostics are unavailable for projected policies and for
negative Merton components; `zeta <= 1` supplies an analytical zero where the
assumptions hold.

The first-borrowing bridge is an approximation and does **not** condition on
no prior impoverishment or use a first-passage bridge. Occupation uses the
implemented interpolation and GM-survival weighting. Trajectories show sampled
wealth conditional on remaining alive and stop at impoverishment or the policy
horizon; they are not death-time simulations.

**Remaining:** Continue matched MATLAB and time-step comparisons for borrowing,
including first borrowing and occupation. A previously observed approximate
comparison (about 0.89 versus 0.91 years) is a useful sanity check, not a full
validation. Review Durbin bounds and empirical comparison behavior under Monte
Carlo error and different regimes. Do not combine sampling intervals with
bridge, time-step or parameter uncertainty.

### 9. Comparison tables — implemented; verification ongoing

Withdrawal/risk/policy rows compute CE values and GM risk. The feasibility
sensitivity table varies risk or withdrawal and the impoverishment level,
showing `zeta`, borrowing probability and expected borrowing time, with further
diagnostics in each row's details. Rows share captured market, mortality and
numerical settings. The queue runs at most two workers, reports row and overall
progress, and reuses completed rows only when their relevant inputs still match.
Names can be edited without invalidating results; deletion of calculated rows
requires confirmation.

**Remaining:** Compare representative table rows directly with equivalent
Evaluation runs, allowing for their distinct random streams and Monte Carlo
uncertainty. Exercise cancellation, invalid rows, edits during a run, stale
results, reuse and two-worker contention in browser-level checks. Keep
policy-specific unavailable states consistent with Evaluation.

### 10. Historical market CSV calibration — implemented; stress tests pending

The app imports euro adjusted-close time series, estimates individual assets
using available observations and pairwise correlations from matching interval
endpoints, and reports coverage and uncertainty diagnostics. Elapsed time uses
calendar days divided by 365.25, including weekends and holidays. Pairwise
estimation can produce an invalid matrix, which is rejected rather than silently
repaired. The estimates and interval assumptions are described in
[historical market import](historical-market-import.md).

**Remaining:** Stress scenarios based on confidence bounds remain placeholders.
Before implementing them, specify how parameters are recalibrated and which
results remain applicable when assumptions such as non-negative Merton
components fail. Historical intervals describe estimation uncertainty, not
future returns or a joint confidence region. Live ticker/API integration has
not been selected or implemented.

### 11. Local recovery and exports — implemented; integration checks ongoing

Editable setup inputs, name and both tables are saved in versioned browser local
storage, including incomplete edits. A restored draft does not restore fits or
results, or trigger the first-visit fit. Setup JSON import validates inputs
before replacing the workspace and clears prior fits and results. Separate
exports provide results JSON, comparison-table CSV and PNG/SVG/CSV chart output.
See [setup files](setup-file.md) and [results and chart exports](results-export.md)
for formats and current limitations.

**Remaining:** Continue browser-level checks of recovery, invalid/unavailable
storage, active-run import confirmation, table exports and chart images. The
user has confirmed the reload workflow works; image rendering and downloads
should still be reviewed on supported browsers and themes. Historical source
CSV data, diagnostics and raw simulated observations are not persisted in the
setup or results exports. Exported results are not currently re-importable.

## Next work

1. **Quick Start and dictionary:** Add an approachable workflow guide, initially
   considering its placement in Help & dictionary. Audit the interface for
   technical terms such as `pp`, GM, CE, projection, safe boundary and random
   seed; add explanations and links in small reviewable groups. Explain that
   numerical intervals describe Monte Carlo sampling only. Include an
   explanation of reproducibility and how the seed, batch size and numerical
   backend affect repeatability.
2. **Refresh supporting documentation:** Review the analytical and simulation
   READMEs for stale statements about UI connections and worker availability.
   Keep the codebase guide and export documentation aligned with actual behavior.
3. **Numerical and product verification:** Complete the time-step, projected
   policy and borrowing comparisons above; then review responsive layouts,
   keyboard access, both themes and the static GitHub Pages deployment. Record
   platform coverage and known limitations.
4. **Developer panel:** Review which diagnostics and event-log information are
   useful. If “Last prepared options” stays, make its coverage of Evaluation
   and Data & tables clear and consistent.
5. **Localization:** Implement the English/German language switch using
   maintainable translations, and check both languages in the responsive UI.
6. **Further numerical features:** Specify historical stress scenarios before
   implementing them. Evaluate antithetic sampling as a separate experiment,
   including its effect on uncertainty estimates and paired comparisons.
7. **Repository and deployment naming:** Plan the requested eventual rename to
   `pension-funding-simulator` and the resulting GitHub Pages URL. Before any
   rename, review repository references, the Pages base path, asset and worker
   URLs, deployment configuration and the effect on existing links. The timing
   and execution of that external change remain a later task.

The [future-improvements list](future-improvements.md) remains a convenient
collection of ideas; this roadmap records where each currently fits. These
items are not a fixed schedule and do not imply a deployment now.
