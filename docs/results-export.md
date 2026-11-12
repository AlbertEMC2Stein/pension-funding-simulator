# Results and chart exports

Data & tables exports the current comparison table as CSV. Current row inputs
and current setup are separate from the captured row and setup that produced a
result. Outdated rows are marked `needs updating`. Risk values in result columns
are probabilities (0.05 means 5%); years and euros are named in the headers.
The file contains full-precision estimates, not only the rounded display values.

The separate results JSON contains completed Evaluation and comparison results,
their captured model and numerical inputs, and any Monte Carlo intervals. It
marks outdated results and excludes incomplete rows. Intervals cover Monte Carlo
sampling uncertainty only. Raw first-hit observations and retained sample
trajectories are not included, and imported historical price data and their
source are not retained by the current setup.

Each rendered chart offers PNG, SVG and CSV. CSV uses long form: each row
identifies its chart, selected view, series, point, x and y units, and histogram
bin width when applicable. The data are the points actually plotted, so a
simplified cumulative curve and sampled trajectories contain only their
displayed points. Reference lines are described by the selected view where
relevant. The image includes the chart title and displayed view; the allocation
and trajectory image exports also include their otherwise external legends.

Reproducing a run additionally depends on the captured model and data, seed,
path count, time step, batch sequence and backend. Cross-backend floating-point
results can differ.
