// Built-in effects drawn by a shader: each is a `defineEffect` the kit declares itself, run by the same pipeline as a
// file's own. A built-in shader effect keeps a CSS filter of the same type as its fallback where there is no WebGL
// (player/src/model/effects.ts).
import { z } from "zod";

import { type CurvePoint, monotoneCurve } from "./curves";
import { type ShaderDefinition, shaderDefinition } from "./shaders";

/**
 * GLSL the colour effects share: the sRGB transfer function both ways (IEC 61966-2-1), so light is added and scaled
 * where it is linear, and Rec. 709 luminance (ITU-R BT.709, the weights sRGB's primaries give).
 */
const COLOUR = `vec3 cc_linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 cc_srgb(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float cc_luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

const HEX = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'a colour is "#rgb" or "#rrggbb"');

/**
 * Levels: the input range [black, white] stretched to [0, 1], then a gamma curve on the midtones, per channel:
 * out = ((in − black) / (white − black)) ^ (1 / gamma). Gamma above 1 lifts the midtones, below 1 deepens them; black
 * and white stay where they are. The standard input-levels adjustment of image editors.
 */
const levels = shaderDefinition("effect", {
  name: "levels",
  params: z.object({
    black: z.number().min(0).max(1).default(0),
    white: z.number().min(0).max(1).default(1),
    gamma: z.number().min(0.01).max(10).default(1),
  }),
  shader: `vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float range = max(white - black, 1e-5);
  vec3 v = clamp((c.rgb - black) / range, 0.0, 1.0);
  return vec4(pow(v, vec3(1.0 / max(gamma, 0.01))), c.a);
}`,
});

/**
 * A 3D colour lookup table (a `.cube` file in the manifest, kind `lut`): each colour is looked up in the table's cube,
 * between its entries by trilinear filtering, and mixed with the original by `amount`. The coordinates are moved half an
 * entry in, so 0 and 1 land on the first and last entries' centres rather than their edges.
 */
const lut = shaderDefinition("effect", {
  name: "lut",
  params: z.object({
    src: z.string().regex(/^asset:/, 'the LUT, as "asset:ID": a .cube file in the manifest'),
    amount: z.number().min(0).max(1).default(1),
  }),
  shader: `vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float n = float(textureSize(src, 0).x);
  vec3 graded = texture(src, (clamp(c.rgb, 0.0, 1.0) * (n - 1.0) + 0.5) / n).rgb;
  return vec4(mix(c.rgb, graded, amount), c.a);
}`,
});

/** Exposure in stops, as a camera's: light scaled by 2^stops where it is linear, so +1 doubles it. */
const exposure = shaderDefinition("effect", {
  name: "exposure",
  params: z.object({ stops: z.number().min(-5).max(5).default(0) }),
  shader: `${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  return vec4(clamp(cc_srgb(cc_linear(c.rgb) * exp2(stops)), 0.0, 1.0), c.a);
}`,
});

/**
 * Vibrance: saturation that moves muted colours most and leaves saturated ones nearly alone. A colour's saturation is
 * its spread (max − min of its channels); raising vibrance pushes it from its luminance by amount × (1 − spread).
 * Lowering it desaturates evenly.
 */
const vibrance = shaderDefinition("effect", {
  name: "vibrance",
  params: z.object({ amount: z.number().min(-1).max(1).default(0) }),
  shader: `${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float spread = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float k = amount > 0.0 ? amount * (1.0 - spread) : amount;
  return vec4(clamp(mix(vec3(cc_luma(c.rgb)), c.rgb, 1.0 + k), 0.0, 1.0), c.a);
}`,
});

/**
 * White balance as a chromatic adaptation (von Kries scaling in the Bradford cone space): the picture is taken as lit
 * by a daylight white of another colour temperature and tint, and adapted to D65. The scene white's chromaticity is
 * the CIE daylight locus at T = 6500 K · 2^(temperature / 100), moved off it along y by the tint. A positive
 * temperature warms the picture, a positive tint makes it more magenta.
 */
const whiteBalance = shaderDefinition("effect", {
  name: "whiteBalance",
  params: z.object({
    temperature: z.number().min(-100).max(100).default(0),
    tint: z.number().min(-100).max(100).default(0),
  }),
  shader: `${COLOUR}
