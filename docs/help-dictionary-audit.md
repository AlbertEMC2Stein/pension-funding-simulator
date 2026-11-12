# Help and dictionary audit

Audit: `20261112-222747Z-website-help`  
Scope: user-facing website copy, dictionary links and panel help, with a targeted
reading of the mathematical manuscript and website implementations. This is a
proposal for review, not a formal mathematical review or a set of implemented
UI changes.

## How to read this audit

- **First:** needed to understand an input or a prominent result.
- **Next:** important when using a specific visual or comparison.
- **Technical:** useful inside an expandable explanation; do not make it a
  prerequisite for the basic workflow.
- A **dictionary link** explains a reusable term. A **panel popup** explains
  what a whole panel shows, how to read it and its main limitations. Short
  existing inline hints should remain where they prevent mistakes.

The existing dictionary has five entries: impoverishment level, safe boundary,
projection, target risk and GM risk. The interface currently links only a few
of these, and the GM-risk card is the only result card with a dedicated `?`
popup. The market and mortality data-source dialogs already explain their
sources; these are useful, but do not replace explanations of the respective
inputs or plots.

## Market and investor inputs

| Priority | Term or group | Proposed plain-language explanation and placement |
| --- | --- | --- |
| First | **Nominal and real; inflation** | Nominal amounts and returns are expressed in money of the time; real amounts account for the selected inflation assumption. Explain the nominal cash rate and its derived real rate together, next to the market inputs. The model uses a continuously compounded real rate. |
| First | **Risk-free rate** | The model's return on its risk-free asset, before or after inflation as labeled. “Risk-free” is a modeling assumption, not a promise that a real product's rate or purchasing power is guaranteed. |
| First | **Expected annual growth** | The annual compounded growth assumption used for each asset. Explain the current convention carefully: it is based on log growth, not simply the arithmetic drift or expected one-year percentage price return. The imported estimate is historical and is not a forecast. |
| First | **Volatility** | A measure of how much an asset's modeled returns fluctuate; a larger value generally means wider modeled fluctuations, not a guaranteed loss or gain. |
| First | **Correlation and correlation matrix** | How modeled asset returns move together: positive means they tend to move in the same direction, negative in opposite directions, and zero means no linear correlation under the model. Explain the fixed diagonal, mirrored entries and why some combinations cannot form a usable matrix. Zero is not a guarantee of independence. |
| First | **Adjusted closing price** | A historical closing-price series adjusted for corporate events such as splits and distributions, already converted to euros. The importer does not perform these adjustments or currency conversion. Keep the existing source dialog and CSV format instructions. |
| Next | **Estimation uncertainty and 95% intervals** | An interval reflects uncertainty in estimating a historical model parameter from the available sample, under the stated assumptions. It is neither a forecast range for future returns nor the same uncertainty as a Monte Carlo interval. A 95% procedure describes repeated-sampling coverage, not a 95% probability that the fixed parameter lies in this particular interval. |
| Next | **Intervals, coverage and longest gap** | Explain that intervals are return observations, coverage is their total elapsed calendar time and longest gap is the largest observation interval. Asset pairs use their own common dates; data are not imputed. |
| Next | **Covariance; positive definiteness** | Link these technical terms from the market checks and imported-data diagnostics. Covariance combines each asset's volatility and pairwise correlation. Positive definiteness means the combined assumptions define a usable non-degenerate covariance matrix; explain an error in plain language rather than presenting a matrix theorem as a prerequisite. |
| Next | **Merton vector; market risk premium ρ** | Introduce as derived model quantities, not portfolio weights or ordinary percentage returns. A negative Merton component implies a negative allocation to that asset in the unconstrained risky region. Explain why ρ = 0 and a negative component affect different results. Keep formulas in technical details. |
| First | **Cohort and longevity scenario** | A cohort groups people by birth year. The German tables combine observed and projected mortality; low/medium/high are population scenarios, not individual predictions. Link the existing “About the data” dialog. |
| First | **Mortality mixture and survival probability** | The mix slider weights the female and male *conditional survival curves*, with 0 female and 1 male. Survival here starts at the chosen retirement age and is conditional on reaching it. It is not an automatic population-weighted estimate or the probability of dying at an exact age. |
| First | **Mortality fit; GM and CE** | Fitting chooses model parameters to approximate the cohort data. GM is the reference mortality model used for simulation results; CE is a market-compatible mortality model used for analytical policy and risk calculations. Neither is a prediction of an individual's lifespan. Explain why changing relevant market inputs requires reviewing the CE fit. |
| Technical | **Hazard rate; mortality endpoint; GM α, β, λ and CE δ, T** | Define a hazard as an instantaneous rate conditional on survival. Distinguish the CE endpoint T (years after retirement) from a random death time and from the cohort-data cutoff at age 100. GM's α is a mortality parameter and is not the target-risk α. |
| Technical | **KL divergence, largest survival difference, optimizer convergence** | KL compares annual death-probability bins plus the final survival tail; smaller values describe a closer fit according to that criterion, not predictive accuracy. The largest difference is on the annual survival grid. “Converged” reports optimizer behavior, not fit quality. Do not invent red/green fit grades without agreed thresholds. |

