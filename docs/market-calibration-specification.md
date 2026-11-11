# Manual market calibration: conventions and reference cases

Status: **implemented for manual inputs**. This document covers manual market inputs only; historical CSV estimation and the simulation engine use separate specifications.

## Sources and scope

The primary reference is the research manuscript, sections 2.1 and 6.1.1, together with `code/utils/getMarketCalibration.m` in the sibling `gompertz-pension-funding` project. The manuscript uses a constant-coefficient, multi-asset Black–Scholes market in real terms. Its numerical example describes how its nominal annualized inputs are interpreted and converted. The manuscript is a research draft; this specification is not an independent verification of its mathematical results.

The website implements its own calculation and tests; it does not import or run MATLAB code at runtime. Its preset asset and inflation assumptions match the paper's numerical example, although the asset names are more generic. Its preset 2.5% effective annual nominal risk-free rate implies approximately 0.489% real at 2% inflation; the paper reference uses 0.5% real.

## Inputs and units

All model rates and probabilities below are decimal fractions: for example, the UI entry `6.75` percent is `0.0675` in the numerical input. Time is measured in years. Preserve the user's asset order throughout vectors and matrices.

| Input | Meaning | Domain for this website's current model |
| --- | --- | --- |
| `gN[i]` | Expected annual nominal compounded growth rate for risky asset `i` | Finite, greater than -1 |
| `vol[i]` | Annualized volatility of the asset's log return | Finite and strictly positive; units per square root of a year |
| `inflation` | Effective annual deterministic inflation assumption | Finite, greater than -1 |
| `iN` | Effective annual nominal risk-free rate | Finite, greater than -1; must imply `r > 0` |
| `R[i][j]` | Correlation of risky-asset returns | Symmetric, diagonal 1, positive definite, with entries in [-1, 1] |
| asset names | Labels for each risky asset | Nonempty and unique in the editor; order matches vectors and matrix |

The editor currently permits 1–10 risky assets. Its `nominalReturn` snapshot field means compounded growth as defined here, not the arithmetic drift of a geometric Brownian motion. The names in the implementation may be clarified later without silently changing their meaning. The annual volatilities are not percentages of initial capital.

## Derived quantities

First convert the effective nominal cash rate and inflation to the model rate, `r = ln(1 + iN) - ln(1 + inflation)`. The current analytical model requires `r > 0`. For each asset, the paper's **interpretation of its annualized forecast** then leads to

```text
realLogGrowth[i] = ln(1 + gN[i]) - ln(1 + inflation)
mu[i]            = realLogGrowth[i] + vol[i]^2 / 2
theta[i]         = mu[i] - r
Sigma[i][j]      = vol[i] * R[i][j] * vol[j]
```

Here `mu` is the annual real arithmetic drift in the asset SDE, `theta` is the real excess-drift vector, and `Sigma` is the annual real return covariance matrix. The conversion assumes the deterministic inflation convention in the manuscript; the specification does not imply that arbitrary forecasts or historical arithmetic average returns have the same interpretation. Handle CSV-derived estimates separately.

Solve `Sigma * m = theta` for the Merton direction `m`, then compute

```text
rho = (theta transpose * m) / 2
```

Calibration factors the correlation matrix as `R = L_R * L_R transpose` and
retains `L_Sigma = D * L_R`, where `D` is the diagonal matrix of volatilities.
Thus `Sigma = L_Sigma * L_Sigma transpose`, and simulation batches can reuse
the lower-triangular covariance factor without factoring the matrix again. Its
rows and columns follow the same asset order as `Sigma`.

The factor one-half follows the manuscript. `m` is not, by itself, a portfolio allocation. The market price of Brownian risk is not generally the same vector as `m` and depends on the chosen factorization of `Sigma`; it is not needed as a manual input for this calibration.

The inverse relationship is `iN = exp(r) * (1 + inflation) - 1`. All computations use unrounded inputs and intermediate values. Display rounding must not feed back into the model. Real withdrawals and capital use euros of the calibration year; do not apply inflation to a real withdrawal a second time.

## Validation and diagnostics

