// Transitions drawn by a shader: iris, clock wipe, blinds, film burn, pixel dissolve and zoom.
import { z } from "zod";

import { shaderDefinition } from "../jsx/shader-definition";
import { FARTHEST, HEX, NOISE, UV } from "./glsl";

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
  vec2 p = (uv - params.center) * resolution;
  float n = params.sides >= 3.0 ? params.sides : 0.0;
  float half_sector = n > 0.0 ? 3.14159265 / n : 0.0;
  float inner = n > 0.0 ? (params.star > 0.0 ? params.star : cos(half_sector)) : 1.0;
  float full = cc_farthest(params.center) / inner + params.feather;
  float big = progress * full;
  float edge = big;
  if (n > 0.0) {
    float theta = atan(p.x, -p.y) - radians(params.rotation);
    float local = abs(mod(theta + half_sector, 2.0 * half_sector) - half_sector);
    vec2 a = vec2(big, 0.0);
    vec2 b = inner * big * vec2(cos(half_sector), sin(half_sector));
    float den = (b.y - a.y) * cos(local) - (b.x - a.x) * sin(local);
    edge = abs(den) > 1e-6 ? (a.x * b.y - b.x * a.y) / den : big;
  }
  float m = clamp(0.5 - (length(p) - edge) / max(params.feather, 0.5), 0.0, 1.0);
  return mix(texture(from, uv), texture(to, uv), m);
}`,
});

/** clockWipe's directions, as the numbers its shader reads. */
const SWEEP = { clockwise: 1, counterclockwise: -1, both: 0 } as const;

/**
 * Clock wipe: the next clip sweeps in around `center`, from `startAngle` (degrees clockwise from up), `clockwise`,
 * `counterclockwise` or `both` ways at once. `softness` softens the moving edge, as a share of the turn.
 */
const clockWipe = {
  ...shaderDefinition("transition", {
    name: "clockWipe",
    params: z.object({
      startAngle: z.number().default(0),
      direction: z.enum(["clockwise", "counterclockwise", "both"]).default("clockwise"),
      center: UV.default([0.5, 0.5]),
      softness: z
        .number()
        .min(0)
        .max(1)
        .default(1 / 360),
    }),
    shader: `vec4 transition(vec2 uv) {
  float tau = 6.28318531;
  vec2 p = (uv - params.center) * resolution;
  float rel = mod(atan(p.x, -p.y) - radians(params.startAngle), tau);
  float along = params.direction > 0.5 ? rel : params.direction < -0.5 ? tau - rel : 2.0 * min(rel, tau - rel);
  float soft = max(params.softness * tau, 1e-4);
  float m = clamp((progress * (tau + soft) - along) / soft, 0.0, 1.0);
  return mix(texture(from, uv), texture(to, uv), m);
}`,
  }),
  uniforms: (params: Readonly<Record<string, unknown>>) => ({
    ...params,
    direction: SWEEP[params.direction as keyof typeof SWEEP] ?? 1,
  }),
};

/**
 * Blinds: `slats` bands across the frame, each opening across its width as the transition runs: a pixel's place within
 * its slat (the fractional part of its position times the slat count) against progress. The slats open along `angle`
 * (degrees clockwise from up, so 90 opens them sideways: vertical slats). `softness` softens each opening edge, as a
 * share of the slat.
 */
const blinds = shaderDefinition("transition", {
  name: "blinds",
  params: z.object({
    slats: z.number().int().min(1).max(100).default(12),
    angle: z.number().default(90),
    softness: z.number().min(0).max(1).default(0.1),
  }),
  shader: `vec4 transition(vec2 uv) {
  float a = radians(params.angle);
  vec2 dir = vec2(sin(a), -cos(a));
  float across = abs(dir.x) + abs(dir.y);
  float t = dot(uv - 0.5, dir) / across + 0.5;
  float f = fract(t * params.slats);
  float soft = max(params.softness, 1e-4);
  float m = clamp((progress * (1.0 + soft) - f) / soft, 0.0, 1.0);
  return mix(texture(from, uv), texture(to, uv), m);
}`,
});

/**
 * Film burn: each pixel's burn time mixes its distance from `center` with fractal value noise of `size` pixels, so
 * the hole opens from the centre with ragged edges. Past its time a pixel shows the next clip; a band of `edge`
 * pixels before that glows in `color`, then chars and darkens into the picture it is burning.
 */
const filmBurn = shaderDefinition("transition", {
  name: "filmBurn",
  params: z.object({
    seed: z.number().int().min(0).max(4294967295).default(0),
    center: UV.default([0.5, 0.5]),
    size: z.number().min(4).max(2000).default(120),
    edge: z.number().min(0).max(500).default(24),
    color: HEX.default("#ff7a1a"),
  }),
  shader: `${NOISE}${FARTHEST}vec4 transition(vec2 uv) {
  vec2 p = (uv - params.center) * resolution;
  float near = length(p) / cc_farthest(params.center);
  float rough = cc_fbm(uv * resolution / params.size, uint(params.seed));
  float burn = clamp(0.55 * near + 0.45 * rough, 0.0, 1.0);
  float band = params.edge / length(resolution);
  float front = progress * (1.0 + band) - band;
  vec4 a = texture(from, uv), b = texture(to, uv);
  if (burn < front) return b;
  float k = (burn - front) / max(band, 1e-4);
  if (k >= 1.0) return a;
  vec3 hot = mix(min(params.color * 1.25, 1.0), a.rgb * 0.25, smoothstep(0.15, 0.6, k));
  return vec4(mix(hot, a.rgb, smoothstep(0.6, 1.0, k)), a.a);
}`,
});

/**
 * Pixel dissolve: the frame cut into `columns` by `rows` blocks, each switching at its own hashed time from `seed`.
 * `softness` is how long each block takes to switch, as a share of the transition.
 */
const pixelDissolve = shaderDefinition("transition", {
  name: "pixelDissolve",
  params: z.object({
    columns: z.number().int().min(1).max(200).default(16),
    rows: z.number().int().min(1).max(200).default(9),
    seed: z.number().int().min(0).max(4294967295).default(0),
    softness: z.number().min(0).max(1).default(0.15),
  }),
  shader: `${NOISE}vec4 transition(vec2 uv) {
  uvec2 block = uvec2(min(floor(uv * vec2(params.columns, params.rows)), vec2(params.columns, params.rows) - 1.0));
  float at = cc_hash(uvec3(block, uint(params.seed))) * (1.0 - params.softness);
  float m = params.softness > 0.0 ? smoothstep(at, at + params.softness, progress) : step(at, progress);
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
    vec4 c = texture(picture, params.center + (uv - params.center) / k);
    sum += vec4(c.rgb * c.a, c.a);
  }
  sum /= 12.0;
  return sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a) : vec4(0.0);
}
vec4 transition(vec2 uv) {
  float smear = params.blur * 0.25 * sin(3.14159265 * progress);
  vec4 a = cc_zoomed(from, uv, mix(1.0, params.scale, progress), smear);
  vec4 b = cc_zoomed(to, uv, mix(params.scale, 1.0, progress), smear);
  float w = smoothstep(0.3, 0.7, progress);
  vec4 pa = vec4(a.rgb * a.a, a.a) * (1.0 - w) + vec4(b.rgb * b.a, b.a) * w;
  return pa.a > 0.0 ? vec4(pa.rgb / pa.a, pa.a) : vec4(0.0);
}`,
});

export { blinds, clockWipe, filmBurn, iris, pixelDissolve, zoom };
