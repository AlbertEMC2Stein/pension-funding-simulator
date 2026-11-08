# Zero risk premium: manuscript assumptions and implementation implications

This note is a targeted reading of the research manuscript's market definition and selected constant-elasticity, constraint and first-passage results. It is not a formal mathematical review. References below point to the sibling research project, which remains separate from the website. The website should not silently extend a theorem beyond its stated assumptions or treat an undefined formula as an answer.

**Author's convention:** The paper-based model requires `rho > 0`. The inspected manuscript source currently contains an urgent TODO to add this standing assumption and review dependent results; the assumption has not yet been incorporated into the displayed market definition. The website will treat `rho = 0` as outside the paper-based analytical scope. The observations below are retained for context, not as an extension of the paper's results.

## Relation between the cases

Under the manuscript's strictly positive-definite covariance assumption, `m = Sigma^(-1) theta` and `rho = theta^T Sigma^(-1) theta / 2`. Therefore

```text
rho = 0  if and only if  theta = 0  if and only if  m = 0.
```

Thus zero `rho` and the **entire** Merton vector being zero are the same case under this market assumption. A single zero component is different: it is allowed in a componentwise nonnegative Merton vector and does not imply `rho = 0`. Nor does `sum(m) = 0` imply `m = 0` unless `m` is componentwise nonnegative. Source: `sections/2_model_verification.tex`, Definition 1.

## Results and limitations

| Result | What the manuscript says or what follows for the zero case | Website implication |
| --- | --- | --- |
| Market definition | It assumes `r > 0` and positive-definite covariance. A new TODO calls for the standing assumption `theta != 0`, equivalently `rho > 0`, and review of dependent results. | Calibration may identify zero premium, but the website must mark paper-based analytical results unavailable. |
| Compactified-exponential compatibility | The theorem displays `delta > 1 + rho / B(0)`; substituting `rho = 0` gives `delta > 1`, and its displayed hazard, value and feedback formulas do not divide by `rho`. The feedback expression becomes zero when `m = 0`. Source: `sections/4_compactified_policy.tex`, theorem `thm:compactified-exponential-compatibility`. | This algebraic substitution is not a proof that the theorem applies at zero. Its dependencies and intended positive-`rho` assumption need review before supporting that boundary case. |
| Sustainable withdrawal and required capital under CE | The corollary assumes the compatible setting and uses `delta`, the risk level and the finite-horizon parameters. | The formulas inherit the scope of the compatible theorem; do not claim they are established at zero `rho` without further review. A zero-premium extension must not describe mortality-driven differences as a benefit of investment risk-taking. |
| Simplex feasibility | The paper assumes `m >= 0` componentwise. Its explicit boundary-case discussion says `M = sum(m) = 0` implies `m = 0`, the feedback has no risky component, and every target `alpha` in `(0,1)` is compatible with the simplex constraint. Source: `sections/4_compactified_policy.tex`, proposition `prop:simplex-slackness` and corollary `cor:simplex-risk-tolerance`. | This explicit boundary-case discussion needs reconciliation with an intended standing `rho > 0` assumption. Zero entries in an otherwise nonnegative vector can still satisfy both the sign and strictly positive-`rho` conditions. |
| Maximal relative bandwidth | The paper explicitly separates `M = 0`: the maximal relative wealth bandwidth is unbounded and no maximizing pair exists. Its finite-maximum formula divides by `M` and applies to `M > 0`. Source: `sections/4_compactified_policy.tex`, corollary `cor:maximal-wealth-bandwidth`. | Do not divide by `M` or show a finite maximum at zero. If displayed, explain the unbounded result and absent maximizer. |
| Borrowing window and bandwidth excess | The finite borrowing-window and initial-borrowing statements explicitly assume `M > 0`; the former defines `zeta` as a ratio involving the finite maximal bandwidth. Source: `sections/4_compactified_policy.tex`, corollary `cor:finite-borrowing-window` and proposition `prop:initial-borrowing`. | Do not apply those formulas directly at `M = 0`. The zero CE feedback itself has no risky positions or borrowing, but any special display for `zeta` needs an explicit convention; avoid calling the ratio defined by an infinite maximum an ordinary finite value. |
| General first-passage representation | The proof constructs a Brownian motion by dividing by `sqrt(2 rho)`; the curved-boundary formula also divides by the resulting diffusion coefficient. Both expressions are undefined at zero. Source: `sections/5_first_passage.tex`, proposition `prop:safe-gap-multiplicative` and proposition `prop:brownian-boundary`. The stated propositions do not explicitly isolate this zero case. | Do not use these nondegenerate Brownian first-passage or density formulas at zero `rho`. This is a gap in their stated zero-case handling, not by itself proof that every underlying conclusion fails. A deterministic branch needs its own derivation and tests. |
| Constant-hazard benchmark | The stated theorem requires a root `delta > 1` of `r delta^2 - (rho + r + eta) delta + eta = 0`. At `rho = 0`, it factors as `(delta - 1)(r delta - eta)`. A root strictly above 1 exists only when `eta > r`. The inverse-Gaussian expression also divides by `rho`. Source: `sections/3_solvable_families.tex`, theorems `thm:constant-hazard-solution` and `thm:constant-hazard-first-passage`. | Check the strict-root hypothesis and do not use the inverse-Gaussian expression at zero `rho`; analyze any other parameter regimes separately. |

## Deterministic CE-policy cross-check

For the zero risky policy, wealth obeys `dX/dt = r X - C`. Independently of whether that policy is optimal in a zero-premium extension, for a starting wealth in the nontrivial risky region and `C > r * xImp`, its threshold-hitting time is

```text
tau = ln((C - r*xImp) / (C - r*x0)) / r.
```

When the assumptions needed for that expression hold, the lifetime impoverishment probability under that policy and an independent continuous mortality law is `S(tau)`. This is a useful proposed cross-check, not a substitute for verifying all domains and boundary cases. With a fixed fitted GM reference, this provides a deterministic policy-risk calculation; any simulation implementation should be tested against it. If death is sampled explicitly rather than survival-weighted, individual simulated indicators can still vary.

The deterministic financial hitting time is a point mass, so a conventional continuous financial first-passage density is not appropriate. Any conditional death-weighted time display must account for this degeneracy and conditioning explicitly.

## Implementation decisions still to make

- Keep exact zero distinct from a small positive `rho`: a numerical cutoff is an approximation, not an exact mathematical equivalence. Decide on a stable approach only after testing.
- Specify how to label `zeta` and related borrowing-window fields when the zero-feedback case makes the finite-boundary ratio inapplicable.
- Enforce the agreed `rho > 0` scope for paper-based analytical results. Study any zero-case extension separately before exposing its results.
- Treat the normalized Brownian construction and the constant-hazard boundary case as questions for a focused manuscript review if the author wants to resolve their formal statements; this note does not modify the research project.
