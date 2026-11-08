/** KL divergence on death bins plus the final survival-tail bin. */
export function survivalKlDivergence(
  times: number[],
  target: number[],
  model: number[],
): number {
  if (
    times.length < 2 ||
    target.length !== times.length ||
    model.length !== times.length ||
    times[0] !== 0 ||
    times.some(
      (value, i) => !Number.isFinite(value) || (i > 0 && value <= times[i - 1]),
    )
  )
    throw new RangeError(
      "The fitting grid must start at zero and increase strictly.",
    );
  if (
    target.some(
      (value, i) =>
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1 ||
        (i === 0 && Math.abs(value - 1) > 1e-10) ||
        (i > 0 && value > target[i - 1] + 1e-10),
    )
  )
    throw new RangeError(
      "The target must be a normalized non-increasing survival curve.",
    );
  if (
    model.some(
      (value, i) =>
        !Number.isFinite(value) ||
        value < -1e-10 ||
        value > 1 + 1e-10 ||
        (i === 0 && Math.abs(value - 1) > 1e-10) ||
        (i > 0 && value > model[i - 1] + 1e-10),
    )
  )
    return Infinity;
  const data = target.map((value, i) =>
    i === 0 ? 1 : Math.max(0, Math.min(1, value)),
  );
  const fitted = model.map((value, i) =>
    i === 0 ? 1 : Math.max(0, Math.min(1, value)),
  );
  let loss = 0;
  for (let i = 0; i < times.length; i += 1) {
    const p =
      i === times.length - 1 ? data[i] : Math.max(data[i] - data[i + 1], 0);
    const q =
      i === times.length - 1
        ? fitted[i]
        : Math.max(fitted[i] - fitted[i + 1], 0);
    if (p === 0) continue;
    if (q <= 0) return Infinity;
    loss += p * (Math.log(p) - Math.log(q));
  }
  return Number.isFinite(loss) ? Math.max(loss, 0) : Infinity;
}
