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
 * One pass of a separable Gaussian blur of the `radius` param's pixels (or another param's): 33 taps along x or y
 * spanning three standard deviations each way. `luma` blurs the luminance and `alpha` the alpha (each into the
 * result's red), `rgba` the picture, weighted by alpha so transparent pixels add no colour.
 */
const GAUSS_PASS = (
  axis: "x" | "y",
  what: "luma" | "alpha" | "rgba",
  radius = "radius",
) => `${COLOUR}vec4 effect(vec2 uv) {
  float span = max(${radius}, 1.0);
  float sigma = span / 3.0;
  vec2 dir = vec2(${axis === "x" ? "1.0, 0.0" : "0.0, 1.0"}) * span / 16.0 / resolution;
  vec4 sum = vec4(0.0);
  float weights = 0.0;
  for (int i = -16; i <= 16; i++) {
    float d = float(i) * span / 16.0;
    float w = exp(-d * d / (2.0 * sigma * sigma));
    vec4 s = texture(image, uv + float(i) * dir);
    sum += w * ${
      what === "rgba"
        ? "vec4(s.rgb * s.a, s.a)"
        : axis === "y"
          ? "vec4(s.r)"
          : what === "luma"
            ? "vec4(cc_luma(s.rgb))"
            : "vec4(s.a)"
    };
    weights += w;
  }
  sum /= weights;
  return ${what === "rgba" ? "sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a) : vec4(0.0)" : "vec4(vec3(sum.r), 1.0)"};
}`;

/** `top` over `under`, both plain (not premultiplied) colour: the source-over operator of Porter and Duff (1984). */
const OVER = `vec4 cc_over(vec4 top, vec4 under) {
  float a = top.a + under.a * (1.0 - top.a);
  if (a <= 0.0) return vec4(0.0);
  return vec4((top.rgb * top.a + under.rgb * under.a * (1.0 - top.a)) / a, a);
}
`;

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

/**
 * Glow: the element's bright parts (luminance above `threshold`, all of it at 0), coloured toward `color` by `tint`
 * (at 0 they keep their own colours, a bloom), blurred in two Gaussian passes and added to the picture by `intensity`.
 * The glow reaches past the element's edge, so it shows on titles and shapes as well as on footage.
 */
const glow = shaderDefinition("effect", {
  name: "glow",
  params: z.object({
    radius: z.number().min(0).max(200).default(20),
    intensity: z.number().min(0).max(4).default(1),
    threshold: z.number().min(0).max(1).default(0),
    color: HEX.default("#ffffff"),
    tint: z.number().min(0).max(1).default(1),
  }),
  passes: [
    `${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float bright = threshold <= 0.0 ? 1.0 : smoothstep(threshold, min(threshold + 0.1, 1.0), cc_luma(c.rgb));
  return vec4(mix(c.rgb, color, tint), c.a * bright);
}`,
    GAUSS_PASS("x", "rgba"),
    GAUSS_PASS("y", "rgba"),
    `vec4 effect(vec2 uv) {
  vec4 o = texture(original, uv);
  vec4 g = texture(image, uv);
  vec3 light = o.rgb * o.a + g.rgb * g.a * intensity;
  float a = clamp(max(o.a, g.a * intensity), 0.0, 1.0);
  return a > 0.0 ? vec4(min(light / a, 1.0), a) : vec4(0.0);
}`,
  ],
});

/**
 * Outline: a band of `width` pixels around the element's silhouette, by morphological dilation of its alpha (the
 * largest alpha within the width, sampled on 12 rings of 24 directions, so corners round), drawn under the element in
 * `color`. `outlineOnly` draws the dilated silhouette alone, filled.
 */
const outline = shaderDefinition("effect", {
  name: "outline",
  params: z.object({
    width: z.number().min(0).max(64).default(8),
    color: HEX.default("#ffffff"),
    opacity: z.number().min(0).max(1).default(1),
    outlineOnly: z.boolean().default(false),
  }),
  shader: `${OVER}vec4 effect(vec2 uv) {
  vec4 o = texture(image, uv);
  float grown = o.a;
  for (int ring = 1; ring <= 12; ring++) {
    float r = width * float(ring) / 12.0;
    for (int k = 0; k < 24; k++) {
      float a = 6.2831853 * float(k) / 24.0;
      grown = max(grown, texture(image, uv + vec2(cos(a), sin(a)) * r / resolution).a);
    }
  }
  vec4 band = vec4(color, grown * opacity);
  return outlineOnly ? band : cc_over(o, band);
}`,
});

/**
 * Long shadow: the element's silhouette swept back along `angle` (clockwise from the right, so 45 falls down and
 * right) for `reach` pixels, keeping the largest alpha met so overlapping parts never stack, in `color` under the
 * element. `fade` thins it toward its far end.
 */
const longShadow = shaderDefinition("effect", {
  name: "longShadow",
  params: z.object({
    reach: z.number().min(0).max(2000).default(240),
    angle: z.number().default(45),
    color: HEX.default("#777777"),
    opacity: z.number().min(0).max(1).default(1),
    fade: z.boolean().default(false),
  }),
  shader: `${OVER}vec4 effect(vec2 uv) {
  vec4 o = texture(image, uv);
  float a = radians(angle);
  vec2 dir = vec2(cos(a), sin(a)) / resolution;
  int n = int(clamp(reach, 1.0, 128.0));
  float swept = 0.0;
  for (int i = 1; i <= 128; i++) {
    if (i > n) break;
    float t = float(i) / float(n);
    float s = texture(image, uv - dir * reach * t).a;
    swept = max(swept, fade ? s * (1.0 - t) : s);
  }
  return cc_over(o, vec4(color, swept * opacity));
}`,
});

/**
 * Bevel: the element lit as if raised. Its alpha, blurred over `size` pixels in two Gaussian passes, is a height
 * map; the gradient by central differences gives each pixel's surface normal, and a light from `angle` (clockwise
 * from above) shades it by Lambert's cosine law against a flat surface: edges facing the light take `highlight`, the
 * far ones `shade`, by `intensity`. Only the element's own pixels change.
 */
const bevel = shaderDefinition("effect", {
  name: "bevel",
  params: z.object({
    size: z.number().min(0).max(200).default(4),
    angle: z.number().default(-60),
    intensity: z.number().min(0).max(1).default(0.4),
    highlight: HEX.default("#ffffff"),
    shade: HEX.default("#000000"),
  }),
  passes: [
    GAUSS_PASS("x", "alpha", "size"),
    GAUSS_PASS("y", "alpha", "size"),
    `vec4 effect(vec2 uv) {
  vec4 o = texture(original, uv);
  vec2 px = 1.0 / resolution;
  float dx = texture(image, uv + vec2(px.x, 0.0)).r - texture(image, uv - vec2(px.x, 0.0)).r;
  float dy = texture(image, uv + vec2(0.0, px.y)).r - texture(image, uv - vec2(0.0, px.y)).r;
  float slope = max(size, 1.0) / 2.0;
  vec3 n = normalize(vec3(-dx * slope, -dy * slope, 1.0));
  float a = radians(angle);
  vec3 l = normalize(vec3(sin(a), -cos(a), 1.0));
  float k = clamp((dot(n, l) - l.z) * 2.0, -1.0, 1.0) * intensity;
  vec3 rgb = k > 0.0 ? mix(o.rgb, highlight, k) : mix(o.rgb, shade, -k);
  return vec4(rgb, o.a);
}`,
  ],
});

/**
 * Hashing and noise the transitions share. `cc_pcg` is the PCG integer hash (Jarzynski and Olano, "Hash Functions for
 * GPU Rendering", JCGT 2020), on uints, so a seed gives the same pattern on every GPU. `cc_value` is value noise:
 * hashed values at the lattice points, smoothstep-interpolated between them; `cc_fbm` sums five octaves of it, each
 * twice the frequency and half the amplitude of the one before (fractal Brownian motion).
 */
const NOISE = `uint cc_pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float cc_hash(uvec3 v) { return float(cc_pcg(v.x ^ cc_pcg(v.y ^ cc_pcg(v.z)))) / 4294967295.0; }
float cc_value(vec2 p, uint seed) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  uvec2 c = uvec2(ivec2(i) + 65536);
  float a = cc_hash(uvec3(c, seed)), b = cc_hash(uvec3(c + uvec2(1u, 0u), seed));
  float d = cc_hash(uvec3(c + uvec2(0u, 1u), seed)), e = cc_hash(uvec3(c + uvec2(1u, 1u), seed));
  return mix(mix(a, b, u.x), mix(d, e, u.x), u.y);
}
float cc_fbm(vec2 p, uint seed) {
  float sum = 0.0, amp = 0.5;
  for (int o = 0; o < 5; o++) {
    sum += amp * cc_value(p, seed + uint(o));
    p *= 2.0;
    amp *= 0.5;
  }
  return sum / 0.96875;
}
`;

/** Half the frame's diagonal from `center` to its farthest corner, in pixels. */
const FARTHEST = `float cc_farthest(vec2 c) {
  vec2 r = resolution;
  return max(max(length(c * r), length((vec2(1.0, 0.0) - c) * r)), max(length((vec2(0.0, 1.0) - c) * r), length((vec2(1.0) - c) * r)));
}
`;

/**
 * Iris: the next clip opens from `center` in a circle (`sides` 0), a regular polygon, or a star (`star` sets the inner
 * vertices' radius as a share of the outer). Each pixel's boundary radius comes from the straight edge between the
 * outer vertex and the next inner one at its angle (the line through two points in polar form); the shape grows until
 * its narrowest point covers the farthest corner. `feather` softens the edge, in pixels.
 */
const iris = shaderDefinition("transition", {
  name: "iris",
  params: z.object({
    sides: z.number().int().min(0).max(64).default(0),
    star: z.number().min(0).max(0.95).default(0),
    rotation: z.number().default(0),
    center: UV.default([0.5, 0.5]),
    feather: z.number().min(0).max(200).default(2),
  }),
  shader: `${FARTHEST}vec4 transition(vec2 uv) {
  vec2 p = (uv - center) * resolution;
  float n = sides >= 3.0 ? sides : 0.0;
  float half_sector = n > 0.0 ? 3.14159265 / n : 0.0;
  float inner = n > 0.0 ? (star > 0.0 ? star : cos(half_sector)) : 1.0;
  float full = cc_farthest(center) / inner + feather;
  float big = progress * full;
  float edge = big;
  if (n > 0.0) {
    float theta = atan(p.x, -p.y) - radians(rotation);
    float local = abs(mod(theta + half_sector, 2.0 * half_sector) - half_sector);
    vec2 a = vec2(big, 0.0);
    vec2 b = inner * big * vec2(cos(half_sector), sin(half_sector));
    float den = (b.y - a.y) * cos(local) - (b.x - a.x) * sin(local);
    edge = abs(den) > 1e-6 ? (a.x * b.y - b.x * a.y) / den : big;
  }
  float m = clamp(0.5 - (length(p) - edge) / max(feather, 0.5), 0.0, 1.0);
  return mix(texture(from, uv), texture(to, uv), m);
}`,
});

/**
 * Clock wipe: the next clip sweeps in around `center`, from `startAngle` (degrees clockwise from up), clockwise
 * (`direction` 1), counterclockwise (-1) or both ways at once (0). `feather` softens the moving edge, in degrees.
 */
const clockWipe = shaderDefinition("transition", {
  name: "clockWipe",
  params: z.object({
    startAngle: z.number().default(0),
    direction: z.union([z.literal(1), z.literal(-1), z.literal(0)]).default(1),
    center: UV.default([0.5, 0.5]),
    feather: z.number().min(0).max(360).default(1),
  }),
  shader: `vec4 transition(vec2 uv) {
  float tau = 6.28318531;
  vec2 p = (uv - center) * resolution;
  float rel = mod(atan(p.x, -p.y) - radians(startAngle), tau);
  float along = direction > 0.5 ? rel : direction < -0.5 ? tau - rel : 2.0 * min(rel, tau - rel);
  float soft = max(radians(feather), 1e-4);
  float m = clamp((progress * (tau + soft) - along) / soft, 0.0, 1.0);
  return mix(texture(from, uv), texture(to, uv), m);
}`,
});

/**
 * Blinds: `slats` bands across the frame at `angle` (0 is vertical slats), each opening across its width as the
 * transition runs: a pixel's place within its slat (the fractional part of its position times the slat count) against
 * progress. `feather` softens each opening edge, as a share of the slat.
 */
const blinds = shaderDefinition("transition", {
  name: "blinds",
  params: z.object({
    slats: z.number().int().min(1).max(100).default(12),
    angle: z.number().default(0),
    feather: z.number().min(0).max(1).default(0.1),
  }),
  shader: `vec4 transition(vec2 uv) {
  float a = radians(angle);
  vec2 dir = vec2(cos(a), sin(a));
  float across = abs(dir.x) + abs(dir.y);
  float t = dot(uv - 0.5, dir) / across + 0.5;
  float f = fract(t * slats);
  float soft = max(feather, 1e-4);
  float m = clamp((progress * (1.0 + soft) - f) / soft, 0.0, 1.0);
  return mix(texture(from, uv), texture(to, uv), m);
}`,
});

/**
 * Film burn: each pixel's burn time mixes its distance from `center` with fractal value noise of `scale` pixels, so
 * the hole opens from the centre with ragged edges. Past its time a pixel shows the next clip; a band of `edge`
 * pixels before that glows in `color`, then chars and darkens into the picture it is burning.
 */
const filmBurn = shaderDefinition("transition", {
  name: "filmBurn",
  params: z.object({
    seed: z.number().int().min(0).max(4294967295).default(0),
    center: UV.default([0.5, 0.5]),
    scale: z.number().min(4).max(2000).default(120),
    edge: z.number().min(0).max(500).default(24),
    color: HEX.default("#ff7a1a"),
  }),
  shader: `${NOISE}${FARTHEST}vec4 transition(vec2 uv) {
  vec2 p = (uv - center) * resolution;
  float near = length(p) / cc_farthest(center);
  float rough = cc_fbm(uv * resolution / scale, uint(seed));
  float burn = clamp(0.55 * near + 0.45 * rough, 0.0, 1.0);
  float band = edge / length(resolution);
  float front = progress * (1.0 + band) - band;
  vec4 a = texture(from, uv), b = texture(to, uv);
  if (burn < front) return b;
  float k = (burn - front) / max(band, 1e-4);
  if (k >= 1.0) return a;
  vec3 hot = mix(min(color * 1.25, 1.0), a.rgb * 0.25, smoothstep(0.15, 0.6, k));
  return vec4(mix(hot, a.rgb, smoothstep(0.6, 1.0, k)), a.a);
}`,
});

/** Pixel dissolve: the frame cut into `columns` by `rows` blocks, each switching at its own hashed time from `seed`. */
const pixelDissolve = shaderDefinition("transition", {
  name: "pixelDissolve",
  params: z.object({
    columns: z.number().int().min(1).max(200).default(16),
    rows: z.number().int().min(1).max(200).default(9),
    seed: z.number().int().min(0).max(4294967295).default(0),
    feather: z.number().min(0).max(1).default(0.15),
  }),
  shader: `${NOISE}vec4 transition(vec2 uv) {
  uvec2 block = uvec2(min(floor(uv * vec2(columns, rows)), vec2(columns, rows) - 1.0));
  float at = cc_hash(uvec3(block, uint(seed))) * (1.0 - feather);
  float m = feather > 0.0 ? smoothstep(at, at + feather, progress) : step(at, progress);
  return mix(texture(from, uv), texture(to, uv), m);
}`,
});

/**
 * Zoom: the outgoing clip scales up toward `center` while the next one scales down from `scale` to rest, crossfading
 * through the middle; `blur` smears each along the zoom (zoom blur samples), most at the middle.
 */
const zoom = shaderDefinition("transition", {
  name: "zoom",
  params: z.object({
    center: UV.default([0.5, 0.5]),
    scale: z.number().min(1).max(4).default(1.6),
    blur: z.number().min(0).max(1).default(0.5),
  }),
  shader: `vec4 cc_zoomed(sampler2D picture, vec2 uv, float s, float smear) {
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 12; i++) {
    float k = s * (1.0 + smear * float(i) / 11.0);
    vec4 c = texture(picture, center + (uv - center) / k);
    sum += vec4(c.rgb * c.a, c.a);
  }
  sum /= 12.0;
  return sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a) : vec4(0.0);
}
vec4 transition(vec2 uv) {
  float smear = blur * 0.25 * sin(3.14159265 * progress);
  vec4 a = cc_zoomed(from, uv, mix(1.0, scale, progress), smear);
  vec4 b = cc_zoomed(to, uv, mix(scale, 1.0, progress), smear);
  float w = smoothstep(0.3, 0.7, progress);
  vec4 pa = vec4(a.rgb * a.a, a.a) * (1.0 - w) + vec4(b.rgb * b.a, b.a) * w;
  return pa.a > 0.0 ? vec4(pa.rgb / pa.a, pa.a) : vec4(0.0);
}`,
});

/** The built-in transition types the kit draws with a shader. */
export const BUILT_IN_TRANSITIONS: readonly ShaderDefinition[] = [
  iris,
  clockWipe,
  blinds,
  filmBurn,
  pixelDissolve,
  zoom,
];

/** The built-in shader transition of a type, if it has one. */
export function builtInTransition(type: unknown): ShaderDefinition | undefined {
  return BUILT_IN_TRANSITIONS.find((s) => s.name === type);
}

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
  glow,
  outline,
  longShadow,
  bevel,
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
  "outline",
  "longShadow",
  "bevel",
] as const;

/** The built-in shader of an effect type, if it has one. */
export function builtInShader(type: unknown): ShaderDefinition | undefined {
  return BUILT_IN_SHADERS.find((s) => s.name === type);
}
