// Effects on a silhouette, for titles and shapes: glow, outline, long shadow and bevel.
import { z } from "zod";

import { shaderDefinition } from "../jsx/shader-definition";
import { aroundGauss } from "./gauss";
import { COLOUR, HEX, OVER } from "./glsl";

/**
 * Glow: the element's bright parts (luminance above `threshold`, all of it at 0), coloured toward `color` by `tint`
 * (at 0 they keep their own colours), blurred in two Gaussian passes (`radius` the standard deviation, in pixels), and
 * drawn by `intensity` as a halo under the element, so the element keeps its own colours. With a `threshold` the glow
 * also adds its light over the bright parts: a bloom, for footage.
 * The glow reaches past the element's edge, so it shows on titles and shapes as well as on footage.
 */
const GLOW = aroundGauss({
  what: "rgba",
  before: [
    `${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float bright = params.threshold <= 0.0 ? 1.0 : smoothstep(params.threshold, min(params.threshold + 0.1, 1.0), cc_luma(c.rgb));
  return vec4(mix(c.rgb, params.color, params.tint), c.a * bright);
}`,
  ],
  after: [
    // A halo under the element; with a threshold, a bloom over its bright parts too. The bloom's share ramps up over
    // the first 0.05 of threshold, so a keyframed threshold does not jump at 0.
    `${OVER}vec4 effect(vec2 uv) {
  vec4 o = texture(original, uv);
  vec4 g = texture(image, uv);
  vec4 c = cc_over(o, vec4(g.rgb, min(g.a * params.intensity, 1.0)));
  float bloom = clamp(params.threshold / 0.05, 0.0, 1.0);
  return vec4(min(c.rgb + bloom * o.a * g.rgb * g.a * params.intensity, 1.0), c.a);
}`,
  ],
});
const glow = {
  ...shaderDefinition("effect", {
    name: "glow",
    params: z.object({
      radius: z.number().min(0).max(200).default(7),
      intensity: z.number().min(0).max(4).default(1),
      threshold: z.number().min(0).max(1).default(0),
      color: HEX.default("#ffffff"),
      tint: z.number().min(0).max(1).default(1),
    }),
    passes: GLOW.passes,
  }),
  steps: GLOW.steps,
};

/**
 * Outline: a band of `width` pixels around the element's silhouette (its pixels of alpha 0.5 or more), drawn under the
 * element in `color`; `outlineOnly` draws the grown silhouette alone, filled. The distance to the silhouette is the
 * exact Euclidean one, separable into a pass down each column and one along each row (Felzenszwalb and Huttenlocher,
 * "Distance Transforms of Sampled Functions", 2012), so the band's corners round as a circle's, and it costs a few
 * reads per pixel of width rather than a fixed ring of them. Its outer edge fades over one pixel.
 */
const outline = shaderDefinition("effect", {
  name: "outline",
  params: z.object({
    width: z.number().min(0).max(64).default(8),
    color: HEX.default("#ffffff"),
    opacity: z.number().min(0).max(1).default(1),
    outlineOnly: z.boolean().default(false),
  }),
  passes: [
    // Down each column: how many rows away the nearest silhouette pixel is, within the width, as red × 255 (255: none).
    `vec4 effect(vec2 uv) {
  ivec2 size = textureSize(image, 0);
  ivec2 p = ivec2(uv * vec2(size));
  if (texelFetch(image, p, 0).a >= 0.5) return vec4(0.0, 0.0, 0.0, 1.0);
  int w = min(int(ceil(params.width)), 64);
  for (int k = 1; k <= w; k++) {
    ivec2 up = p - ivec2(0, k), down = p + ivec2(0, k);
    if ((up.y >= 0 && texelFetch(image, up, 0).a >= 0.5) || (down.y < size.y && texelFetch(image, down, 0).a >= 0.5))
      return vec4(float(k) / 255.0, 0.0, 0.0, 1.0);
  }
  return vec4(1.0, 0.0, 0.0, 1.0);
}`,
    // Along each row: the nearest of those, by Pythagoras; the band where it is within the width.
    `${OVER}vec4 effect(vec2 uv) {
  vec4 o = texture(original, uv);
  ivec2 size = textureSize(image, 0);
  ivec2 p = ivec2(uv * vec2(size));
  int w = min(int(ceil(params.width)), 64);
  float best = 1e9;
  for (int k = -w; k <= w; k++) {
    int x = p.x + k;
    if (x < 0 || x >= size.x) continue;
    float dy = texelFetch(image, ivec2(x, p.y), 0).r * 255.0;
    if (dy > 254.5) continue;
    best = min(best, float(k * k) + dy * dy);
  }
  float grown = max(o.a, clamp(params.width - sqrt(best) + 0.5, 0.0, 1.0));
  vec4 band = vec4(params.color, grown * params.opacity);
  return params.outlineOnly ? band : cc_over(o, band);
}`,
  ],
});

