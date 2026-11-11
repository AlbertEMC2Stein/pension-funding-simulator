# Codebase guide

This website is a static-exported Next.js application. The research project is
a separate reference, not a runtime dependency. The interface combines working
calibration and mortality-fit features with illustrative evaluation content;
check the notes below before treating a displayed value as a simulation result.

## Start here

1. [`src/app/page.tsx`](../src/app/page.tsx) loads the application shell,
   [`SimulatorDraft.tsx`](../src/components/SimulatorDraft.tsx), which owns
   workspace navigation and short notices.
2. [`SimulationDraftContext.tsx`](../src/components/SimulationDraftContext.tsx)
   shares editable market, investor and simulation inputs for the current page
   session. Reloading currently loses those inputs.
3. [`Setup.tsx`](../src/components/setup/Setup.tsx) renders market and investor
   tabs. [`MarketEditor.tsx`](../src/components/setup/MarketEditor.tsx) edits
   assets and correlations and handles local CSV imports.
4. [`Evaluation.tsx`](../src/components/evaluation/Evaluation.tsx) holds the
   evaluation controls and illustrative results. Requesting a run currently
   prepares validated options; it does not launch a financial simulation.
5. [`DataView.tsx`](../src/components/DataView.tsx) contains comparison-table
   examples and import/export placeholders. [`HelpView.tsx`](../src/components/HelpView.tsx)
   contains the searchable dictionary and mathematical examples.

## Inputs and calibration

Editable amounts and percentage fields may be incomplete strings. The
[`market`](../src/lib/market/) modules define those drafts, their update and
validation rules, manual market calibration, and historical CSV estimation.
Imported CSV prices are local to the browser; the [import specification](historical-market-import.md)
describes missing data, units and estimation intervals. The asset order is
shared by all market vectors and both covariance axes.

[`simulation-options.ts`](../src/lib/options/simulation-options.ts) converts
the shared draft into validated numerical options. Rates become decimal
fractions and monetary amounts become numbers. These options are not yet a
complete reproducible run snapshot.

## Mortality and analytical model

[`cohort-survival.ts`](../src/lib/mortality/cohort-survival.ts) loads and
combines the packaged cohort tables under `public/data/mortality/`. A mixture
combines conditional survival curves rather than annual death probabilities.
[`CohortChart.tsx`](../src/components/setup/CohortChart.tsx) plots those curves
and starts [`mortality-fit.worker.ts`](../src/workers/mortality-fit.worker.ts)
to fit GM and market-compatible CE models. The worker is bundled by
`scripts/build-workers.mjs`; development, build and test scripts run that step.
The remaining [`mortality`](../src/lib/mortality/) modules provide survival
laws, KL loss, fit status and optimizer integration.

[`model/analytical`](../src/lib/model/analytical/) contains standalone
safe-boundary, withdrawal and compatible CE policy calculations. Its
[README](../src/lib/model/analytical/README.md) records source references,
assumptions, units and limitations. [`numerics`](../src/lib/numerics/) holds
shared optimization and distribution-quantile helpers.

## Financial simulation status

[`model/simulation`](../src/lib/model/simulation/) contains an experimental
scalar reference, a provisional snapshot builder and a batched TensorFlow.js
prototype. Its [README](../src/lib/model/simulation/README.md) explains the
current contracts. These modules are not yet connected to the application or
a financial-simulation worker. They check impoverishment at grid points only;
bridge detection, mortality-weighted risk, projection and production
reproducibility remain future work. The TensorFlow CPU comparison is tested;
WebGPU behavior and performance have not yet been verified in a browser.

## Styling and verification

[`src/app/layout.tsx`](../src/app/layout.tsx) imports CSS in cascade order:
`base/` layout, `theme/` colors and `adjustments/` refinements. Modify the
light and dark theme tokens in [`palette.css`](../src/app/styles/theme/palette.css).
The developer panel's CSS module is scoped to that panel. The archived
`design-draft/` is independent of the current application.

Use `npm run typecheck` for TypeScript, `npm test` for the automated suite,
and `npm run build` for a static-export build. Tests live in `tests/`; scripts
for generating example market data and preparing cohort data live in `scripts/`.
The [implementation plan](mathematical-backend-plan.md) tracks future model
work and result-specific checks.
