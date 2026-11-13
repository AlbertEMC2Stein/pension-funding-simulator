# Pension funding simulator

**How much can you withdraw each year in retirement while accepting a chosen
risk that your savings fall below a threshold you set?**

Explore this question using assumptions about investment returns, inflation and
longevity, and compare the effects of portfolio constraints. Alternatively,
choose a withdrawal amount and estimate its associated risk.

A client-side pension funding simulator built with Next.js and exported as a
static website for GitHub Pages. It combines market calibration, cohort-based
mortality fitting, analytical calculations and Monte Carlo simulation. The
website runs independently of the separate research project.

## Using the application

1. Under **Market & investor**, review the market and investor inputs. Enter up
   to ten assets and their correlations manually, or import a local CSV of
   adjusted closing prices in euros. Review the market checks and mortality fit.
2. Under **Evaluation**, choose the withdrawal approach and policy, configure
   simulation settings, and run the simulation. Analytical CE results, GM risk,
   allocation, timing, borrowing and optional sample trajectories are displayed
   where their assumptions permit.
3. Under **Data & tables**, compare variations using the shared market,
   mortality and simulation settings. Export the table or completed results.
4. Use **Help & dictionary** for a quick start, explanations and technical
   definitions. The main interface supports English and German, and light and
   dark themes.

Editable inputs and table configurations are stored in browser local storage;
language and theme preferences are saved separately. On startup, valid default
or restored inputs trigger a background mortality fit. Fits and simulation
results are not restored. Importing a setup clears existing fits and results;
fit the imported inputs and run simulations to calculate new results.

Setup JSON contains inputs and table configurations, not results or the
original price data. Results JSON, table CSV, and chart PNG, SVG and CSV exports
are separate. See [setup files](docs/setup-file.md), [results exports](docs/results-export.md)
and [historical CSV import](docs/historical-market-import.md) for details.

The model and its results depend on the inputs and assumptions. Simulations use
a finite horizon and numerical approximations; Monte Carlo intervals describe
sampling uncertainty only. Results are model estimates, not guarantees.

## Run locally

Requires Node.js 20.9 or later and npm. Install dependencies with `npm ci`,
run `npm run dev`, and open the printed local address. `npm run typecheck`
checks TypeScript, `npm test` runs the automated suite, and `npm run build`
generates the static site in `out/`. The development, test and build commands
bundle the web workers first; restart the development server after changing
worker code or its dependencies.

For a GitHub Pages project under a repository subpath, set
`NEXT_PUBLIC_BASE_PATH` at **build time**, for example:

```sh
NEXT_PUBLIC_BASE_PATH=/pension-funding-simulator npm run build
```

Leave it unset for a site at the domain root. Serve `out/` over HTTP rather
than opening `out/index.html` directly.

## GitHub Pages deployment

`.github/workflows/deploy-pages.yml` tests and builds the static export and
deploys it to GitHub Pages on pushes to `main` or a manual workflow dispatch.
The workflow currently sets the base path to `/pension-funding-simulator`.
In the repository's **Settings → Pages**, choose **GitHub Actions** as the
source. If the repository is renamed, update the workflow's base path and
check asset, worker and existing link URLs before deploying.

## Code and documentation

- [Codebase guide](docs/codebase-guide.md): navigation, data flow, workers and
  module boundaries.
- [Implementation plan](docs/mathematical-backend-plan.md): current coverage,
  limitations and possible next work.
- [Market calibration](docs/market-calibration-specification.md) and
  [historical CSV import](docs/historical-market-import.md): conventions,
  validation and estimation.
- [Financial model](src/lib/model/README.md),
  [analytical calculations](src/lib/model/analytical/README.md) and
  [simulation](src/lib/model/simulation/README.md): mathematical and numerical
  implementation notes.
- [Cohort data](public/data/mortality/README.md): bundled data format and
  provenance. The site does not access the research repository at runtime.
- [Interface translations](src/lib/i18n/README.md): maintaining English and
  German copy and dictionary entries.

The developer-only panel offers independent worker-check settings, live input
and market inspection, and captured Evaluation and table worker requests. It is
not included in the production navigation. The original design-only prototype
is archived in `design-draft/` and is independent of the Next.js application.

## Editing colors

The palette is defined in [palette.css](src/app/styles/theme/palette.css).
Edit the `:root` variables for light mode and `:root[data-theme="dark"]` for
dark mode. The remaining theme files apply these tokens; some decorative
details also use styles or inline SVG.

In mathematical notation, write the exponential base upright as `\mathrm{e}`
and use `\ln` for the natural logarithm.
