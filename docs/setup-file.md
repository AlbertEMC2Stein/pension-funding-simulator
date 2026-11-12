# Setup files

The import and export buttons on Market & investor and Data & tables use the
same versioned JSON format (`pension-funding-setup`, version 1). A file holds
the setup name, editable market and investor inputs, simulation settings
(including the seed), and both comparison tables with their variation names.

The metadata identifies the model and bundled cohort data in use when the
file was saved. These identifiers are not data checksums. The file contains
market assumptions, but not the original imported price CSV, its provenance
or historical-estimation diagnostics. Mortality fits, simulation outputs and
Monte Carlo results are not included; results export is a separate feature.

Import validates the format, field types, supported choices, market and investor
inputs, and comparison-row values before changing the workspace. Export also
requires valid inputs so that its files can be imported. A valid import clears
existing fits and results; if a simulation or mortality fit is running, the
user must first confirm its interruption.

Reusing a seed does not alone guarantee identical results: the numerical
settings, batch sequence, backend, model and data also matter. Cross-backend
floating-point calculations can differ.

The app also saves an editable draft in this browser's local storage after each
change. That separate, versioned format can retain incomplete inputs; it is
not an importable setup file. It includes table variations but not fits,
simulated results, raw price files or imported-price diagnostics. Restoring a
draft does not automatically run a mortality fit. Browser data can be cleared
by the user or browser, and another tab on the same origin can overwrite the
draft, so exporting a setup remains the way to keep a portable copy.
