/**
 * Stroke lengths of SVG shapes in their own user units, for drawing strokes
 * progressively with dashes. Skia ignores `pathLength`, so the lengths are
 * measured here and the dashes written in absolute units. Curves and arcs are
 * flattened into short segments; the result is close, not exact, which is
 * enough to hide and reveal a stroke.
 */

const SEGMENTS = 24;

type Attrs = Readonly<Record<string, string>>;

/** The length of the outline a shape element strokes, or null for elements with no outline of their own. */
export function shapeLength(name: string, a: Attrs): number | null {
  const n = (k: string, d = 0): number => {
    const v = parseFloat(a[k] ?? "");
    return Number.isFinite(v) ? v : d;
  };
  switch (name) {
    case "path":
      return a.d ? pathLength(a.d) : 0;
    case "line":
      return Math.hypot(n("x2") - n("x1"), n("y2") - n("y1"));
    case "polyline":
      return polyLength(points(a.points ?? ""), false);
    case "polygon":
      return polyLength(points(a.points ?? ""), true);
    case "circle":
      return 2 * Math.PI * n("r");
    case "ellipse":
      return ellipseLength(n("rx"), n("ry"));
    case "rect": {
      const w = n("width"),
        h = n("height");
      let rx = Math.min(n("rx", n("ry")), w / 2),
        ry = Math.min(n("ry", n("rx")), h / 2);
      if (rx <= 0 || ry <= 0) rx = ry = 0;
      return 2 * (w - 2 * rx) + 2 * (h - 2 * ry) + ellipseLength(rx, ry);
    }
    default:
      return null;
  }
}

/** Ramanujan's approximation of an ellipse's circumference. */
function ellipseLength(rx: number, ry: number): number {
  if (rx <= 0 || ry <= 0) return 0;
  return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
}

function points(list: string): [number, number][] {
  const v = list
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((x) => Number.isFinite(x));
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < v.length; i += 2) out.push([v[i] as number, v[i + 1] as number]);
  return out;
}

function polyLength(p: readonly [number, number][], closed: boolean): number {
  let len = 0;
  for (let i = 1; i < p.length; i++) len += dist(p[i - 1]!, p[i]!);
  if (closed && p.length > 2) len += dist(p[p.length - 1]!, p[0]!);
  return len;
}

function dist(a: readonly [number, number], b: readonly [number, number]): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** The length of an SVG path's outline, every command included. */
export function pathLength(d: string): number {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = "";
  let x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  let cx = 0,
    cy = 0; // last control point, for S and T
  let prev = "";
  let len = 0;
  const num = (): number => Number(tokens[i++]);
  const more = (): boolean => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i] as string);
  const line = (nx: number, ny: number): void => {
    len += Math.hypot(nx - x, ny - y);
    x = nx;
    y = ny;
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, nx: number, ny: number): void => {
    let px = x,
      py = y;
    for (let s = 1; s <= SEGMENTS; s++) {
      const t = s / SEGMENTS,
        u = 1 - t;
      const qx = u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * nx;
      const qy = u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ny;
      len += Math.hypot(qx - px, qy - py);
      px = qx;
      py = qy;
    }
    cx = x2;
    cy = y2;
    x = nx;
    y = ny;
  };
  const quad = (x1: number, y1: number, nx: number, ny: number): void => {
    let px = x,
      py = y;
    for (let s = 1; s <= SEGMENTS; s++) {
      const t = s / SEGMENTS,
        u = 1 - t;
      const qx = u * u * x + 2 * u * t * x1 + t * t * nx,
        qy = u * u * y + 2 * u * t * y1 + t * t * ny;
      len += Math.hypot(qx - px, qy - py);
      px = qx;
      py = qy;
    }
    cx = x1;
    cy = y1;
    x = nx;
    y = ny;
  };
  while (i < tokens.length) {
    const t = tokens[i] as string;
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i++;
    } else if (!cmd) {
      i++;
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0,
      oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M": {
        if (!more()) break;
        x = ox + num();
        y = oy + num();
        sx = x;
        sy = y;
        // Further pairs after a move are lines.
        cmd = rel ? "l" : "L";
        break;
      }
      case "L":
        if (more()) line(ox + num(), oy + num());
        break;
      case "H":
        if (more()) line(ox + num(), y);
        break;
      case "V":
        if (more()) line(x, oy + num());
        break;
      case "C":
        if (more()) cubic(ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num());
        break;
      case "S":
        if (more()) {
          const [x1, y1] = /[CS]/i.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y];
          cubic(x1, y1, ox + num(), oy + num(), ox + num(), oy + num());
        }
        break;
      case "Q":
        if (more()) quad(ox + num(), oy + num(), ox + num(), oy + num());
        break;
      case "T":
        if (more()) {
          const [x1, y1] = /[QT]/i.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y];
          quad(x1, y1, ox + num(), oy + num());
        }
        break;
      case "A":
        if (more()) {
          const rx = Math.abs(num()),
            ry = Math.abs(num()),
            phi = num(),
            large = num(),
            sweep = num();
          const nx = ox + num(),
            ny = oy + num();
          len += arcLength(x, y, rx, ry, phi, large !== 0, sweep !== 0, nx, ny);
          x = nx;
          y = ny;
        }
        break;
      case "Z":
        line(sx, sy);
        break;
      default:
        i++;
    }
    prev = cmd;
    if (cmd.toUpperCase() === "Z") cmd = "";
  }
  return len;
}

/** An elliptical arc from the endpoint form (SVG implementation notes, F.6.5), flattened. */
function arcLength(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  phiDeg: number,
  large: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): number {
  if (rx === 0 || ry === 0) return Math.hypot(x2 - x1, y2 - y1);
  const phi = (phiDeg * Math.PI) / 180,
    cos = Math.cos(phi),
    sin = Math.sin(phi);
  const dx = (x1 - x2) / 2,
    dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy,
    y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry,
    cyp = (-coef * ry * x1p) / rx;
  const angle = (ux: number, uy: number, vx: number, vy: number): number =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2,
    cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  let len = 0,
    px = x1,
    py = y1;
  const steps = Math.max(SEGMENTS, Math.ceil((Math.abs(dt) / (2 * Math.PI)) * SEGMENTS * 4));
  for (let s = 1; s <= steps; s++) {
    const t = t1 + (dt * s) / steps;
    const ex = rx * Math.cos(t),
      ey = ry * Math.sin(t);
    const qx = cos * ex - sin * ey + cx,
      qy = sin * ex + cos * ey + cy;
    len += Math.hypot(qx - px, qy - py);
    px = qx;
    py = qy;
  }
  return len;
}
