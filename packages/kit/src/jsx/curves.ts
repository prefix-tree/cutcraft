// A tone curve through control points, for `<Effect type="curves">`: monotone cubic Hermite interpolation with the
// tangents limited as Fritsch and Carlson give ("Monotone Piecewise Cubic Interpolation", SIAM J. Numer. Anal., 1980),
// so a curve whose points rise never dips or overshoots between them. Before the first point and after the last it is
// flat.

/** A point of a curve: input and output, each 0..1. */
export type CurvePoint = readonly [number, number];

/** The curve through `points` (x strictly increasing) as a function on 0..1, clamped to 0..1. */
export function monotoneCurve(points: readonly CurvePoint[]): (x: number) => number {
  const n = points.length;
  if (n < 2) throw new Error("a curve needs two points or more");
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  for (let i = 1; i < n; i++)
    if ((xs[i] as number) <= (xs[i - 1] as number)) throw new Error("a curve's points go left to right, x rising");
  // Secants, then tangents: the mean of the secants either side, one-sided at the ends.
  const d = xs.slice(1).map((x, i) => ((ys[i + 1] as number) - (ys[i] as number)) / (x - (xs[i] as number)));
  const m = xs.map((_, i) =>
    i === 0 ? (d[0] as number) : i === n - 1 ? (d[n - 2] as number) : ((d[i - 1] as number) + (d[i] as number)) / 2,
  );
  for (let i = 0; i < n - 1; i++) {
    const di = d[i] as number;
    if (di === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    // Where the secants change direction the point is an extremum: a flat tangent keeps it one.
    if (i > 0 && Math.sign(d[i - 1] as number) !== Math.sign(di)) m[i] = 0;
    const a = (m[i] as number) / di,
      b = (m[i + 1] as number) / di;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * di;
      m[i + 1] = tau * b * di;
    }
  }
  return (x) => {
    if (x <= (xs[0] as number)) return clamp01(ys[0] as number);
    if (x >= (xs[n - 1] as number)) return clamp01(ys[n - 1] as number);
    let k = 0;
    while (x > (xs[k + 1] as number)) k++;
    const h = (xs[k + 1] as number) - (xs[k] as number);
    const t = (x - (xs[k] as number)) / h;
    const t2 = t * t,
      t3 = t2 * t;
    const y =
      (2 * t3 - 3 * t2 + 1) * (ys[k] as number) +
      (t3 - 2 * t2 + t) * h * (m[k] as number) +
      (-2 * t3 + 3 * t2) * (ys[k + 1] as number) +
      (t3 - t2) * h * (m[k + 1] as number);
    return clamp01(y);
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
