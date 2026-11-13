# Financial model code

This directory contains the financial model, independent of React, browser
state and the research repository at runtime. The `market/` and `mortality/`
modules in `src/lib` handle calibration, cohort survival and mortality fitting.

- `inputs.ts` defines the currently known investor capital inputs using the
  existing validated-options type. Amounts are euros, not percentages.
- `analytical/` contains safe-boundary, compatible-policy, projection and
  first-passage calculations. See its README for assumptions and limitations.
- `simulation/` contains the validated run snapshot, TensorFlow batch and
  scheduler, simulation statistics and scalar legacy reference. Its README
  explains the worker integration and numerical limitations.

Add a calculation only after recording its definitions, units, domain and
applicable assumptions against the research sources. Return or surface invalid
or unsupported cases explicitly; do not make missing work look like a computed
result. Keep snapshot and random-stream provenance clear when changing worker
protocols or numerical algorithms.
