// Colour for footage: levels, a LUT, exposure, vibrance, white balance, shadows and highlights, duotone and curves.
import { z } from "zod";

import { type CurvePoint, monotoneCurve } from "../jsx/curves";
import { type ShaderDefinition, shaderDefinition } from "../jsx/shader-definition";
import { aroundGauss } from "./gauss";
import { COLOUR, HEX } from "./glsl";

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
  float range = max(params.white - params.black, 1e-5);
  vec3 v = clamp((c.rgb - params.black) / range, 0.0, 1.0);
  return vec4(pow(v, vec3(1.0 / max(params.gamma, 0.01))), c.a);
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
  float n = float(textureSize(params.src, 0).x);
  vec3 graded = texture(params.src, (clamp(c.rgb, 0.0, 1.0) * (n - 1.0) + 0.5) / n).rgb;
  return vec4(mix(c.rgb, graded, params.amount), c.a);
}`,
});

/** Exposure in stops, as a camera's: light scaled by 2^stops where it is linear, so +1 doubles it. */
const exposure = shaderDefinition("effect", {
  name: "exposure",
  params: z.object({ stops: z.number().min(-5).max(5).default(0) }),
  shader: `${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  return vec4(clamp(cc_srgb(cc_linear(c.rgb) * exp2(params.stops)), 0.0, 1.0), c.a);
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
  float k = params.amount > 0.0 ? params.amount * (1.0 - spread) : params.amount;
  return vec4(clamp(mix(vec3(cc_luma(c.rgb)), c.rgb, 1.0 + k), 0.0, 1.0), c.a);
}`,
});

/**
 * White balance as a chromatic adaptation (von Kries scaling in the Bradford cone space): the picture is taken as lit
 * by a daylight white of another colour temperature and tint, and adapted to D65. The scene white's chromaticity is
 * the CIE daylight locus at T = 6500 K · 2^temperature (each -1..1), moved off it along y by the tint. A positive
 * temperature warms the picture, a positive tint makes it more magenta.
 */
const whiteBalance = shaderDefinition("effect", {
  name: "whiteBalance",
  params: z.object({
    temperature: z.number().min(-1).max(1).default(0),
    tint: z.number().min(-1).max(1).default(0),
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
  float t = 6500.0 * exp2(params.temperature);
  float x = t <= 7000.0
    ? -4.6070e9 / (t * t * t) + 2.9678e6 / (t * t) + 0.09911e3 / t + 0.244063
    : -2.0064e9 / (t * t * t) + 1.9018e6 / (t * t) + 0.24748e3 / t + 0.237040;
  float y = -3.0 * x * x + 2.87 * x - 0.275 + params.tint * 0.05;
  vec3 gain = (cc_xyz(vec2(0.3127, 0.3290)) * BRADFORD) / (cc_xyz(vec2(x, y)) * BRADFORD);
  vec3 lms = (cc_linear(c.rgb) * RGB_XYZ) * BRADFORD;
  vec3 rgb = ((lms * gain) * BRADFORD_INV) * XYZ_RGB;
  return vec4(clamp(cc_srgb(rgb), 0.0, 1.0), c.a);
}`,
});

/**
 * Shadows and highlights, a local tone adjustment: the luminance around each pixel (a Gaussian blur, `radius` its standard
 * deviation in pixels, in two separable passes) says how much it is shadow or highlight, and the third pass brightens or darkens it there, by
 * up to 2 stops where the light is linear. A pixel decides by its surroundings, not by itself, so detail in a dark
 * area keeps its contrast while the area lifts.
 */
const SHADOWS_HIGHLIGHTS = aroundGauss({
  what: "luma",
  after: [
    `${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(original, uv);
  float around = texture(image, uv).r;
  float dark = 1.0 - smoothstep(0.0, 0.5, around);
  float bright = smoothstep(0.5, 1.0, around);
  float stops = 2.0 * (params.shadows * dark + params.highlights * bright);
  return vec4(clamp(cc_srgb(cc_linear(c.rgb) * exp2(stops)), 0.0, 1.0), c.a);
}`,
  ],
});

const shadowsHighlights = {
  ...shaderDefinition("effect", {
    name: "shadowsHighlights",
    params: z.object({
      shadows: z.number().min(-1).max(1).default(0),
      highlights: z.number().min(-1).max(1).default(0),
      radius: z.number().min(0.5).max(200).default(10),
    }),
    passes: SHADOWS_HIGHLIGHTS.passes,
  }),
  steps: SHADOWS_HIGHLIGHTS.steps,
};

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
  vec3 toned = mix(params.dark, params.light, cc_luma(c.rgb));
  return vec4(mix(c.rgb, toned, params.amount), c.a);
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

export { curves, duotone, exposure, levels, lut, shadowsHighlights, vibrance, whiteBalance };
