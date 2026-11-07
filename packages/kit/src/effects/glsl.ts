// GLSL and schemas the built-in effects share: colour transfer and luminance, compositing, hashing and noise, and the
// colour and point param schemas. Shared GLSL is a module: a source written with the `glsl` tag places each module it
// names, and the modules those depend on, once each and in order, before its own code.
import { z } from "zod";

/** A piece of GLSL other sources use, with the modules it needs. */
export interface GlslModule {
  readonly name: string;
  readonly code: string;
  readonly dependencies: readonly GlslModule[];
}

export const glslModule = (name: string, code: string, ...dependencies: GlslModule[]): GlslModule => ({
  name,
  code,
  dependencies,
});

const isModule = (part: unknown): part is GlslModule =>
  typeof part === "object" && part !== null && "code" in part && "dependencies" in part;

/**
 * A GLSL source: the modules interpolated into it, alone or in a list, (and theirs) placed once each, in order, at the
 * top; anything else interpolated is written where it stands.
 */
export function glsl(strings: TemplateStringsArray, ...parts: readonly unknown[]): string {
  const placed = new Set<GlslModule>();
  const head: string[] = [];
  const place = (m: GlslModule): void => {
    if (placed.has(m)) return;
    for (const d of m.dependencies) place(d);
    placed.add(m);
    head.push(m.code);
  };
  let body = strings[0] ?? "";
  parts.forEach((part, i) => {
    if (isModule(part)) place(part);
    else if (Array.isArray(part) && part.every(isModule)) for (const m of part) place(m);
    else body += String(part);
    body += strings[i + 1] ?? "";
  });
  return head.join("") + body;
}

/**
 * GLSL the colour effects share: the sRGB transfer function both ways (IEC 61966-2-1), so light is added and scaled
 * where it is linear, and Rec. 709 luminance (ITU-R BT.709, the weights sRGB's primaries give).
 */
export const COLOUR = glslModule(
  "colour",
  `vec3 cc_linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 cc_srgb(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float cc_luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`,
);

export const HEX = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'a colour is "#rgb" or "#rrggbb"');

/** `top` over `under`, both plain (not premultiplied) colour: the source-over operator of Porter and Duff (1984). */
export const OVER = glslModule(
  "over",
  `vec4 cc_over(vec4 top, vec4 under) {
  float a = top.a + under.a * (1.0 - top.a);
  if (a <= 0.0) return vec4(0.0);
  return vec4((top.rgb * top.a + under.rgb * under.a * (1.0 - top.a)) / a, a);
}
`,
);

export const UV = z.tuple([z.number(), z.number()]);

/**
 * Hashing and noise the transitions share. `cc_pcg` is the PCG integer hash (Jarzynski and Olano, "Hash Functions for
 * GPU Rendering", JCGT 2020), on uints, so a seed gives the same pattern on every GPU. `cc_value` is value noise:
 * hashed values at the lattice points, smoothstep-interpolated between them; `cc_fbm` sums five octaves of it, each
 * twice the frequency and half the amplitude of the one before (fractal Brownian motion).
 */
export const NOISE = glslModule(
  "noise",
  `uint cc_pcg(uint v) {
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
`,
);

/** Half the frame's diagonal from `center` to its farthest corner, in pixels. */
export const FARTHEST = glslModule(
  "farthest",
  `float cc_farthest(vec2 c) {
  vec2 r = resolution;
  return max(max(length(c * r), length((vec2(1.0, 0.0) - c) * r)), max(length((vec2(0.0, 1.0) - c) * r), length((vec2(1.0) - c) * r)));
}
`,
);