## Evaluation: settings and results

| Priority | Term or group | Proposed explanation and placement |
| --- | --- | --- |
| First | **Starting capital, annual withdrawal and impoverishment level** | Starting capital is wealth at retirement. Withdrawal is the modeled constant real amount per year, net of any modeled income; it is not the same as the starting balance. Impoverishment is reaching the chosen threshold, not necessarily zero wealth. Link the existing entry from its other occurrences. |
| First | **Target risk α and model-derived withdrawal** | The target is a chosen CE-model lifetime-impoverishment probability. In target-risk mode the model derives a withdrawal; in custom-withdrawal mode it derives the CE risk. The analytical target pertains to the unconstrained CE policy under its assumptions; it is not a guarantee for GM mortality or the projected policy. |
| First | **Unconstrained policy and projection** | The unconstrained strategy can involve borrowing or short positions. The projected version adjusts weights to prohibit both, but is a feasible comparison, not a proven optimum for the constrained problem. Existing projection entry needs links from the policy selector and relevant charts. |
| First | **Global feasibility; ζ** | Global feasibility asks whether a strategy respects the no-short/no-borrow constraints throughout the relevant risky region, not whether a particular simulated path borrows. For the unconstrained CE strategy, the ζ comparison requires the Merton sign assumptions; ζ > 1 means borrowing is possible somewhere, not certain. Projected feasibility follows from its construction. Explain that “Make globally feasible” changes the impoverishment level while retaining the chosen target input. |
| First | **CE risk versus estimated GM risk** | Explain why the mortality-model estimate can differ from the analytical CE reference. GM risk is a simulation estimate through the CE run horizon; it does not automatically include the later GM survival tail. The GM card already has a popup, but its dictionary entry and links can be expanded. |
| First | **Percentage points (`pp`) versus percent** | A move from 5% to 6% is +1 percentage point, but a 20% relative increase. Use this at GM differences, projection contributions and diagnostics. Also explain that the capital table's 0.95α and 1.05α are relative 5% changes in risk, not changes of five percentage points. |
| First | **Simulation paths, time step and batch size** | Paths are alternative model-generated financial histories. More paths can reduce sampling noise; smaller time steps can change numerical approximation error. Batch size groups work for performance and progress, not a direct risk preference. |
| Next | **Monte Carlo estimate, standard error and 95% MC interval** | Simulation averages uncertain path outcomes; the standard error measures sampling variability. An approximate 95% interval describes sampling uncertainty under the simulation procedure. It does not include mortality/model misspecification, uncertain market inputs, time-step or bridge error, or events beyond the horizon. Do not call it a guarantee. |
| Next | **Random seed and repeatability** | A seed initializes the random stream. Keeping the seed alone does not guarantee identical paths or results if the number of paths, batch sequence, algorithm or backend changes. Table rows use separate derived streams; projected comparisons use paired paths. Link the existing seed disclosure to a fuller dictionary entry. |
| Next | **Capital needed without risk-taking; capital relief/surplus** | Compare the current starting capital with the safe boundary at retirement for the *same annual withdrawal*. Capital relief is the difference when accepting positive CE risk reduces the needed capital. At zero risk, surplus means capital above that safe minimum. The current comparison applies only to the unconstrained CE policy. |
| Next | **Portfolio allocation and risky/risk-free fractions** | Each curve is a share of total wealth at a selected time and wealth level, not euros invested or a forecast allocation over time. Negative risky shares mean short positions; a negative risk-free share means borrowing. A total risky share over 100% requires borrowing when risky shares are non-negative. The vertical initial-capital line applies at retirement only. |
| Next | **Borrowing probability and expected time** | Ever borrowing means borrowing while alive before impoverishment or the run horizon. Expected time is averaged over all paths, including paths that never borrow; it is not the average duration conditional on borrowing. The first-borrowing bridge and occupation interpolation have distinct approximation limitations. |
| Next | **Forecast versus conditional update** | Forecast at age `a` is risk from `a` to the horizon as assessed at retirement. Conditional update is risk from `a` to the horizon given survival *and no earlier impoverishment* to `a`. It does not use observed current wealth or recalibrate the portfolio. Both use the simulated horizon. |
| Next | **Remaining risk and density** | The displayed “Remaining risk” curve falls toward zero because it represents risk still ahead through the horizon, not an ordinary cumulative distribution increasing to one. Density is risk per year; bar area is a probability contribution. The GM-weighted risk is not normalized to 100%, and a density at an exact age is not a probability. |
| Next | **Simulation horizon and mortality endpoint** | Distinguish the finite CE policy/run horizon from an actual known lifespan. GM survival can extend beyond it; the displayed GM estimates cover events only through the run horizon. |
| Next | **Illustrative trajectories** | The lines are a sample of wealth paths assuming the investor remains alive, stopped at impoverishment or the policy horizon. They are not forecasts of a person's actual wealth; shuffle changes only the displayed sample. |
| Technical | **First passage; bridge; time-step error** | Define first passage as the first threshold crossing. Bridges approximate crossings between grid points; occupation uses a different interpolation. Neither a smaller time step nor an MC interval automatically bounds all numerical error. Explain only in expandable details. |
| Technical | **Durbin approximation, CE conditional-on-impoverishment TV bound and CDF sup distance** | Keep these under the existing diagnostics disclosure. The CE bound concerns the event-time law conditional on impoverishment before death, not the GM timing curve or the age-conditional update. The empirical CDF distance is a different quantity and includes numerical and sampling error. Do not describe the unnormalized approximation as a probability distribution. |

