# Stillwell interface draft

This project contains a Next.js static-export version of the interface draft. Evaluation charts remain illustrative; the mortality panel displays cohort survival data and fitted models. The market panel can import local historical prices. Experimental scalar and TensorFlow simulation modules exist, but are not connected to the interface; settings are not yet saved across reloads.

The market panel supports local editing of asset names, expected annual nominal growth (an annualized compounded rate), volatilities, the effective nominal risk-free rate, inflation, and a symmetric correlation matrix. Edit the lower triangle; the upper triangle mirrors it and the diagonal remains fixed at one. The initial two-asset example uses the paper's 0.08 correlation; adding an asset assumes zero correlation until changed. The default 2.5% nominal risk-free rate and 2% inflation imply approximately 0.489% real continuously compounded; changing either input updates the real rate. Inputs are validated but are not yet connected to simulation results or saved across reloads. The current analytical model requires a positive real risk-free rate and positive asset volatilities. The matrix check rejects matrices that are not positive definite or are numerically near-singular.

Reset to example restores the example market, with an undo available until another market input is edited. A local CSV import estimates growth, volatility and pairwise correlations from adjusted EUR prices using calendar-time intervals; importing replaces the asset assumptions and can also be undone. The import reports coverage and model-based estimation intervals, which are not forecasts.

The accepted CSV format and estimator are documented in [historical-market-import.md](docs/historical-market-import.md).

## Run locally

Requires Node.js 20.9 or later and npm. Install dependencies with `npm ci`, then run `npm run dev` and open the local address printed by Next.js. Use `npm run build` to type-check and generate the static site in `out/`; `npm test` runs the automated tests.

For a GitHub Pages project hosted under a repository subpath, set `NEXT_PUBLIC_BASE_PATH` to that path at **build time**, for example `NEXT_PUBLIC_BASE_PATH=/pension-funding-simulator-website npm run build`. Leave it unset for a site at the domain root. The exported files need to be served by an HTTP server rather than opened as `out/index.html` directly.

## GitHub Pages deployment

The repository includes `.github/workflows/deploy-pages.yml`. A push to `main` runs the type-check and tests, builds the static export with `/pension-funding-simulator-website` as its base path, and deploys `out/` to GitHub Pages.

One-time setup after creating the GitHub repository:

1. Push this repository to `AlbertEMC2Stein/pension-funding-simulator-website`.
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open **Actions** and watch the `Deploy Next.js site to GitHub Pages` workflow. When it succeeds, the site is available at `https://albertemc2stein.github.io/pension-funding-simulator-website/`.

The existing `AlbertEMC2Stein/albertemc2stein.github.io` repository is the account-level site and is intentionally not used or replaced by this project deployment.

The original standalone prototype is preserved in `design-draft/`; open `design-draft/index.html` to view it. The Next.js application is in `src/` and has its own styles in `src/app/styles/`, so it does not depend on the archived files. The interface is divided into a shell, evaluation, setup, data, and help components. Future model calculations should live in framework-independent modules rather than UI components.

The preprocessed cohort mortality tables live in `public/data/mortality/`. Their [format and provenance](public/data/mortality/README.md) are documented alongside them. The mortality panel loads the selected cohort and plots annual survival probabilities conditional on retirement; the optional mixture combines the two conditional survival curves. A worker fits GM and compatible CE models to the annual death bins and survival tail using KL divergence. These fits are not yet connected to the pension simulation.

The Next.js dictionary uses the locally installed KaTeX package for its sample equations. The original standalone `design-draft/index.html` still loads KaTeX from jsDelivr and needs an internet connection for rendered equations; otherwise it shows their source.

Mathematical notation conventions: write the exponential base upright as `\mathrm{e}` to distinguish it from variables, and use `\ln` for the natural logarithm.

## Code guide

For a guided tour of the data flow and implementation status, see the
[codebase guide](docs/codebase-guide.md).

- `src/app/` contains the Next.js entry point and global layout. `src/app/styles/` separates original layout rules (`base/`), palette and theme rules (`theme/`), and newer interface adjustments (`adjustments/`). `layout.tsx` imports them in cascade order; keep that order when moving rules.
- `src/components/SimulatorDraft.tsx` owns panel navigation and temporary notices. `SimulationDraftContext.tsx` shares editable simulation inputs between panels during the current page session.
- `src/components/evaluation/` contains the illustrative evaluation cards and their display controls. The displayed charts and results are not calculations.
- `src/components/setup/Setup.tsx` owns the market and investor tab state. `MarketEditor.tsx` presents the asset and correlation inputs and passes edits back to its parent.
- `src/lib/market/` contains market-input editing, validation, calibration and historical CSV estimation. Calibrated market parameters are used by the compatible mortality fit as well as Developer tools.
- `src/lib/options/` validates the complete draft and converts percentages to decimal fractions and euro amounts to numbers. Clicking Run simulation prepares options but does not start a financial simulation.
- `src/lib/mortality/` contains cohort survival, GM and compactified-exponential survival functions, the GM quantile, fit status and mortality fitting. `src/lib/numerics/` holds reusable numerical helpers, including the optimizer and confidence-interval quantiles.
- `src/lib/model/` contains analytical calculations and initial scalar and TensorFlow financial-path prototypes. Its [model guide](src/lib/model/README.md) explains their boundaries and the [simulation guide](src/lib/model/simulation/README.md) describes what is and is not implemented.
- `src/workers/mortality-fit.worker.ts` runs mortality fits away from the UI. `npm run dev`, `npm run build` and `npm test` bundle it into `public/workers/` first; this generated directory is ignored. Restart the development server after changing worker source or its imports.
- `src/components/DataView.tsx` and `HelpView.tsx` implement the example tables and searchable dictionary. `common.tsx` provides shared presentation components and shell actions.
- `tests/` covers calibration, mortality calculations, input validation, worker behavior, draft rendering, and initial scalar/TensorFlow CPU simulation comparisons. It does not yet verify WebGPU or the visual layout in a browser.

Current UI state is held in memory and is lost on reload. Setup and results import/export, translation, frontend-connected financial simulations, and comprehensive result-state updates are still future work. Validated UI options are not yet connected to the experimental run snapshot and its seed, fitted parameters and provenance.

In `npm run dev`, the workspace navigation also contains Developer tools. It shows the current input draft, validation, the last prepared options snapshot, and a local event log capped at 100 entries. It does not capture browser console output; future calibration and worker events can be added explicitly. The panel is excluded from production builds.

## Editing the colors

The named palette for the Next.js app is in `src/app/styles/theme/palette.css`. Change the values under `:root` for the light theme and under `:root[data-theme="dark"]` for the dark theme. The other theme files apply these tokens to the interface. Some decorative details remain in the base styles and inline SVG; this prototype is not yet a complete theme system.

## Production direction

Keep presentation colors in semantic theme tokens, including charts and status colors. Store the theme preference locally and respect the user's system preference when no choice has been saved. Check both themes for readable contrast.

Keep user-facing text in English and German translation files rather than embedding it in components. Use stable message keys, language-aware formatting for numbers, dates and currencies, translated accessibility labels, and layouts that accommodate different text lengths. Allow the user to select and persist a language. Neither translation nor preference storage is implemented in this draft.
