// The Gaussian blur every built-in shares (`blur` on the shader path, `shadow`, `glow`, `regionBlur`,
// `shadowsHighlights`, `bevel`): a standard deviation in pixels, as CSS `blur()` reads its length, drawn as steps that
// work at the smallest size the blur allows.
//
// - A blur of σ ≥ 4 pixels is drawn at half size, of σ ≥ 8 at a quarter: each halving averages the four pixels under
//   each new one, premultiplied, so transparent pixels add no colour. The blur hides the lost detail, and the next pass,
//   full size, reads the small result through linear filtering.
// - Each direction takes its taps in pairs where it can: one linear read between two neighbouring pixels, at the offset
//   their weights give, reads both (Rákos, "Efficient Gaussian blur with linear sampling", 2010). That is exact only on
//   premultiplied colour, so the steps keep premultiplied colour between their own passes, and the first pass at full
//   size, which reads the plain picture, takes one tap per pixel.
//
// Shaders work in frame pixels and uv as always: a step works out its own texel size from its `image`'s size.
import type { ShaderStep } from "../jsx/shader-definition";

/** What a blur blurs: the luminance or the alpha (into red), or the picture. */
export type GaussWhat = "luma" | "alpha" | "rgba";
/** Past the frame's edge: transparent, as a canvas blur sees it, or the edge pixels repeated, for footage. */
export type GaussOutside = "transparent" | "clamp";

/** The σ, in frame pixels, from which a blur is drawn at half size, and at a quarter. */
export const GAUSS_HALF = 4;
export const GAUSS_QUARTER = 8;

const at = (outside: GaussOutside) =>
  `vec4 cc_at(vec2 uv) {
  return ${
    outside === "transparent"
      ? "any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0))) ? vec4(0.0) : texture(image, uv)"
      : "texture(image, uv)"
  };
}
`;

/** Half size: each pixel the average of the four under it, premultiplied. */
const down = (from: "plain" | "premultiplied", outside: GaussOutside) => `${at(outside)}vec4 effect(vec2 uv) {
  vec2 h = 0.5 / vec2(textureSize(image, 0));
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 s = cc_at(uv + vec2(i % 2 == 0 ? -h.x : h.x, i < 2 ? -h.y : h.y));
    sum += ${from === "plain" ? "vec4(s.rgb * s.a, s.a)" : "s"};
  }
  return sum / 4.0;
}`;

type Input = "plain" | "premultiplied" | "channel";
type Output = "premultiplied" | "plain" | "channel";

/** A tap as what the blur sums: premultiplied colour, or the luminance or alpha in every channel. */
function take(what: GaussWhat, input: Input): string {
  if (input === "channel") return "vec4(s.r)";
  if (what === "alpha") return "vec4(s.a)";
  if (what === "luma")
    return input === "plain" ? "vec4(cc_luma(s.rgb))" : "vec4(cc_luma(s.a > 0.0 ? s.rgb / s.a : vec3(0.0)))";
  return input === "plain" ? "vec4(s.rgb * s.a, s.a)" : "s";
}

/** One direction of the blur. Pairs of taps share one linear read unless the input is plain colour. */
function direction(
  axis: "x" | "y",
  what: GaussWhat,
  param: string,
  input: Input,
  output: Output,
  outside: GaussOutside,
): string {
  const a = axis === "x" ? "x" : "y";
  const tap = (uv: string) => `cc_take(cc_at(${uv}))`;
  const result =
    output === "premultiplied"
      ? "sum"
      : output === "plain"
        ? "sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a) : vec4(0.0)"
        : "vec4(vec3(sum.r), 1.0)";
  const linear = input !== "plain";
  return `float cc_luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
${at(outside)}vec4 cc_take(vec4 s) { return ${take(what, input)}; }
vec4 effect(vec2 uv) {
  vec2 size = vec2(textureSize(image, 0));
  float sigma = max(params.${param}, 1e-3) * size.${a} / resolution.${a};
  float reach = 3.0 * sigma;
  float spacing = max(1.0, reach / 96.0);
  int taps = int(ceil(reach / spacing));
  vec2 dir = vec2(${axis === "x" ? "1.0, 0.0" : "0.0, 1.0"}) * spacing / size;
  float k2 = 2.0 * sigma * sigma;
  vec4 sum = ${tap("uv")};
  float weights = 1.0;
  ${
    linear
      ? `for (int i = 1; i <= taps; i += 2) {
    float d1 = float(i) * spacing, d2 = float(i + 1) * spacing;
    float w1 = exp(-d1 * d1 / k2), w2 = i + 1 <= taps ? exp(-d2 * d2 / k2) : 0.0;
    float w = w1 + w2;
    float o = (float(i) * w1 + float(i + 1) * w2) / w;
    sum += w * (${tap("uv + o * dir")} + ${tap("uv - o * dir")});
    weights += 2.0 * w;
  }`
      : `for (int i = 1; i <= taps; i++) {
    float d = float(i) * spacing;
    float w = exp(-d * d / k2);
    sum += w * (${tap("uv + float(i) * dir")} + ${tap("uv - float(i) * dir")});
    weights += 2.0 * w;
  }`
  }
  sum /= weights;
  return ${result};
}`;
}

