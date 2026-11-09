/** Deterministic Nelder–Mead optimization for small unconstrained problems. */
export function nelderMead(
  objective: (point: number[]) => number,
  start: number[],
  maxIterations = 1500,
) {
  type Vertex = { x: number[]; loss: number };
  const evaluate = (x: number[]): Vertex => ({ x, loss: objective(x) });
  const n = start.length;
  const simplex = [
    evaluate([...start]),
    ...start.map((value, index) => {
      const x = [...start];
      x[index] = value === 0 ? 0.00025 : value * 1.05;
      return evaluate(x);
    }),
  ];
  let iterations = 0;
  let converged = false;
  for (; iterations < maxIterations; iterations += 1) {
    simplex.sort((a, b) => a.loss - b.loss);
    const best = simplex[0];
    const spreadX = Math.max(
      ...simplex
        .slice(1)
        .flatMap((v) => v.x.map((value, i) => Math.abs(value - best.x[i]))),
    );
    const spreadLoss = Math.max(
      ...simplex.slice(1).map((v) => Math.abs(v.loss - best.loss)),
    );
    if (Number.isFinite(best.loss) && spreadX <= 1e-9 && spreadLoss <= 1e-11) {
      converged = true;
      break;
    }
    const centroid = Array.from(
      { length: n },
      (_, i) => simplex.slice(0, n).reduce((sum, v) => sum + v.x[i], 0) / n,
    );
    const worst = simplex[n];
    const point = (factor: number) =>
      centroid.map((value, i) => value + factor * (centroid[i] - worst.x[i]));
    const reflected = evaluate(point(1));
    if (reflected.loss < best.loss) {
      const expanded = evaluate(point(2));
      simplex[n] = expanded.loss < reflected.loss ? expanded : reflected;
    } else if (reflected.loss < simplex[n - 1].loss) simplex[n] = reflected;
    else {
      const outside = reflected.loss < worst.loss;
      const contracted = evaluate(point(outside ? 0.5 : -0.5));
      if (contracted.loss < (outside ? reflected.loss : worst.loss))
        simplex[n] = contracted;
      else
        for (let i = 1; i <= n; i += 1)
          simplex[i] = evaluate(
            simplex[i].x.map(
              (value, j) => best.x[j] + 0.5 * (value - best.x[j]),
            ),
          );
    }
  }
  simplex.sort((a, b) => a.loss - b.loss);
  return { point: simplex[0].x, loss: simplex[0].loss, converged, iterations };
}
