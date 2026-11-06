// CSS filter functions as shader passes, so an element's CSS-type effects can run between its shader effects, in the
// order the file writes them. Each pass is the W3C Filter Effects Module Level 1 definition of its function ("Filter
// Functions" and their SVG equivalents), on plain (not premultiplied) colour, clamped to 0..1 after each, as the
// browser's filter does. The input is a CSS filter string of the forms the player writes (model/effects.ts), so the
// shader and the no-WebGL fallback share one mapping from params to CSS.
import type { ShaderPass } from "./shaders";

type Params = Readonly<Record<string, unknown>>;

/** `rgb = clamp(rgb * slope + offset)`: the spec's linear transfer functions (brightness, contrast, invert). */
const LINEAR = `vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  return vec4(clamp(c.rgb * slope + offset, 0.0, 1.0), c.a);
}`;

/** A 3 × 3 colour matrix, rows r0..r2: the spec's saturate, hue-rotate, sepia and grayscale. */
const MATRIX = `vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  return vec4(clamp(vec3(dot(r0, c.rgb), dot(r1, c.rgb), dot(r2, c.rgb)), 0.0, 1.0), c.a);
}`;

/**
 * One direction of a Gaussian of standard deviation `sigma` pixels, sampled at every pixel out to three deviations
 * (at most 96 each side, spread wider past that), on premultiplied colour. Outside the frame is transparent, as the
 * canvas's own blur sees it.
 */
const gauss = (axis: "x" | "y", alphaOnly: boolean) => `vec4 cc_at(vec2 uv) {
  return any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0))) ? vec4(0.0) : texture(image, uv);
}
vec4 effect(vec2 uv) {
  if (sigma <= 0.0) return texture(image, uv);
  float reach = 3.0 * sigma;
  float n = min(ceil(reach), 96.0);
  vec2 dir = vec2(${axis === "x" ? "1.0, 0.0" : "0.0, 1.0"}) * (reach / n) / resolution;
  vec4 sum = vec4(0.0);
  float weights = 0.0;
  for (int i = -96; i <= 96; i++) {
    if (abs(float(i)) > n) continue;
    float d = float(i) * reach / n;
    float w = exp(-d * d / (2.0 * sigma * sigma));
    vec4 s = cc_at(uv + float(i) * dir);
    sum += w * ${alphaOnly ? (axis === "x" ? "vec4(s.a)" : "vec4(s.r)") : "vec4(s.rgb * s.a, s.a)"};
    weights += w;
  }
  sum /= weights;
  return ${alphaOnly ? "vec4(vec3(sum.r), 1.0)" : "sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a) : vec4(0.0)"};
}`;

/** The shadow: the blurred alpha (in red) read back by `offset` pixels, coloured, drawn under the original. */
const SHADOW = `vec4 effect(vec2 uv) {
  vec4 o = texture(original, uv);
  vec2 at = uv - offset / resolution;
  float a = any(lessThan(at, vec2(0.0))) || any(greaterThan(at, vec2(1.0))) ? 0.0 : texture(image, at).r;
  float s = a * color.a;
  float out_a = o.a + s * (1.0 - o.a);
  if (out_a <= 0.0) return vec4(0.0);
  return vec4((o.rgb * o.a + color.rgb * s * (1.0 - o.a)) / out_a, out_a);
}`;

const pass = (name: string, sources: readonly string[], params: Params, time: number): ShaderPass => ({
  name: `css:${name}`,
  sources,
  builtIn: true,
  params,
  time,
});

/** The spec's saturate matrix for s. */
function saturate(s: number): number[][] {
  return [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
  ];
}

