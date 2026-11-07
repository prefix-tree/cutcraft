// Effects on a silhouette, for titles and shapes: glow, outline, long shadow and bevel.
import { z } from "zod";

import { shaderDefinition } from "../jsx/shader-definition";
import { aroundGauss } from "./gauss";
import { COLOUR, HEX, OVER } from "./glsl";

/**
 * Glow: the element's bright parts (luminance above `threshold`, all of it at 0), coloured toward `color` by `tint`
 * (at 0 they keep their own colours, a bloom), blurred in two Gaussian passes (`radius` the standard deviation, in pixels) and added to
 * the picture by `intensity`.
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
    `vec4 effect(vec2 uv) {
  vec4 o = texture(original, uv);
  vec4 g = texture(image, uv);
  vec3 light = o.rgb * o.a + g.rgb * g.a * params.intensity;
  float a = clamp(max(o.a, g.a * params.intensity), 0.0, 1.0);
  return a > 0.0 ? vec4(min(light / a, 1.0), a) : vec4(0.0);
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
    float r = params.width * float(ring) / 12.0;
    for (int k = 0; k < 24; k++) {
      float a = 6.2831853 * float(k) / 24.0;
      grown = max(grown, texture(image, uv + vec2(cos(a), sin(a)) * r / resolution).a);
    }
  }
  vec4 band = vec4(params.color, grown * params.opacity);
  return params.outlineOnly ? band : cc_over(o, band);
}`,
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