/** Every source a blur of this kind can use, for a definition's `passes`. */
export function gaussSources(what: GaussWhat, param = "radius", outside: GaussOutside = "clamp"): string[] {
  const mid: Output = what === "rgba" ? "premultiplied" : "channel";
  const end: Output = what === "rgba" ? "plain" : "channel";
  const fromMid: Input = what === "rgba" ? "premultiplied" : "channel";
  return [
    down("plain", outside),
    down("premultiplied", outside),
    direction("x", what, param, "plain", mid, outside),
    direction("x", what, param, "premultiplied", mid, outside),
    direction("y", what, param, fromMid, end, outside),
  ];
}

/** The scale a blur of σ frame pixels is drawn at. */
export function gaussScale(sigma: number): 1 | 0.5 | 0.25 {
  return sigma >= GAUSS_QUARTER ? 0.25 : sigma >= GAUSS_HALF ? 0.5 : 1;
}

/**
 * The steps of a blur of σ frame pixels, read from the `param` param. With a `box` (uv, `[x, y, width, height]`) only
 * the part of the frame the box needs is drawn: the box and, around it, as far as the blur reaches.
 */
export function gaussSteps(
  sigma: number,
  what: GaussWhat,
  param = "radius",
  outside: GaussOutside = "clamp",
  box?: readonly [number, number, number, number],
): ShaderStep[] {
  const [downPlain, downPremultiplied, xPlain, xPremultiplied, y] = gaussSources(what, param, outside) as [
    string,
    string,
    string,
    string,
    string,
  ];
  const scale = gaussScale(sigma);
  const reach = 3 * Math.max(sigma, 0);
  const texel = 1 / scale;
  // Each step must cover what the next reads: the y pass its box, the x pass the box and as far up and down as the y
  // pass reaches, the halvings as far again. A few texels more cover the linear reads at the edges.
  const region = (margin: number) => (box ? { region: { box, margin: margin + 4 * texel } } : {});
  const steps: ShaderStep[] = [];
  if (scale <= 0.5) steps.push({ source: downPlain, scale: 0.5, ...region(2 * reach) });
  if (scale === 0.25) steps.push({ source: downPremultiplied, scale: 0.25, ...region(2 * reach) });
  steps.push({ source: scale === 1 ? xPlain : xPremultiplied, scale, ...region(reach) });
  steps.push({ source: y, scale, ...region(0) });
  return steps;
}

/**
 * The passes and steps of an effect built around a blur: `before` (passes on the element), the blur of the `param`
 * param, then `after` (full size, reading the blur through linear filtering, and the element as `original`). `box`
 * picks the part of the frame the blur needs, if the effect knows it.
 */
export function aroundGauss(options: {
  readonly before?: readonly string[];
  readonly after: readonly string[];
  readonly what: GaussWhat;
  readonly param?: string;
  readonly outside?: GaussOutside;
  readonly box?: (params: Readonly<Record<string, unknown>>) => readonly [number, number, number, number] | undefined;
}): { passes: string[]; steps: (params: Readonly<Record<string, unknown>>) => ShaderStep[] } {
  const { before = [], after, what, param = "radius", outside = "clamp", box } = options;
  return {
    passes: [...before, ...gaussSources(what, param, outside), ...after],
    steps: (params) => {
      const sigma = typeof params[param] === "number" ? (params[param] as number) : 0;
      return [
        ...before.map((source) => ({ source })),
        ...gaussSteps(sigma, what, param, outside, box?.(params)),
        ...after.map((source) => ({ source })),
      ];
    },
  };
}
