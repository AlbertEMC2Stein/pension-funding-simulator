# Codebase guide

This is a static-exported Next.js application. Calibration, mortality fitting,
analytical results and financial simulation run in the browser; the separate
research project is not a runtime dependency.

## Start here

1. [`src/app/page.tsx`](../src/app/page.tsx) loads the application shell,
   [`SimulatorDraft.tsx`](../src/components/SimulatorDraft.tsx), which manages
   workspace navigation and notices.
2. [`SimulationDraftContext.tsx`](../src/components/SimulationDraftContext.tsx)
   shares editable inputs, setup and table state across the views.
   [`saved-draft.ts`](../src/lib/options/saved-draft.ts) handles local recovery;
   [`display-preferences.ts`](../src/lib/options/display-preferences.ts) stores
   language and theme separately.
3. [`Setup.tsx`](../src/components/setup/Setup.tsx) renders market and investor
   tabs. [`MarketEditor.tsx`](../src/components/setup/MarketEditor.tsx) edits
   assets and correlations, imports local CSV prices and displays their
   estimation diagnostics. [`CohortChart.tsx`](../src/components/setup/CohortChart.tsx)
   presents cohort survival and mortality fits.
4. [`Evaluation.tsx`](../src/components/evaluation/Evaluation.tsx) combines
   analytical charts and diagnostics with simulated results. Run controls and
   result cards live alongside it in `evaluation/`.
5. [`DataView.tsx`](../src/components/DataView.tsx) provides the two comparison
   tables. Their captured inputs, two-worker queue and result reuse are managed
   in [`comparison/`](../src/components/comparison/).
   [`HelpView.tsx`](../src/components/HelpView.tsx) contains the quick start
   and searchable dictionary.

## Inputs and calibration

Editable amount and percentage fields can contain incomplete strings. The
[`market`](../src/lib/market/) modules define draft updates and validation,
manual calibration and historical CSV estimation. Imported prices stay in the
browser. The [CSV specification](historical-market-import.md) describes units,
missing data and estimation intervals. Asset order is shared by market vectors
and both covariance axes.

[`simulation-options.ts`](../src/lib/options/simulation-options.ts) validates
the shared draft and converts display inputs into numerical options. A run also
captures the calibrated market, mortality fits and numerical configuration in
a snapshot. [`run-configuration.ts`](../src/lib/model/simulation/run-configuration.ts)
validates that boundary, including transferred worker inputs.

## Mortality and analytical model

[`cohort-survival.ts`](../src/lib/mortality/cohort-survival.ts) loads the
packaged tables under `public/data/mortality/`; a mixture combines conditional
survival curves rather than annual death probabilities. The fitting worker
fits GM and market-compatible CE models using annual death bins and the final
survival tail. Valid default or restored inputs start a background fit; a setup
imported during the session must be fitted manually.

[`model/analytical`](../src/lib/model/analytical/) contains the safe boundary,
compatible CE policy, feasibility, projection and Durbin calculations. Its
[README](../src/lib/model/analytical/README.md) records assumptions, units and
limitations. [`numerics`](../src/lib/numerics/) holds shared optimization,
integration and quantile helpers.

## Financial simulations

[`model/simulation`](../src/lib/model/simulation/) contains the snapshot,
TensorFlow.js batch simulation, scheduler and scalar legacy reference. The
[simulation guide](../src/lib/model/simulation/README.md) describes the
contracts and numerical approximations. The TensorFlow implementation runs in
[`financial-simulation.worker.ts`](../src/workers/financial-simulation.worker.ts)
and is used by Evaluation and the comparison tables. It selects WebGPU, WebGL
or CPU in preference order and reports progress between batches. Cancellation
is observed between batches.

The worker estimates mortality-weighted risk using approximate first-hit times;
the projected policy uses Euler steps and a separate bridge approximation.
Uncertainty intervals describe Monte Carlo sampling, not discretization,
bridge, model or parameter uncertainty. The finite run horizon may omit part
of the GM mortality tail.

[`scripts/build-workers.mjs`](../scripts/build-workers.mjs) bundles both the
financial and mortality-fit workers into `public/workers/` before development,
tests and builds. The generated worker directory is not source code.

## Results, language and styling

Setup export and import are handled by [`setup-file.ts`](../src/lib/options/setup-file.ts)
and [`SetupFileActions.tsx`](../src/components/SetupFileActions.tsx). The
[setup](setup-file.md) and [results](results-export.md) format notes explain
what is retained, exported or cleared. Results are marked outdated when their
captured inputs no longer match the current inputs.

[`src/lib/i18n/`](../src/lib/i18n/) contains interface copy and translation
helpers; [`src/lib/help/`](../src/lib/help/) contains the glossary. See the
[translation guide](../src/lib/i18n/README.md). The developer panel is English.

[`src/app/layout.tsx`](../src/app/layout.tsx) imports CSS in cascade order:
`base/`, `theme/` and `adjustments/`. Modify the light and dark theme tokens in
[`palette.css`](../src/app/styles/theme/palette.css). The developer panel's CSS
module is scoped to that panel. The archived `design-draft/` is independent of
the current application.

## Verification

Use `npm run typecheck`, `npm test` and `npm run build`. Automated tests live in
`tests/`; scripts for example market data and cohort preparation live in
`scripts/`. The [implementation plan](mathematical-backend-plan.md) records
remaining numerical, browser and deployment checks and future ideas.
