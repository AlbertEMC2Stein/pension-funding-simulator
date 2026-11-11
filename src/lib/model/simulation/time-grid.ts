/**
 * Generate a time grid for the simulation.
 * @param horizonYears The number of years to simulate.
 * @param timeStep The frequency of the time steps.
 * @returns An array of time points.
 */
export function generateTimeGrid(
  horizonYears: number,
  timeStep: "monthly" | "fortnightly" | "weekly",
): readonly number[] {
  if (!Number.isFinite(horizonYears) || horizonYears <= 0)
    throw new RangeError("The simulation horizon must be finite and positive.");

  const stepsPerYear =
    timeStep === "monthly"
      ? 12
      : timeStep === "fortnightly"
        ? 26
        : timeStep === "weekly"
          ? 52
          : 0;

  if (
    !stepsPerYear ||
    !Number.isSafeInteger(Math.ceil(horizonYears * stepsPerYear))
  )
    throw new RangeError("Invalid time step or simulation horizon.");

  const timePoints: number[] = [0];

  // Compute each time from its index to avoid accumulated rounding error.
  for (let index = 1; index / stepsPerYear < horizonYears; index += 1)
    timePoints.push(index / stepsPerYear);
  timePoints.push(horizonYears);

  return timePoints;
}