/** The spec's hue-rotate matrix for an angle in degrees. */
function hueRotate(degrees: number): number[][] {
  const a = (degrees * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [
    [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
    [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283],
    [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
  ];
}

/** The spec's sepia matrix for an amount (s = 1 − amount). */
function sepia(amount: number): number[][] {
  const s = 1 - Math.min(1, Math.max(0, amount));
  return [
    [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s],
    [0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s],
    [0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s],
  ];
}

/** The spec's grayscale matrix for an amount (s = 1 − amount). */
function grayscale(amount: number): number[][] {
  const s = 1 - Math.min(1, Math.max(0, amount));
  return [
    [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s],
    [0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s],
    [0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s],
  ];
}

const matrix = (name: string, rows: number[][], time: number): ShaderPass =>
  pass(name, [MATRIX], { r0: rows[0], r1: rows[1], r2: rows[2] }, time);

/** A number or a percentage, as a CSS filter argument. */
function amount(arg: string): number {
  const v = Number.parseFloat(arg);
  return arg.trim().endsWith("%") ? v / 100 : v;
}

/** A CSS length in pixels (the player writes `px`). */
const px = (arg: string): number => Number.parseFloat(arg) || 0;

/** A CSS angle in degrees. */
function degrees(arg: string): number {
  const v = Number.parseFloat(arg);
  if (arg.endsWith("rad")) return (v * 180) / Math.PI;
  if (arg.endsWith("turn")) return v * 360;
  return v;
}

/**
 * A CSS colour as [r, g, b, a] on 0..1: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` are read here;
 * any other form is asked of a 2D canvas, which writes it back in one of those, where there is one; else black.
 */
export function cssColour(text: string): [number, number, number, number] {
  const t = text.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(t)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
    const v = [0, 2, 4, 6].map((i) => (i < full.length ? Number.parseInt(full.slice(i, i + 2), 16) / 255 : 1));
    return v as [number, number, number, number];
  }
  const rgb = /^rgba?\(([^)]*)\)$/i.exec(t)?.[1];
  if (rgb) {
    const parts = rgb.split(/[\s,/]+/).filter(Boolean);
    const channel = (p: string | undefined) => (p?.endsWith("%") ? Number.parseFloat(p) / 100 : Number(p) / 255);
    const alpha =
      parts[3] === undefined ? 1 : parts[3].endsWith("%") ? Number.parseFloat(parts[3]) / 100 : Number(parts[3]);
    return [channel(parts[0]), channel(parts[1]), channel(parts[2]), alpha];
  }
  const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1, 1) : null;
  const ctx = canvas?.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#000";
    ctx.fillStyle = t;
    const normal = String(ctx.fillStyle);
    if (normal !== t) return cssColour(normal);
  }
  return [0, 0, 0, 1];
}

/** The functions of a CSS filter string, name and arguments, split at the top level of its parentheses. */
export function cssFunctions(filter: string): { name: string; args: string }[] {
  const out: { name: string; args: string }[] = [];
  const re = /([a-z-]+)\(/gi;
  let m: RegExpExecArray | null;
  let at = 0;
  for (;;) {
    re.lastIndex = at;
    m = re.exec(filter);
    if (!m) break;
    let depth = 1,
      i = re.lastIndex;
    for (; i < filter.length && depth > 0; i++) {
      if (filter[i] === "(") depth++;
      else if (filter[i] === ")") depth--;
    }
    out.push({ name: (m[1] as string).toLowerCase(), args: filter.slice(re.lastIndex, i - 1).trim() });
    at = i;
  }
  return out;
}

/** A CSS filter string as shader passes, in its order; at element-relative `time`. */
export function cssPasses(filter: string, time: number): ShaderPass[] {
  const out: ShaderPass[] = [];
  for (const { name, args } of cssFunctions(filter)) {
    switch (name) {
      case "brightness": {
        out.push(pass(name, [LINEAR], { slope: amount(args), offset: 0 }, time));
        break;
      }
      case "contrast": {
        const a = amount(args);
        out.push(pass(name, [LINEAR], { slope: a, offset: 0.5 - 0.5 * a }, time));
        break;
      }
      case "invert": {
        const a = Math.min(1, Math.max(0, amount(args)));
        out.push(pass(name, [LINEAR], { slope: 1 - 2 * a, offset: a }, time));
        break;
      }
      case "saturate":
        out.push(matrix(name, saturate(amount(args)), time));
        break;
      case "hue-rotate":
        out.push(matrix(name, hueRotate(degrees(args)), time));
        break;
      case "sepia":
        out.push(matrix(name, sepia(amount(args)), time));
        break;
      case "grayscale":
        out.push(matrix(name, grayscale(amount(args)), time));
        break;
      case "blur":
        out.push(pass(name, [gauss("x", false), gauss("y", false)], { sigma: px(args) }, time));
        break;
      case "drop-shadow": {
        // `x y [blur] colour`: the lengths first, the colour after them (it may hold spaces, as rgba() does).
        const lengths = /^\s*(-?[\d.]+(?:px)?)\s+(-?[\d.]+(?:px)?)(?:\s+([\d.]+(?:px)?))?\s*(.*)$/.exec(args);
        if (!lengths) break;
        const [, x, y, b, colour] = lengths;
        out.push(
          pass(
            name,
            [gauss("x", true), gauss("y", true), SHADOW],
            {
              // The blur length is the Gaussian's standard deviation, as for blur() (measured against Chrome's
              // canvas filter: half of it, as box-shadow reads its blur, comes out visibly tighter).
              sigma: px(b ?? "0"),
              offset: [px(x as string), px(y as string)],
              color: cssColour(colour || "black"),
            },
            time,
          ),
        );
        break;
      }
    }
  }
  return out;
}
