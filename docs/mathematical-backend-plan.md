# Mathematical backend: incremental implementation plan

This plan is a working roadmap, not a specification of unverified mathematical results. Implement one milestone at a time, review its outputs and tests, and adjust the following steps when necessary. The Next.js website remains independent of the research project. Model logic belongs in framework-independent TypeScript modules; React presents inputs, progress and results.

## Starting point

The website has editable market and investor inputs, validated simulation options, six preprocessed cohort tables, and a development panel. It does not yet fit mortality, calculate policies, run simulations, import market data, or persist settings. Existing plots are illustrative. A snapshot is currently prepared when Run simulation is clicked, but no simulation is started.

The research project is a reference, not a runtime dependency. Before porting any formula or algorithm, read the current relevant paper passage and MATLAB implementation, check definitions and conditions, and record where the website implementation came from. Use existing reference outputs when suitable; running or changing research code requires whatever authorization its project instructions specify. Research work remains separate from the website.

## Working agreement for each milestone

1. State inputs, outputs, units, mathematical conventions, assumptions and failure cases before implementation.
2. Implement a small pure calculation or a small interface connection, with readable names and documentation.
3. Verify against hand-checkable examples, invariants, and, when available, appropriately matched MATLAB reference data. Record tolerances and any intentional differences.
4. Show real results only where supported; keep other views explicitly marked as not calculated. Review the numerical output and UI together before proceeding.

## Milestones

### 1. Numerical conventions and reference cases

Document the meaning of nominal return, inflation, real drift and rate, covariance, market price of risk and the paper's convention for rho. Separate input validation from assumptions that restrict only specific results. Identify small, versioned reference cases and their provenance; do not invent expected outputs.

**Check:** Compare the website's interpretation of input units and asset order with the research implementation. Agree on edge cases, including zero and negative Merton-direction components, before translating dependent formulas.

### 2. Market calibration from manual inputs

Derive the real market quantities, covariance matrix and Merton direction from validated inputs. Use a stable linear solve rather than explicitly inverting the covariance matrix. Report numerical failures and assumption diagnostics without disabling unrelated results.

**Check:** Compare a two-asset case against the corresponding research calibration and check a higher-dimensional case and invalid or ill-conditioned matrices. Show the derived values in the developer panel first.

### 3. Cohort loading and survival targets

Load the appropriate packaged cohort tables and construct remaining-lifetime survival from retirement age. Support male, female and custom mixtures. A custom mixture combines the sex-specific survival curves, not annual death probabilities; the source's open-ended 100+ row is not a one-year mortality probability.

**Check:** Verify survival starts at one, stays within bounds and is non-increasing; compare selected cohorts and mixture endpoints with source data and suitable reference values. Make loading, missing data and unsupported ages visible in the mortality panel.

### 4. Mortality models and fit diagnostics

Implement and verify the model survival functions and annual-grid fit objective first, then the Gompertz–Makeham and market-compatible compactified-exponential fits in separate small changes. Specify optimizer tolerances, initializations, convergence failures and the treatment of the final survival bin. The compatible fit must be invalidated when relevant market or mortality inputs change.

**Check:** Compare survival curves, fit losses and fitted parameters against matched reference cases; distinguish optimizer failure from a poor fit. Connect the real curves and quantitative diagnostics to the mortality panel. Do not assign qualitative fit grades until defensible thresholds have been agreed.

### 5. Unconstrained policy and analytic quantities

Port the safe boundary, compatible policy and withdrawal/risk relationship in independently tested pieces. Respect which of target risk and withdrawal is the input; do not present a quantity as available when the necessary inputs or assumptions are missing. Implement result-specific assumption checks, including the conditions behind global simplex feasibility.

**Check:** Compare boundary values, limiting cases and selected results with reference cases. Connect one verified result at a time, with the correct applicability message and status.

### 6. Execution state and reproducibility foundation

Define a versioned run snapshot with seed, numerical settings, market and mortality inputs, model/algorithm versions and relevant data provenance. Add dependency-aware result states and preserve the snapshot used by each run. Agree on random-number generation and reproducible stream handling before simulation.

**Check:** Identical snapshots should lead to identical generated random streams under the documented implementation; changing a relevant input marks only dependent results outdated. Persisting/exporting full results can come later.

### 7. Worker and interruption flow