## Data, tables, statuses and exports

| Priority | Term or group | Proposed explanation and placement |
| --- | --- | --- |
| First | **Comparison variation and shared settings** | A row changes only the listed row inputs; the market, mortality and numerical settings are shared and captured when the run starts. Explain that a row's name is just a label. |
| First | **Withdrawal, risk & policy table** | CE values are analytical for the unconstrained policy; GM risk is simulated for the row's selected policy through the CE horizon. Distinguish a current analytical value from an older GM result when the row or shared setup has changed. |
| Next | **Feasibility sensitivity table** | Explain why each row can use its own impoverishment level and how ζ, ever-borrowing probability and expected time differ. Make the unconstrained-only, negative-Merton and projection limitations clear without repeating a long warning in every cell. |
| First | **Calculated, needs updating, not available, running, queued and cancelled** | The existing status guide already covers these. Add targeted links from confusing states only where useful; do not create a separate dictionary article for every badge. “Not available” can mean the assumptions do not apply, not merely that a run has not started. |
| First | **Setup versus results; local recovery** | Inputs and table configurations are saved locally in the browser; fits and simulation results are not restored on reload. Setup JSON restores inputs and clears old results; results JSON is a separate export. Explain that historical price files/diagnostics and all simulated paths are not saved in these exports. |
| Next | **Chart PNG, SVG and CSV** | PNG/SVG are pictures; chart CSV contains plotted series and units, which may be simplified or sampled. The results JSON contains numerical summaries and captured settings. Keep the explanation near export controls or in the help guide, not repeated on every chart. |

## Proposed panel-level `?` popups

Each popup should use a short title, two or three plain-language paragraphs and
links to relevant dictionary entries. It should explain the specific visual,
not duplicate all definitions. Use the existing dialog interaction and accessible
labeling pattern. Proposed priority:

1. **Withdrawal & risk:** the curve is the unconstrained analytical CE
   relationship; its marker is the selected input and derived counterpart. GM
   and projected results are elsewhere.
2. **When might impoverishment occur?:** contrast forecast and conditional
   update, explain the falling remaining-risk curve and density area, and state
   that current wealth is not entered and the horizon is finite.