/**
 * Long shadow: the element's silhouette swept back along `angle` (degrees clockwise from up, so 135 falls down and
 * right) for `length` pixels, keeping the largest alpha met so overlapping parts never stack, in `color` under the
 * element. `fade` thins it toward its far end.
 */
const longShadow = shaderDefinition("effect", {
  name: "longShadow",
  params: z.object({
    length: z.number().min(0).max(2000).default(240),
    angle: z.number().default(135),
    color: HEX.default("#777777"),
    opacity: z.number().min(0).max(1).default(1),
    fade: z.boolean().default(false),
  }),
  shader: `${OVER}vec4 effect(vec2 uv) {
  vec4 o = texture(image, uv);
  float a = radians(params.angle);
  vec2 dir = vec2(sin(a), -cos(a)) / resolution;
  int n = int(clamp(params.length, 1.0, 128.0));
  float swept = 0.0;
  for (int i = 1; i <= 128; i++) {
    if (i > n) break;
    float t = float(i) / float(n);
    float s = texture(image, uv - dir * params.length * t).a;
    swept = max(swept, params.fade ? s * (1.0 - t) : s);
  }
  return cc_over(o, vec4(params.color, swept * params.opacity));
}`,
});

/**
 * Bevel: the element lit as if raised. Its alpha, blurred in two Gaussian passes of standard deviation `size` pixels, is a height
 * map; the gradient by central differences gives each pixel's surface normal, and a light from `angle` (clockwise
 * from above) shades it by Lambert's cosine law against a flat surface: edges facing the light take `highlight`, the
 * far ones `shade`, by `amount`. Only the element's own pixels change.
 */
const BEVEL = aroundGauss({
  what: "alpha",
  param: "size",
  after: [
    `vec4 effect(vec2 uv) {
  vec4 o = texture(original, uv);
  vec2 px = 1.0 / resolution;
  float dx = texture(image, uv + vec2(px.x, 0.0)).r - texture(image, uv - vec2(px.x, 0.0)).r;
  float dy = texture(image, uv + vec2(0.0, px.y)).r - texture(image, uv - vec2(0.0, px.y)).r;
  float slope = max(params.size * 3.0, 1.0) / 2.0;
  vec3 n = normalize(vec3(-dx * slope, -dy * slope, 1.0));
  float a = radians(params.angle);
  vec3 l = normalize(vec3(sin(a), -cos(a), 1.0));
  float k = clamp((dot(n, l) - l.z) * 2.0, -1.0, 1.0) * params.amount;
  vec3 rgb = k > 0.0 ? mix(o.rgb, params.highlight, k) : mix(o.rgb, params.shade, -k);
  return vec4(rgb, o.a);
}`,
  ],
});

const bevel = {
  ...shaderDefinition("effect", {
    name: "bevel",
    params: z.object({
      size: z.number().min(0).max(200).default(1.5),
      angle: z.number().default(-60),
      amount: z.number().min(0).max(1).default(0.4),
      highlight: HEX.default("#ffffff"),
      shade: HEX.default("#000000"),
    }),
    passes: BEVEL.passes,
  }),
  steps: BEVEL.steps,
};

export { bevel, glow, longShadow, outline };
