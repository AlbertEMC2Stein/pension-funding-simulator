/** Result of numerical integration, with an estimated—not certified—error. */
export interface QuadratureResult {
  value: number;
  estimatedError: number;
}

/**
 * Integrate a smooth scalar function with adaptive Simpson quadrature. The
 * estimate uses local refinement and reports an error indicator, not a rigorous
 * bound. A depth limit raises an error instead of silently accepting a result
 * that failed to meet its requested tolerance. The caller supplies a finite
 * interval, non-negative tolerances and an integrand finite on that interval.
 */
export function adaptiveQuadrature(
  integrand: (time: number) => number,
  start: number,
  end: number,
  absoluteTolerance: number,
  relativeTolerance: number,
): QuadratureResult {
  if (start === end) return { value: 0, estimatedError: 0 };

  /** Evaluate and reject numerical failures before they contaminate the sum. */
  function evaluate(time: number): number {
    const value = integrand(time);
    if (!Number.isFinite(value))
      throw new RangeError("Quadrature produced a non-finite integrand.");

    return value;
  }

  /** Refine a Simpson panel until its local error estimate meets tolerance. */
  function refine(
    a: number,
    b: number,
    fa: number,
    fm: number,
    fb: number,
    whole: number,
    tolerance: number,
    depth: number,
  ): QuadratureResult {
    const middle = (a + b) / 2;
    const leftMid = (a + middle) / 2;
    const rightMid = (middle + b) / 2;
    const fl = evaluate(leftMid);
    const fr = evaluate(rightMid);
    const left = ((middle - a) / 6) * (fa + 4 * fl + fm);
    const right = ((b - middle) / 6) * (fm + 4 * fr + fb);
    const correction = (left + right - whole) / 15;

    if (Math.abs(correction) <= tolerance)
      return {
        value: left + right + correction,
        estimatedError: Math.abs(correction),
      };
    if (depth === 0 || leftMid === a || rightMid === b)
      throw new RangeError(
        "Quadrature did not converge for this configuration.",
      );

    const l = refine(a, middle, fa, fl, fm, left, tolerance / 2, depth - 1);
    const r = refine(middle, b, fm, fr, fb, right, tolerance / 2, depth - 1);

    return {
      value: l.value + r.value,
      estimatedError: l.estimatedError + r.estimatedError,
    };
  }

  const midpoint = (start + end) / 2;
  const fa = evaluate(start);
  const fm = evaluate(midpoint);
  const fb = evaluate(end);
  const initial = ((end - start) / 6) * (fa + 4 * fm + fb);
  const tolerance = Math.max(
    absoluteTolerance,
    relativeTolerance * Math.abs(initial),
  );

  return refine(start, end, fa, fm, fb, initial, tolerance, 22);
}
