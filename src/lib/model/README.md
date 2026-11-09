# Financial model code

This directory is the starting point for the financial model. Its calculations
must be independent of React, browser state and the research repository at
runtime. The existing `market/` and `mortality/` modules in `src/lib` handle
market calibration, cohort survival and mortality fitting; they remain their
source of truth.

- `inputs.ts` defines the currently known investor capital inputs using the
  existing validated-options type. Amounts are euros, not percentages.
- `analytical/` is reserved for small, independently testable analytical
  calculations. The safe boundary is the first planned calculation.
- `simulation/` is reserved for the financial-path engine and its numerical
  building blocks. Its algorithms and run snapshot have not been specified.

Add a calculation only after recording its definitions, units, domain and
applicable assumptions against the research sources. Return or surface invalid
or unsupported cases explicitly; do not make missing work look like a computed
result. Keep the run snapshot, random streams, worker protocol and projection
design open until their corresponding milestones are reviewed.