Add a Web Worker interface with a small deterministic test task, structured progress messages and cancellation. Editing inputs leaves the current task running on its captured snapshot; starting a replacement asks for confirmation before interrupting. Keep the UI responsive and report errors explicitly.

**Check:** Exercise completion, cancellation, failed jobs, editing during a run and a late message from an obsolete job. Confirm the correct snapshot and status remain attached to each result. Add ETA only if enough measured progress exists for a meaningful estimate.

### 8. Reproducible financial-path simulation

Implement the unconstrained wealth process in small stages: seeded increments, one-step behavior, boundary handling and then multiple paths. Review time discretization, first-passage detection and stopping rules against the current research implementation rather than treating a grid crossing as exact. Make recording full trajectories optional.

**Check:** Use deterministic increment tests and appropriate stochastic tests, compare against reference cases and analytic benchmarks, and study time-step and path-count sensitivity separately. Benchmark representative desktop and mobile workloads before choosing a numerical library or WebAssembly.

### 9. First Monte Carlo result

Implement the GM-reference impoverishment-risk estimator with its horizon, survival weighting and Monte Carlo uncertainty. Be explicit about sampling units if antithetic paths are used. Keep sampling uncertainty separate from time-step, crossing and horizon errors.

**Check:** Compare matched scenarios against research outputs within appropriate statistical uncertainty; test intervals, non-hits and edge cases. Connect the estimated GM risk card, with the target-risk comparison only where meaningful.

### 10. Projection and paired comparisons

Specify and implement projection onto the appropriate multi-asset simplex, including boundary and numerical-tolerance behavior. Apply it as a feasible comparison policy, without presenting it as the constrained optimum. Simulate the projected and unprojected policies using matched market randomness where appropriate.

**Check:** Verify feasibility, idempotence and representative cases in two and more dimensions; independently verify projection optimality conditions. Validate the paired GM-risk difference and its uncertainty before connecting the projected mini-cards and policy comparison.

### 11. Additional diagnostics and charts

Add borrowing exposure and feasible-strategy diagnostics, then the impoverishment-time density/cumulative display and conditional update, each as separate increments. Specify what is conditioned on and whether existing outputs suffice before promising age changes without resimulation. Add optional trajectories only after the core results are reliable.

**Check:** Compare small cases and boundary events to reference results; distinguish statistical uncertainty from discretization and modeling error. Keep impoverishment and borrowing visuals adjacent as designed.

### 12. Scenario tables

Define each table's independent inputs, applicable outputs and calculation dependencies. All rows share the market and investor baseline; row edits affect their own outputs, while shared changes invalidate dependent rows. Compute rows asynchronously with individual statuses and the same interruption rules.

**Check:** Exercise mixed completed, pending, invalid and outdated rows; verify policy-specific unavailable cells and compare individual rows with the corresponding single-scenario results.

### 13. Market CSV calibration

Implement date/price parsing and validation for EUR adjusted-close time series, then historical estimation as a separate change. Define return conventions, annualization, missing dates, sample window and uncertainty method before coding. Enable historical diagnostics only after successful CSV calibration; define stress scenarios as recalibrations with their assumptions rechecked.

**Check:** Test with the packaged synthetic CSV and small hand-checkable data, including malformed and missing values. Compare estimates with independently computed references and identify that sample estimates need not equal the generating parameters.

### 14. Persistence, export and finishing work

Save editable settings locally with schema versioning and recovery from invalid or old data. Provide distinct scenario and result exports, with the metadata necessary to reproduce and interpret runs. Add translations and accessible explanations incrementally.

**Check:** Reload and restore settings; round-trip exported scenarios and results, verify version handling and ensure the seed and provenance identify the run. Test static GitHub Pages deployment, accessibility, responsive layouts and both themes.

## Cross-cutting decisions

- Keep simulation confidence intervals specific to Monte Carlo sampling. Display historical parameter uncertainty and time-step or boundary approximation separately.
- Use the development panel for numerical inspection and bounded diagnostic logs; never rely on it as the only place users see relevant errors or result status.
- Do not silently repair invalid covariance matrices, claim a projected policy is optimal, or label a fit good or bad without an agreed criterion.
- Prioritize readable, documented numerical code. Consider matrix packages or WebAssembly only after profiling the real workload and verifying results against the same tests.