// Rows of linear sRGB (D65) to XYZ, and of the Bradford matrix, written as rows: v * M is then M times v.
const mat3 RGB_XYZ = mat3(0.4124564, 0.3575761, 0.1804375, 0.2126729, 0.7151522, 0.0721750, 0.0193339, 0.1191920, 0.9503041);
const mat3 XYZ_RGB = mat3(3.2404542, -1.5371385, -0.4985314, -0.9692660, 1.8760108, 0.0415560, 0.0556434, -0.2040259, 1.0572252);
const mat3 BRADFORD = mat3(0.8951, 0.2664, -0.1614, -0.7502, 1.7135, 0.0367, 0.0389, -0.0685, 1.0296);
const mat3 BRADFORD_INV = mat3(0.9869929, -0.1470543, 0.1599627, 0.4323053, 0.5183603, 0.0492912, -0.0085287, 0.0400428, 0.9684867);
vec3 cc_xyz(vec2 xy) { return vec3(xy.x / xy.y, 1.0, (1.0 - xy.x - xy.y) / xy.y); }
vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float t = 6500.0 * exp2(temperature / 100.0);
  float x = t <= 7000.0
    ? -4.6070e9 / (t * t * t) + 2.9678e6 / (t * t) + 0.09911e3 / t + 0.244063
    : -2.0064e9 / (t * t * t) + 1.9018e6 / (t * t) + 0.24748e3 / t + 0.237040;
  float y = -3.0 * x * x + 2.87 * x - 0.275 + tint * 0.0005;
  vec3 gain = (cc_xyz(vec2(0.3127, 0.3290)) * BRADFORD) / (cc_xyz(vec2(x, y)) * BRADFORD);
  vec3 lms = (cc_linear(c.rgb) * RGB_XYZ) * BRADFORD;
  vec3 rgb = ((lms * gain) * BRADFORD_INV) * XYZ_RGB;
  return vec4(clamp(cc_srgb(rgb), 0.0, 1.0), c.a);
}`,
});

/**
 * One pass of a separable Gaussian blur of `radius` pixels: 33 taps along x or y spanning three standard deviations
 * each way. `luma` blurs the luminance (the result's red), `rgba` the picture, weighted by alpha so transparent pixels
 * add no colour.
 */
const GAUSS_PASS = (axis: "x" | "y", what: "luma" | "rgba") => `${COLOUR}vec4 effect(vec2 uv) {
  float sigma = max(radius, 1.0) / 3.0;
  vec2 dir = vec2(${axis === "x" ? "1.0, 0.0" : "0.0, 1.0"}) * max(radius, 1.0) / 16.0 / resolution;
  vec4 sum = vec4(0.0);
  float weights = 0.0;
  for (int i = -16; i <= 16; i++) {
    float d = float(i) * max(radius, 1.0) / 16.0;
    float w = exp(-d * d / (2.0 * sigma * sigma));
    vec4 s = texture(image, uv + float(i) * dir);
    sum += w * ${what === "rgba" ? "vec4(s.rgb * s.a, s.a)" : axis === "x" ? "vec4(cc_luma(s.rgb))" : "vec4(s.r)"};
    weights += w;
  }
  sum /= weights;
  return ${what === "rgba" ? "sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a) : vec4(0.0)" : "vec4(vec3(sum.r), 1.0)"};
}`;

/**
 * Shadows and highlights, a local tone adjustment: the luminance around each pixel (a Gaussian blur of the radius, in
 * two separable passes) says how much it is shadow or highlight, and the third pass brightens or darkens it there, by
 * up to 2 stops where the light is linear. A pixel decides by its surroundings, not by itself, so detail in a dark
 * area keeps its contrast while the area lifts.
 */
const shadowsHighlights = shaderDefinition("effect", {
  name: "shadowsHighlights",
  params: z.object({
    shadows: z.number().min(-1).max(1).default(0),
    highlights: z.number().min(-1).max(1).default(0),
    radius: z.number().min(1).max(200).default(30),
  }),
  passes: [
    GAUSS_PASS("x", "luma"),
    GAUSS_PASS("y", "luma"),
    `${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(original, uv);
  float around = texture(image, uv).r;
  float dark = 1.0 - smoothstep(0.0, 0.5, around);
  float bright = smoothstep(0.5, 1.0, around);
  float stops = 2.0 * (shadows * dark + highlights * bright);
  return vec4(clamp(cc_srgb(cc_linear(c.rgb) * exp2(stops)), 0.0, 1.0), c.a);
}`,
  ],
});

/** Duotone: the picture's luminance mapped from one colour (its blacks) to another (its whites), mixed by amount. */
const duotone = shaderDefinition("effect", {
  name: "duotone",
  params: z.object({
    dark: HEX.default("#1d2b53"),
    light: HEX.default("#ffd27f"),
    amount: z.number().min(0).max(1).default(1),
  }),
  shader: `${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  vec3 toned = mix(dark, light, cc_luma(c.rgb));
  return vec4(mix(c.rgb, toned, amount), c.a);
}`,
});

const curvePoints = z
  .array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]))
  .min(2)
  .refine((points) => points.every((p, i) => i === 0 || p[0] > (points[i - 1] as CurvePoint)[0]), {
    message: "a curve's points go left to right, x rising",
  })
  .default([
    [0, 0],
    [1, 1],
  ]);

/**
 * Curves: a tone curve for all three channels (`rgb`) and one for each (`red`, `green`, `blue`), applied in that
 * order, each a monotone cubic through its points (./curves.ts). The four are baked into one 256 × 1 table, read
 * at the centre of each entry.
 */
const curves = {
  ...shaderDefinition("effect", {
    name: "curves",
    params: z.object({ rgb: curvePoints, red: curvePoints, green: curvePoints, blue: curvePoints }),
    shader: `vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  vec3 at = (clamp(c.rgb, 0.0, 1.0) * 255.0 + 0.5) / 256.0;
  return vec4(texture(curve, vec2(at.r, 0.5)).r, texture(curve, vec2(at.g, 0.5)).g, texture(curve, vec2(at.b, 0.5)).b, c.a);
}`,
  }),
  tables: (params: Readonly<Record<string, unknown>>) => {
    const line = (key: string) =>
      monotoneCurve(
        (params[key] as readonly CurvePoint[] | undefined) ?? [
          [0, 0],
          [1, 1],
        ],
      );
    const all = line("rgb"),
      channels = [line("red"), line("green"), line("blue")];
    const data = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      const v = all(i / 255);
      channels.forEach((f, c) => {
        data[i * 4 + c] = Math.round(f(v) * 255);
      });
      data[i * 4 + 3] = 255;
    }
    return { curve: { width: 256, height: 1, data } };
  },
} satisfies ShaderDefinition;

const UV = z.tuple([z.number(), z.number()]);

/**
 * Colour key (green or blue screen): how far each pixel's chroma lies from the key colour's, in the Cb, Cr plane of
 * Rec. 709 YCbCr (brightness left out, so the shadowed and lit parts of the screen key alike), sets its alpha: gone
 * within `tolerance`, kept beyond `tolerance + softness`, faded between. Spill suppression then pulls the key colour's
 * strongest channel on the kept pixels down toward the mean of the other two, removing the screen's light bounced onto
 * the subject.
 */
const colorKey = shaderDefinition("effect", {
  name: "colorKey",
  params: z.object({
    color: HEX.default("#00ff00"),
    tolerance: z.number().min(0).max(1).default(0.3),
    softness: z.number().min(0).max(1).default(0.1),
    spill: z.number().min(0).max(1).default(0.5),
  }),
  shader: `vec2 ck_chroma(vec3 c) {
  return vec2(-0.1146 * c.r - 0.3854 * c.g + 0.5 * c.b, 0.5 * c.r - 0.4542 * c.g - 0.0458 * c.b);
}
vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float d = 2.0 * distance(ck_chroma(c.rgb), ck_chroma(color));
  float keep = smoothstep(tolerance, tolerance + softness + 1e-4, d);
  vec3 rgb = c.rgb;
  if (color.g >= color.r && color.g >= color.b) rgb.g = mix(rgb.g, min(rgb.g, (rgb.r + rgb.b) / 2.0), spill);
  else if (color.b >= color.r) rgb.b = mix(rgb.b, min(rgb.b, (rgb.r + rgb.g) / 2.0), spill);
  else rgb.r = mix(rgb.r, min(rgb.r, (rgb.g + rgb.b) / 2.0), spill);
  return vec4(rgb, c.a * keep);
}`,
});

/**
 * A blur inside a box (faces, plates, screens), or outside it with `inverted`: the picture blurred in two Gaussian
 * passes, then mixed with the original by a mask from the signed distance to a rounded box (`roundness` 1 rounds the
 * short side fully). `feather` fades the blur in over that many pixels inside the box's edge.
 */
const regionBlur = shaderDefinition("effect", {
  name: "regionBlur",
  params: z.object({
    box: z
      .tuple([z.number(), z.number(), z.number().positive(), z.number().positive()])
      .default([0.25, 0.25, 0.5, 0.5]),
    radius: z.number().min(0).max(200).default(20),
    feather: z.number().min(0).max(500).default(10),
    roundness: z.number().min(0).max(1).default(0),
    inverted: z.boolean().default(false),
  }),
  passes: [
    GAUSS_PASS("x", "rgba"),
    GAUSS_PASS("y", "rgba"),
    `vec4 effect(vec2 uv) {
  vec2 p = uv * resolution;
  vec2 half_size = box.zw * resolution / 2.0;
  vec2 centre = box.xy * resolution + half_size;
  float r = roundness * min(half_size.x, half_size.y);
  vec2 q = abs(p - centre) - (half_size - r);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float m = feather > 0.0 ? clamp(-d / feather, 0.0, 1.0) : (d <= 0.0 ? 1.0 : 0.0);
  if (inverted) m = 1.0 - m;
  return mix(texture(original, uv), texture(image, uv), m);
}`,
  ],
});

/**
 * Corner pin: the picture mapped onto the quadrilateral of its four corners by a projective transform, so a screen
 * recording sits in a screen filmed at an angle. The square-to-quad homography (Heckbert, "Fundamentals of Texture
 * Mapping and Image Warping", 1989) is inverted per pixel to find where in the picture each pixel of the quad comes
 * from; outside the quad is transparent.
 */
const cornerPin = shaderDefinition("effect", {
  name: "cornerPin",
  params: z.object({
    topLeft: UV.default([0, 0]),
    topRight: UV.default([1, 0]),
    bottomRight: UV.default([1, 1]),
    bottomLeft: UV.default([0, 1]),
  }),
  shader: `vec4 effect(vec2 uv) {
  vec2 p0 = topLeft, p1 = topRight, p2 = bottomRight, p3 = bottomLeft;
  vec2 d1 = p1 - p2, d2 = p3 - p2, d3 = p0 - p1 + p2 - p3;
  float den = d1.x * d2.y - d2.x * d1.y;
  float g = 0.0, h = 0.0;
  if (abs(den) > 1e-8 && (abs(d3.x) > 1e-8 || abs(d3.y) > 1e-8)) {
    g = (d3.x * d2.y - d2.x * d3.y) / den;
    h = (d1.x * d3.y - d3.x * d1.y) / den;
  }
  // Columns of the matrix taking (u, v, 1) in the picture to (x, y, w) in the frame.
  mat3 m = mat3(p1.x - p0.x + g * p1.x, p1.y - p0.y + g * p1.y, g,
                p3.x - p0.x + h * p3.x, p3.y - p0.y + h * p3.y, h,
                p0.x, p0.y, 1.0);
  vec3 s = inverse(m) * vec3(uv, 1.0);
  if (s.z <= 0.0) return vec4(0.0);
  vec2 at = s.xy / s.z;
  if (any(lessThan(at, vec2(0.0))) || any(greaterThan(at, vec2(1.0)))) return vec4(0.0);
  return texture(image, at);
}`,
});

/** Zoom blur: each pixel averaged along the line toward `center`, the smear growing with distance to `amount` pixels at a corner. */
const zoomBlur = shaderDefinition("effect", {
  name: "zoomBlur",
  params: z.object({
    amount: z.number().min(0).max(500).default(40),
    center: UV.default([0.5, 0.5]),
    samples: z.number().int().min(1).max(64).default(24),
  }),
  shader: `vec4 effect(vec2 uv) {
  float reach = amount / length(resolution / 2.0);
  int n = int(samples);
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 64; i++) {
    if (i >= n) break;
    float t = n > 1 ? float(i) / float(n - 1) : 0.0;
    vec4 s = texture(image, uv + (center - uv) * reach * t);
    sum += vec4(s.rgb * s.a, s.a);
  }
  sum /= float(n);
  return sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a) : vec4(0.0);
}`,
});

/**
 * Chromatic aberration: red and blue read from either side of each pixel, green in place. Along `angle` it is a
 * uniform split of `amount` pixels; with `radial` the split points out from `center` and grows with distance to
 * `amount` pixels at a corner, as a lens fringes toward its edges.
 */
const chromaticAberration = shaderDefinition("effect", {
  name: "chromaticAberration",
  params: z.object({
    amount: z.number().min(0).max(100).default(4),
    angle: z.number().default(0),
    radial: z.boolean().default(false),
    center: UV.default([0.5, 0.5]),
  }),
  shader: `vec4 effect(vec2 uv) {
  float a = radians(angle);
  vec2 shift = radial
    ? (uv - center) * amount / length(resolution / 2.0)
    : vec2(cos(a), sin(a)) * amount / resolution;
  vec4 c = texture(image, uv);
  vec4 r = texture(image, uv - shift);
  vec4 b = texture(image, uv + shift);
  return vec4(r.r, c.g, b.b, max(c.a, max(r.a, b.a)));
}`,
});

/** The built-in effect types the kit draws with a shader. */
export const BUILT_IN_SHADERS: readonly ShaderDefinition[] = [
  levels,
  lut,
  exposure,
  vibrance,
  whiteBalance,
  shadowsHighlights,
  duotone,
  curves,
  colorKey,
  regionBlur,
  cornerPin,
  zoomBlur,
  chromaticAberration,
];

/** Built-in shader effects with no CSS filter to fall back on: without WebGL they are not drawn. */
export const SHADER_ONLY_EFFECTS = [
  "lut",
  "whiteBalance",
  "shadowsHighlights",
  "duotone",
  "curves",
  "colorKey",
  "regionBlur",
  "cornerPin",
  "zoomBlur",
  "chromaticAberration",
] as const;

/** The built-in shader of an effect type, if it has one. */
export function builtInShader(type: unknown): ShaderDefinition | undefined {
  return BUILT_IN_SHADERS.find((s) => s.name === type);
}