3. **Borrowing exposure:** distinguish possible borrowing, ever-borrowing
   probability and average time (including non-borrowers); describe why this
   view is unavailable for projection or negative Merton components.
4. **Portfolio allocation:** how to read shares versus wealth and time, and
   what negative or over-100% allocations mean; explain which policy is shown.
5. **Value of risk-taking:** fixed withdrawal, safe capital, relief/surplus,
   relative 5% changes, and the unconstrained CE restriction.
6. **Survival curve & model fit:** cohort conditional survival, fitted GM/CE
   curves and the difference between optimizer convergence and fit quality.
7. **Comparison table:** one context-sensitive popup explaining the selected
   table, shared settings, captured runs, stale rows and its policy limitations.
8. **Global feasibility:** a small explanation of “for all relevant states”
   versus a path probability, and what the ζ = 1 action changes. A dictionary
   link may be sufficient if the existing status text remains concise.

The existing GM-risk popup should be reviewed alongside these for consistency.
The Market data sources and About the data dialogs should stay focused on data
sources. The trajectory card already contains a clear summary; a popup there is
lower priority than the above. Ordinary actions, labels such as EUR, and every
individual table cell do not each need their own popup.

## Mathematical guardrails for later entries

The following are source-checked anchors for later technical details, not
independent proofs. Use upright `\mathrm{e}` and `\ln` in equations.

- The current manuscript defines `Σ = σσᵀ`, `m = Σ⁻¹θ` and
  `ρ = ½ θᵀΣ⁻¹θ`; `ρ > 0` is assumed. The website computes the same one-half
  convention. The Merton vector is a direction, not itself an allocation.
- In the risky region the CE feedback is proportional to the safe gap and
  the Merton vector. A negative component implies short selling there. The
  simplex has non-negative risky weights with their sum at most one.
- With the relevant assumptions and `M = Σᵢ mᵢ > 0`, the website computes
  `ζ = M (x_safe(0) − x_imp) / ((δ − 1) x_imp)`. `ζ ≤ 1` is the global
  feasibility condition in this regime. It does not itself give the chance
  that a path enters the borrowing region.
- Let `τ` be financial first impoverishment, `D` death and `H` the run horizon.
  Forecast remaining risk at time `a` is `P(a < τ ≤ H, τ < D)` as assessed at
  retirement. The conditional update is `P(a < τ ≤ H, τ < D | τ > a, D > a)`.
  For later points on that *same conditional curve*, conditioning remains at
  the selected `a`; it is not continuously reconditioned at every plotted age.
- For fixed withdrawal, the safe boundary is the minimum modeled wealth to
  fund that withdrawal without risk-taking through the mortality endpoint
  without crossing the chosen threshold. Its usual formula has domain
  assumptions, including `r > 0` and the non-degenerate risky region.
- Numerical GM risk and borrowing estimates use survival weighting under the
  model's independence assumption; the paper and site use their own specified
  numerical estimators. Do not imply that the website currently implements the
  paper's antithetic sampling or control-variate estimator.

The author confirmed that the factor one-half in `ρ` is essential. The
configured research planning outline (`journal-agent/manuscript/outline.md:17`)
omits it, whereas the current manuscript's market definition and the website's
calibration use it. Future website explanations must use the one-half
convention. The separate research outline was not changed.

## Evidence and limits

The website audit read the user-facing Evaluation, Market & investor, Data &
tables, Help, shared simulation controls, export controls and development-only
panel source. Optional and conditional panels were inspected in code; this is
not a claim of an interactive audit at every viewport or state. Browser visual
verification was unavailable in this session.

After reading the research project's `AGENTS.md` and its required operating
instructions, this audit consulted selected passages of the current manuscript:
`sections/2_model_verification.tex` (market, mortality, risk and safe boundary),
`sections/4_compactified_policy.tex` (CE feedback, projection context and
feasibility), `sections/5_first_passage.tex` (Durbin and conditional error), and
`sections/6_numerical_assessment.tex` (cohort fitting, borrowing and paired
comparison). Relevant website calculations and documentation were also checked.
The research working tree was clean at `ab61e9d272d5e9b5187a2c8a74c7f8fc345b70b0` when inspected. The manuscript is a draft and has not had a formal mathematical review. No manuscript build, MATLAB run, external search or change to the research project was performed. This website-side audit records the work without writing to the separate research workspace.
