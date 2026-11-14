/** One plain-language term and its optional mathematical detail. */
export interface DictionaryEntry {
  /** Stable, language-independent navigation identifier. */
  id: string;
  category: string;
  title: string;
  summary: string;
  explanation: string;
  technical: string;
  equation?: string;
  symbols?: string;
  keywords: string;
}

/** Author-reviewed English terms; IDs can be reused by future translations. */
export const dictionaryEntries = [
  {
    id: "impoverishment",
    category: "RETIREMENT & WEALTH",
    title: "Impoverishment level",
    summary:
      "The wealth level you choose as the point at which your retirement funding has fallen below an acceptable threshold.",
    explanation:
      "Reaching this level does not necessarily mean your wealth has reached zero.",
    technical:
      "The financial impoverishment time is the first time wealth reaches or falls below the chosen level.",
    equation: String.raw`\tau_{\mathrm{imp}}=\inf\{t\geq0:X_t\leq x_{\mathrm{imp}}\}`,
    symbols:
      "X is wealth; xᵢₘₚ is the threshold. The event of interest is reaching it before death.",
    keywords: "threshold wealth ruin first passage",
  },
  {
    id: "withdrawal",
    category: "RETIREMENT & WEALTH",
    title: "Annual withdrawal and starting capital",
    summary:
      "Starting capital is the wealth available at retirement. A withdrawal is the amount taken from it to fund spending.",
    explanation:
      "The model uses a constant annual withdrawal in today's purchasing power. Where regular income is included, the modeled withdrawal is net of that income.",
    technical:
      "The continuous-time model deducts a constant real withdrawal rate C from wealth; the displayed amount is in euros per year.",
    keywords: "capital spending income real euros initial x0 C",
  },
  {
    id: "safe-boundary",
    category: "RETIREMENT & WEALTH",
    title: "Safe boundary",
    summary:
      "The model's wealth threshold for funding the chosen withdrawal without investment risk until the mortality endpoint.",
    explanation:
      "It provides a benchmark for comparing capital when investment risk is allowed. This is a model result, not a guarantee about an actual product.",
    technical:
      "For the non-degenerate finite-horizon model with r > 0 and C > r xᵢₘₚ, the safe boundary is:",
    equation: String.raw`x_{\mathrm{safe}}(t)=\frac{C}{r}-\left(\frac{C}{r}-x_{\mathrm{imp}}\right)\mathrm{e}^{-r(T-t)}`,
    symbols:
      "C is annual withdrawal, xᵢₘₚ the threshold, r the real risk-free rate and T the remaining-lifetime endpoint.",
    keywords: "risk free capital safe level withdrawal",
  },
  {
    id: "capital-relief",
    category: "RETIREMENT & WEALTH",
    title: "Capital relief and surplus",
    summary:
      "Capital relief compares the capital needed with risk-taking against the safe boundary for the same annual withdrawal.",
    explanation:
      "At zero risk, capital above the safe minimum is shown as a surplus. The current comparison uses the unconstrained CE model.",
    technical:
      "The comparison holds C fixed. For positive selected risk, relief is the safe boundary at retirement minus the selected starting capital; nearby risk levels are varied relative to α.",
    keywords: "safe capital required risk taking comparison surplus",
  },
  {
    id: "nominal-real",
    category: "MARKET",
    title: "Nominal, real and inflation",
    summary:
      "Nominal amounts use money at the time; real amounts are adjusted for the chosen inflation assumption.",
    explanation:
      "Inflation reduces what a fixed amount of money can buy. The app takes a nominal cash rate and displays the derived real model rate.",
    technical:
      "The model's real rate r uses effective nominal rate iᴺ and inflation ι:",
    equation: String.raw`r=\ln(1+i^{\mathrm{N}})-\ln(1+\iota)`,
    symbols:
      "The result is continuously compounded; the same inflation convention is applied consistently to asset inputs.",
    keywords: "inflation deflation nominal real purchasing power compounded",
  },
  {
    id: "risk-free-rate",
    category: "MARKET",
    title: "Risk-free rate",
    summary:
      "The model's assumed return on its risk-free asset, before or after inflation as labeled.",
    explanation:
      "This is a model assumption. A real cash product may change its rate or fail to preserve purchasing power.",
    technical:
      "The current CE model requires a strictly positive continuously compounded real risk-free rate r.",
    keywords: "cash interest riskless safe nominal real r",
  },
  {
    id: "growth",
    category: "MARKET",
    title: "Expected annual growth",
    summary:
      "An assumption about an asset's annual compounded nominal growth, before the selected inflation adjustment.",
    explanation:
      "Historical estimates depend on the dates and data supplied and are not forecasts. The app's convention is not the same as the expected one-year percentage price return.",
    technical:
      "For annualized log growth a, the entered compounded rate is g = exp(a) − 1. The corresponding model's arithmetic drift also includes half the log-return variance.",
    equation: String.raw`g=\mathrm{e}^{a}-1`,
    keywords: "return log drift expected nominal compounded mean historical",
  },
  {
    id: "volatility",
    category: "MARKET",
    title: "Volatility",
    summary: "A measure of how much an asset's modeled returns fluctuate.",
    explanation:
      "A higher value means wider modeled fluctuations; it does not by itself predict a gain or loss.",
    technical:
      "The entered annual volatility is the annualized standard deviation of log returns, conventionally measured per square root of a year.",
    keywords: "variation fluctuation standard deviation sigma",
  },
  {
    id: "correlation",
    category: "MARKET",
    title: "Correlation and the correlation matrix",
    summary:
      "Correlation describes how two assets' modeled returns move together in a linear sense.",
    explanation:
      "Positive values indicate a tendency to move together; negative values indicate opposite movements. Zero does not generally guarantee independence.",
    technical:
      "The diagonal is one and the matrix is symmetric. The app requires a positive-definite, sufficiently well-conditioned matrix; pairwise estimates can fail that requirement.",
    keywords: "matrix diversification positive definite covariance asset pairs",
  },
  {
    id: "covariance",
    category: "MARKET",
    title: "Covariance matrix",
    summary:
      "A table that combines each asset's volatility with how its return moves with the others.",
    explanation:
      "It is used to model combined market fluctuations and construct portfolio weights.",
    technical:
      "With volatilities σᵢ and correlations Rᵢⱼ, the annual covariance is:",
    equation: String.raw`\Sigma_{ij}=\sigma_i R_{ij}\sigma_j`,
    keywords: "volatility correlation matrix positive definite sigma",
  },
  {
    id: "adjusted-prices",
    category: "MARKET",
    title: "Adjusted closing prices",
    summary:
      "Historical closing prices adjusted for events such as splits and distributions.",
    explanation:
      "Import prices that are already adjusted and expressed in euros. The app does not adjust, convert currencies or fill missing prices.",
    technical:
      "The CSV has ascending dates and one column per asset. Return intervals use available observations and elapsed calendar time.",
    keywords: "csv import historical data dates dividends splits euro missing",
  },
  {
    id: "historical-uncertainty",
    category: "MARKET",
    title: "Historical estimation uncertainty",
    summary:
      "A range describing uncertainty when estimating a market parameter from the supplied historical sample.",
    explanation:
      "These intervals depend on the sample and model assumptions. They are not forecasts of future returns or Monte Carlo intervals for the simulation.",
    technical:
      "A 95% confidence procedure is designed to cover its fixed parameter in approximately 95% of repeated samples under its assumptions. Pairwise intervals use matching observation endpoints.",
    keywords:
      "95 confidence interval coverage price data sampling volatility correlation",
  },
  {
    id: "market-direction",
    category: "MARKET",
    title: "Merton vector and market risk premium ρ",
    summary:
      "These are quantities calculated from the market assumptions; they help define the model's investment strategy.",
    explanation:
      "The Merton vector is a direction, not a portfolio by itself. A negative component means the unconstrained policy sells that asset short in its risky region.",
    technical:
      "For excess-return vector θ and covariance matrix Σ, the direction m and risk premium ρ are:",
    equation: String.raw`m=\Sigma^{-1}\theta,\qquad \rho=\tfrac12\theta^{\mathsf T}\Sigma^{-1}\theta`,
    symbols:
      "The factor one-half is part of the model's definition of ρ. The compatible CE model requires ρ > 0.",
    keywords: "merton rho risk premium excess returns short negative",
  },
  {
    id: "cohort",
    category: "MORTALITY",
    title: "Cohort and longevity scenario",
    summary:
      "A cohort groups people by birth year; a longevity scenario describes an assumed population mortality pattern.",
    explanation:
      "The packaged German tables include observed and projected mortality. Low, medium and high scenarios are not predictions for an individual.",
    technical:
      "The app constructs a remaining-lifetime survival curve conditional on reaching the selected retirement age, using the chosen cohort and scenario.",
    keywords: "destatis birth year life tables mortality low medium high",
  },
  {
    id: "survival",
    category: "MORTALITY",
    title: "Survival probability and mortality mixture",
    summary:
      "Survival is the modeled chance of being alive at a later age, given survival to the selected retirement age.",
    explanation:
      "The custom slider combines the female and male survival curves: 0 selects female, 1 selects male. It is a chosen mixture, not automatically a population-weighted series.",
    technical:
      "For remaining lifetime D, S(t) = P(D > t). Mixtures combine the two conditional survival curves after each has been constructed.",
    keywords: "survival curve probability sex mixture male female conditional",
  },
  {
    id: "mortality-fit",
    category: "MORTALITY",
    title: "Mortality fit",
    summary:
      "Fitting chooses model parameters so a survival model approximates the selected cohort data.",
    explanation:
      "The app fits GM and market-compatible CE models automatically when relevant inputs change. Market assumptions can affect the CE fit; the underlying cohort data do not change.",
    technical:
      "The objective compares annual death-probability bins and the final survival tail using KL divergence. Optimizer convergence does not itself measure fit quality.",
    keywords: "fitting calibration kl convergence parameters model",
  },
  {
    id: "mortality-models",
    category: "MORTALITY",
    title: "CE and GM mortality models",
    summary:
      "CE and GM are two mathematical descriptions of remaining lifetime used for different parts of the app.",
    explanation:
      "The compactified-exponential (CE) model is fitted to remain compatible with the analytical policy. Gompertz–Makeham (GM) is a reference model used to evaluate simulated risk.",
    technical:
      "CE has a finite remaining-lifetime endpoint. GM has an age-increasing hazard plus a constant term and may extend beyond the CE simulation horizon.",
    keywords:
      "compactified exponential gompertz makeham survival reference compatible",
  },
  {
    id: "mortality-diagnostics",
    category: "MORTALITY",
    title: "Mortality fit diagnostics",
    summary:
      "Fit diagnostics describe how the fitted curves compare with the selected cohort data and how the optimizer behaved.",
    explanation:
      "A smaller KL divergence is a closer match under that criterion, not a guarantee of predictive accuracy. Convergence means the optimizer stopped according to its criterion; it is not a quality grade.",
    technical:
      "KL compares annual death-probability bins and the final survival tail. Largest difference is the maximum absolute survival difference on the annual grid.",
    keywords:
      "KL divergence optimizer convergence goodness fit largest difference",
  },
  {
    id: "mortality-horizon",
    category: "MORTALITY",
    title: "Mortality endpoint and simulation horizon",
    summary:
      "The CE endpoint and simulation horizon are model limits measured in years after retirement, not a known date of death.",
    explanation:
      "GM mortality may extend past the CE horizon. GM risk reported by the simulation covers events only through the simulated horizon.",
    technical:
      "T denotes the deterministic right endpoint of the CE remaining-lifetime law; the random time of death is a different quantity. Cohort observations end at age 100.",
    keywords: "T endpoint horizon remaining lifetime cutoff truncation",
  },
  {
    id: "target-risk",
    category: "RISK & RESULTS",
    title: "Target risk",
    summary:
      "The chance of impoverishment before death that you choose when the CE model derives a withdrawal.",
    explanation:
      "The analytical target applies to the unconstrained CE policy under its assumptions. GM mortality or the projected policy can produce a different risk.",
    technical:
      "For a positive target under the compatible unconstrained CE model, the derived policy satisfies:",
    equation: String.raw`\mathbb{P}(\tau_{\mathrm{imp}}<\mathcal{T})=\alpha`,
    symbols:
      "α is the target probability, τᵢₘₚ the impoverishment time, and 𝒯 the random time of death. This α is not the GM hazard parameter also called α.",
    keywords: "alpha probability lifetime withdrawal model derived",
  },
  {
    id: "gm-risk",
    category: "RISK & RESULTS",
    title: "Estimated GM risk",
    summary:
      "An estimated chance of impoverishment before death when the policy is evaluated under fitted Gompertz–Makeham mortality.",
    explanation:
      "It can differ from the CE target because the mortality model or policy differs. It is a model-based estimate, not a known future risk.",
    technical:
      "Simulated first-hit times are weighted by GM survival through the CE run horizon. GM survival may extend beyond that horizon.",
    keywords: "gompertz makeham mortality simulation projected reference",
  },
  {
    id: "percentage-points",
    category: "RISK & RESULTS",
    title: "Percentage points",
    summary:
      "Percentage points measure the direct difference between two percentages.",
    explanation:
      "A change from 5% to 6% is an increase of 1 percentage point, or 20% relative to 5%.",
    technical:
      "A 5% relative increase from 5% gives 5.25%, a change of 0.25 percentage points. The capital comparison uses relative changes in α.",
    keywords: "pp percent difference relative change 0.95 1.05",
  },
  {
    id: "monte-carlo",
    category: "RISK & RESULTS",
    title: "Monte Carlo uncertainty",
    summary:
      "A Monte Carlo estimate uses simulated paths; repeating the run with different random draws can change the result.",
    explanation:
      "The standard error and approximate 95% interval describe sampling uncertainty, not all uncertainty about the future.",
    technical:
      "The interval does not include market-parameter or mortality-model uncertainty, time-step or bridge error, or events beyond the simulation horizon.",
    keywords: "sampling standard error confidence interval mc 95 simulation",
  },
  {
    id: "simulation-detail",
    category: "SIMULATION",
    title: "Paths, time step and batch size",
    summary:
      "Paths are alternative simulated financial histories; the time step sets how often the model advances them.",
    explanation:
      "More paths can reduce sampling noise. A smaller time step can change approximation error. Batch size groups paths for performance and progress; it is not a risk preference.",
    technical:
      "Cancellation and ETA updates occur between batches. Smaller time steps do not by themselves prove that all discretization error is negligible.",
    keywords: "paths trajectories sample discretization batch progress eta",
  },
  {
    id: "seed",
    category: "SIMULATION",
    title: "Random seed and repeatability",
    summary:
      "A random seed initializes the stream used to generate simulated draws.",
    explanation:
      "The same seed alone does not guarantee identical results after changing path count, batch size, algorithm or numerical backend.",
    technical:
      "Table rows use separate derived streams. Paired policy simulations share market draws so their difference can be estimated from matched paths.",
    keywords: "random seed reproducibility backend batch paired repeat",
  },
  {
    id: "first-passage",
    category: "SIMULATION",
    title: "First passage and bridge approximation",
    summary:
      "First passage is the first time a path reaches a chosen boundary.",
    explanation:
      "A path can cross a boundary between saved time steps. The simulator uses a bridge approximation to estimate crossings that a grid alone could miss.",
    technical:
      "The bridge is approximate for the modeled moving boundaries. First borrowing and borrowing occupation use different approximations; their errors are not included in Monte Carlo intervals.",
    keywords: "bridge first hit crossing time step discretization numerical",
  },
  {
    id: "policy",
    category: "PORTFOLIO POLICY",
    title: "Portfolio policy and allocation",
    summary:
      "A portfolio policy describes how wealth is divided among assets as conditions change.",
    explanation:
      "The allocation chart shows fractions of wealth at a chosen time and wealth level, not a forecast of one person's future holdings. Negative risky fractions mean short positions; a negative risk-free fraction means borrowing.",
    technical:
      "The unconstrained CE feedback depends on the safe gap, wealth and Merton direction. Its weights need not satisfy the no-short/no-borrow simplex.",
    keywords: "holdings fractions wealth asset weights strategy short leverage",
  },
  {
    id: "projection",
    category: "PORTFOLIO POLICY",
    title: "Projection",
    summary:
      "A way of adjusting portfolio weights to satisfy the selected investment constraints.",
    explanation:
      "Here projection prevents short positions and borrowing. It is a feasible comparison strategy, not a proven optimal constrained strategy.",
    technical:
      "The covariance-weighted projection of the unconstrained risky allocation π is:",
    equation: String.raw`\widehat{\pi}=\operatorname*{arg\,min}_{p\geq0,\;\mathbf{1}^{\mathsf T}p\leq1}(p-\pi)^{\mathsf T}\Sigma(p-\pi)`,
    symbols: "p contains risky-asset weights, and Σ is the covariance matrix.",
    keywords: "projected policy borrowing short constraint simplex",
  },
  {
    id: "global-feasibility",
    category: "PORTFOLIO POLICY",
    title: "Global feasibility and ζ",
    summary:
      "Global feasibility asks whether the policy avoids short positions and borrowing throughout its relevant risky region.",
    explanation:
      "It is different from the chance that a particular path borrows. Under the stated Merton-vector assumptions, ζ > 1 means borrowing is possible somewhere, not inevitable.",
    technical:
      "For non-negative Merton components with M = Σᵢmᵢ > 0, the unconstrained CE policy is feasible when ζ ≤ 1:",
    equation: String.raw`\zeta=\frac{M\bigl(x_{\mathrm{safe}}(0)-x_{\mathrm{imp}}\bigr)}{(\delta-1)x_{\mathrm{imp}}}`,
    symbols:
      "The action at ζ = 1 changes the impoverishment level while keeping the selected target input fixed. The projected policy is feasible by construction.",
    keywords: "zeta simplex nonnegative merton global borrowing make feasible",
  },
  {
    id: "borrowing",
    category: "PORTFOLIO POLICY",
    title: "Borrowing exposure",
    summary:
      "Borrowing occurs when the strategy needs a negative holding in the risk-free asset to fund its risky positions.",
    explanation:
      "Ever-borrowing probability concerns borrowing while alive before impoverishment or the run horizon. Expected borrowing time averages over everyone, including those who never borrow.",
    technical:
      "The measures use GM survival weighting. First-borrowing detection and occupation time use different numerical approximations and can differ path by path.",
    keywords:
      "ever borrowing exposure occupation expected time leverage risk free",
  },
  {
    id: "timing",
    category: "RISK & RESULTS",
    title: "Forecast and conditional update",
    summary:
      "The timing chart shows the risk of impoverishment still ahead through the simulation horizon.",
    explanation:
      "Forecast assesses that risk at retirement. Conditional update assumes the person is alive and has not reached the threshold by the selected age. It does not use observed current wealth.",
    technical:
      "At a selected time a and horizon H, the forecast is P(a < τ ≤ H, τ < D); the update conditions on τ > a and D > a. Later points retain that same conditioning time.",
    keywords:
      "age remaining risk conditional survival forecast horizon impoverishment",
  },
  {
    id: "density",
    category: "RISK & RESULTS",
    title: "Remaining risk and density",
    summary:
      "Remaining risk is the modeled chance of an eligible impoverishment event still ahead through the horizon.",
    explanation:
      "The curve falls toward zero at the horizon. Density bars show risk per year; an area across a range of ages represents a probability contribution.",
    technical:
      "The displayed survival-weighted risk is not normalized to 100%. A density at one exact age is not itself the probability of an event at that age.",
    keywords: "pdf cdf cumulative density histogram bars tail probability",
  },
  {
    id: "durbin",
    category: "RISK & RESULTS",
    title: "Durbin approximation and error diagnostics",
    summary:
      "A mathematical approximation to the unconstrained policy's impoverishment-time behavior.",
    explanation:
      "The optional overlay is additional technical information; it is not an exact simulation result.",
    technical:
      "The displayed CE total-variation bound concerns timing conditional on impoverishment before death under CE mortality. It is not a bound for the GM chart or the age-conditional update. The empirical CDF distance has sampling and numerical errors.",
    keywords: "durbin first passage tv bound cdf sup approximation error",
  },
  {
    id: "trajectories",
    category: "SIMULATION",
    title: "Illustrative wealth trajectories",
    summary:
      "Sample paths show possible modeled wealth histories, not forecasts of a particular person's future.",
    explanation:
      "They assume the person remains alive and stop at impoverishment or the policy horizon. Shuffle changes the displayed sample without rerunning the simulation.",
    technical:
      "Only a bounded sample of paths and a reduced plotting grid are retained; short fluctuations can be omitted from the display.",
    keywords: "wealth paths sample shuffle lines simulation alive",
  },
  {
    id: "comparison-tables",
    category: "RISK & RESULTS",
    title: "Comparison table variations",
    summary:
      "Each table row changes the listed inputs while using shared market, mortality and numerical settings.",
    explanation:
      "A run captures those settings. Changing an input afterward can leave an earlier result needing an update; the row name is only a label.",
    technical:
      "The withdrawal table uses unconstrained CE values and simulates GM risk for the selected policy. The feasibility table concerns unconstrained borrowing under its applicable assumptions.",
    keywords: "variation rows policy captured settings stale feasibility",
  },
  {
    id: "setup-results",
    category: "SAVING & EXPORT",
    title: "Setup, results and local recovery",
    summary:
      "A setup contains inputs; results are the estimates obtained by running calculations.",
    explanation:
      "Editable inputs are normally saved in this browser. Fits and simulation results are not restored after reload. Importing a setup replaces inputs and clears old results.",
    technical:
      "Setup JSON, results JSON, table CSV and chart files serve different purposes. Original historical price files and all simulated paths are not included in those summaries.",
    keywords: "save import export local browser json csv files results",
  },
] as const satisfies readonly DictionaryEntry[];

/** Stable term IDs accepted by links and dictionary navigation. */
export type DictionaryTermId = (typeof dictionaryEntries)[number]["id"];
