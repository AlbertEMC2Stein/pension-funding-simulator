/** Log gamma via the Lanczos approximation for the positive arguments used here. */
function logGamma(z: number): number {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5)
    return (
      Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  const x = z - 1;
  let sum = 0.9999999999998099;
  coefficients.forEach((coefficient, i) => {
    sum += coefficient / (x + i + 1);
  });
  const t = x + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum)
  );
}

/** Continued fraction for the regularized incomplete beta function. */
function betaFraction(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m += 1) {
    const m2 = 2 * m;
    let factor = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + factor * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + factor / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    factor = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + factor * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + factor / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const change = d * c;
    h *= change;
    if (Math.abs(change - 1) < 1e-14) return h;
  }
  throw new Error("Could not calculate the Student-t confidence interval.");
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaFraction(a, b, x)) / a
    : 1 - (front * betaFraction(b, a, 1 - x)) / b;
}

/** Two-sided 95% Student-t critical value, including small sample sizes. */
export function studentT95(degreesOfFreedom: number): number {
  if (!Number.isInteger(degreesOfFreedom) || degreesOfFreedom < 1)
    throw new RangeError("Degrees of freedom must be a positive integer.");
  // For t > 0, twice its upper-tail probability is I_{ν/(ν+t²)}(ν/2, 1/2).
  const tail = (t: number) =>
    regularizedBeta(
      degreesOfFreedom / (degreesOfFreedom + t * t),
      degreesOfFreedom / 2,
      0.5,
    );
  let lower = 0;
  let upper = 2;
  while (tail(upper) > 0.05) upper *= 2;
  for (let i = 0; i < 60; i += 1) {
    const middle = (lower + upper) / 2;
    if (tail(middle) > 0.05) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

/** Regularized lower incomplete gamma, evaluated by series or continued fraction. */
function gammaCdf(x: number, shape: number): number {
  if (x <= 0) return 0;
  const scale = Math.exp(-x + shape * Math.log(x) - logGamma(shape));
  if (x < shape + 1) {
    let term = 1 / shape;
    let sum = term;
    for (let n = 1; n <= 10000; n += 1) {
      term *= x / (shape + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) return scale * sum;
    }
  } else {
    const tiny = 1e-300;
    let b = x + 1 - shape;
    let c = 1 / tiny;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 10000; i += 1) {
      const a = -i * (i - shape);
      b += 2;
      d = a * d + b;
      if (Math.abs(d) < tiny) d = tiny;
      c = b + a / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      const change = d * c;
      h *= change;
      if (Math.abs(change - 1) < 1e-14) return 1 - scale * h;
    }
  }
  throw new Error("Could not calculate the chi-squared confidence interval.");
}

/** Lower and upper chi-squared quantiles for a two-sided 95% interval. */
export function chiSquare95(degreesOfFreedom: number): [number, number] {
  if (!Number.isInteger(degreesOfFreedom) || degreesOfFreedom < 1)
    throw new RangeError("Degrees of freedom must be a positive integer.");
  function quantile(probability: number): number {
    let low = 0;
    let high = Math.max(1, degreesOfFreedom);
    while (gammaCdf(high / 2, degreesOfFreedom / 2) < probability) high *= 2;
    for (let i = 0; i < 70; i += 1) {
      const middle = (low + high) / 2;
      if (gammaCdf(middle / 2, degreesOfFreedom / 2) < probability)
        low = middle;
      else high = middle;
    }
    return (low + high) / 2;
  }
  return [quantile(0.025), quantile(0.975)];
}
