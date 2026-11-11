# Scalar reference

These JavaScript/TypeScript modules implement the original scalar grid-only
reference. They remain available for deterministic comparisons with the
TensorFlow backend; they are not connected to the frontend. The shared time grid,
random stream and prepared boundary coefficients live in the parent directory.

The scalar batch restarts its stream from the snapshot seed on each call, so
separate calls must not be combined as independent batches. This code does not
implement bridge detection or mortality-weighted risk.