- Reject invalid or non-finite inputs, mismatched dimensions, and correlations that are not symmetric or do not have a unit diagonal. Do not silently alter a user's matrix.
- The current editor rejects a correlation matrix when its Cholesky diagonal **residual** is at most `1e-12`. This is a practical numerical guard, not a general condition-number test or a theorem. A positive-definite matrix can fail this guard. Report the limitation clearly and revisit its tolerance after numerical testing.
- Use a stable linear solve, not an explicitly formed matrix inverse. Check the solve result and surface numerical failure. Because different asset volatilities affect the conditioning of `Sigma`, passing the correlation check alone does not guarantee a well-conditioned covariance solve.
- A negative component of `m` is a valid calibration result. Whether it affects a feasibility or borrowing diagnostic depends on that result's exact assumptions. Do not disable every calculation based solely on its sign.
- Zero `theta` gives `m = 0` and `rho = 0` for positive-definite `Sigma`; calibration can identify this case. The agreed paper-based model requires `rho > 0`, so mark paper-based analytical results unavailable at zero rather than applying formulas by substitution. The research manuscript source currently records an urgent TODO to add the standing assumption and review dependent results.
- Mathematically `rho >= 0` for positive-definite `Sigma`. Investigate numerical inconsistencies rather than silently correcting a materially negative result.
- Covariance-weighted projection and conditions for global simplex feasibility are later milestones; their assumptions and tolerances must be specified and tested separately.

## Reference cases, version 1

These are calibration test cases, not financial forecasts. Values shown below are decimal fractions unless otherwise noted. Tolerances are proposed for double-precision tests; a future implementation must also report solve errors rather than relying solely on comparing rounded output.

### A. Manuscript two-asset example

Input in order: equity, government bonds. `gN = [0.0675, 0.0330]`, `vol = [0.145, 0.040]`, `inflation = 0.02`, `r = 0.005`, `R = [[1, 0.08], [0.08, 1]]`.

| Quantity | Expected value |
| --- | --- |
| `mu` | `[0.05602933882446285, 0.01346456284132178]` |
| `theta` | `[0.05102933882446285, 0.00846456284132178]` |
| `Sigma` | `[[0.021025, 0.000464], [0.000464, 0.0016]]` |
| `m` | `[2.325207875012663, 4.616041492072441]` |
| `rho` | `0.07886329688956320` |

The manuscript prints these results to six decimal places. Additional digits above were independently calculated from its stated inputs using Python decimal arithmetic at 45-digit precision and the explicit two-by-two linear-system formula; they are not presented as a saved MATLAB output. Compare against the values above with absolute tolerance `1e-11` for `m` and `1e-12` for the other displayed quantities, and verify `Sigma * m` against `theta`. A future matched MATLAB run can provide an additional independent reference when authorized.

### B. Valid market with negative Merton direction

One asset: `gN = [0]`, `vol = [0.2]`, `inflation = 0`, `r = 0.05`, `R = [[1]]`. Then `mu = [0.02]`, `theta = [-0.03]`, `Sigma = [[0.04]]`, `m = [-0.75]`, and `rho = 0.01125`. These follow directly from the formulas above. Calibration is valid; any consequence for a later result needs that result's own assumptions.

### C. Zero excess return

One asset: `gN = [0]`, `vol = [0.1]`, `inflation = 0`, `r = 0.005`, `R = [[1]]`. Then `mu = [0.005]`, `theta = [0]`, `Sigma = [[0.01]]`, `m = [0]`, and `rho = 0`. Check near-zero results with an absolute tolerance such as `1e-12`, since floating-point operations need not cancel exactly. This is a calibration test, not a claim that every later formula supports `rho = 0`.

### D. Matrix failures and numerical guard

For two assets with positive volatilities, `R = [[1, 1], [1, 1]]` is singular and must be rejected. `R = [[1, 0.9999999999999], [0.9999999999999, 1]]` is mathematically positive definite but fails the editor's current Cholesky-residual guard; report it as numerically near-singular, not mathematically indefinite. Include invalid dimensions and asymmetric inputs in tests. No result should be manufactured from a rejected matrix.

### E. Ordering and more than two assets

Test an identity correlation matrix with three positive-volatility assets. Each covariance diagonal must equal its squared volatility, all off-diagonal covariances must be zero, and `m[i] = theta[i] / vol[i]^2`. Reordering assets and both matrix axes must reorder `mu`, `theta` and `m` consistently while leaving `rho` unchanged. Use explicit test inputs and record expected values when implementing the test.

## Continuing review points

1. Confirm this interpretation of manual annual growth and inflation for the website's initial calibration.
2. Decide whether the current `1e-12` correlation residual guard is acceptable as an initial conservative rule; it is not a full covariance-conditioning assessment.
3. Treat zero `rho` as outside paper-based analytical scope; determine result by result how negative components of `m` affect downstream theory. Do not infer unsupported restrictions from this calibration document.

The targeted zero-premium reading is recorded in [zero-risk-premium-analysis.md](zero-risk-premium-analysis.md). Negative components and other parameter regimes still require their own result-by-result checks.
