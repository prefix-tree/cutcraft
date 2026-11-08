// Stylizers and generators: halftone, pixelate and scanlines turn the picture into a print, a mosaic or a screen;
// lightLeak and fractalNoise add light and texture over it. Each is written from the technique its comment names.
import { z } from "zod";

import { shaderDefinition } from "../jsx/shader-definition";
import { BLEND, BLEND_MODES, COLOUR, glsl, HEX, NOISE, NOISE3 } from "./glsl";

const BOX = z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]);

/**
 * A halftone screen (amplitude modulation, as in Ulichney, "Digital Halftoning", 1987): the frame is cut into a grid of
 * `size`-pixel cells turned by `angle`, and each cell prints one round dot whose area is the share of ink its centre's
 * tone needs. A dot that grows past its cell overlaps its neighbours, so each pixel looks at the nine nearest cells.
 * `mono` prints `ink` on `paper` by luminance. `cmyk` separates the picture into cyan, magenta, yellow and black (black
 * taken out of the three by grey component replacement) and prints each on its own screen, at the classic angles: black
 * at `angle`, cyan 30° before it, magenta 30° after, yellow 45° before. `amount` mixes the print over the picture.
 */
const halftone = shaderDefinition("effect", {
  name: "halftone",
  params: z.object({
    size: z.number().min(2).max(200).default(8),
    angle: z.number().default(45),
    mode: z.enum(["mono", "cmyk"]).default("mono"),
    ink: HEX.default("#111111"),
    paper: HEX.default("#ffffff"),
    amount: z.number().min(0).max(1).default(1),
  }),
  shader: glsl`${COLOUR}vec2 ht_turn(vec2 p, float a) { float s = sin(a), c = cos(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// The ink share each channel of a colour needs: x for mono (by luminance), or c, m, y, k.
vec4 ht_inks(vec3 rgb) {
  if (params.mode == params.mode.mono) return vec4(1.0 - cc_luma(rgb));
  float k = 1.0 - max(rgb.r, max(rgb.g, rgb.b));
  vec3 cmy = k < 1.0 ? (1.0 - rgb - k) / (1.0 - k) : vec3(0.0);
  return vec4(cmy, k);
}
// How much of this pixel the dots of one screen cover: channel \`ch\` of the inks, on a screen turned by \`a\` radians.
float ht_cover(vec2 p, float a, int ch) {
  vec2 q = ht_turn(p, -a) / params.size;
  vec2 cell = floor(q);
  float cover = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 centre = cell + vec2(float(i), float(j)) + 0.5;
      vec2 at = ht_turn(centre * params.size, a) / resolution;
      vec4 s = texture(image, clamp(at, vec2(0.0), vec2(1.0)));
      float tone = ht_inks(s.rgb)[ch];
      float r = params.size * sqrt(max(tone, 0.0) / 3.14159265);
      float d = length(q - centre) * params.size;
      float w = max(min(0.5, r), 1e-4);
      cover = max(cover, clamp((r - d) / (2.0 * w) + 0.5, 0.0, 1.0) * step(0.01, r));
    }
  }
  return cover;
}
vec4 effect(vec2 uv) {
  vec4 c = texture(original, uv);
  vec2 p = uv * resolution;
  float a = radians(params.angle);
  vec3 printed;
  if (params.mode == params.mode.mono) {
    printed = mix(params.paper, params.ink, ht_cover(p, a, 0));
  } else {
    printed = params.paper;
    printed *= 1.0 - ht_cover(p, a - radians(30.0), 0) * vec3(1.0, 0.0, 0.0);
    printed *= 1.0 - ht_cover(p, a + radians(30.0), 1) * vec3(0.0, 1.0, 0.0);
    printed *= 1.0 - ht_cover(p, a - radians(45.0), 2) * vec3(0.0, 0.0, 1.0);
    printed *= 1.0 - ht_cover(p, a, 3);
  }
  return vec4(mix(c.rgb, printed, params.amount), c.a);
}`,
});

/**
 * Pixelate (a mosaic): every pixel of a `size`-pixel cell shows the picture at the cell's centre. Inside `box` only (in
 * fractions of the frame, `[x, y, width, height]`; the whole frame by default), faded in over `feather` pixels inside
 * its edge, so a face or a plate can be hidden as a coarse mosaic. At `size` 1 each pixel reads its own centre.
 */
const pixelate = shaderDefinition("effect", {
  name: "pixelate",
  params: z.object({
    size: z.number().min(1).max(200).default(12),
    box: BOX.default([0, 0, 1, 1]),
    feather: z.number().min(0).max(500).default(0),
  }),
  shader: `vec4 effect(vec2 uv) {
  vec2 p = uv * resolution;
  vec2 cell = (floor(p / params.size) + 0.5) * params.size;
  vec4 mosaic = texture(image, clamp(cell, vec2(0.5), resolution - 0.5) / resolution);
  vec2 half_size = params.box.zw * resolution / 2.0;
  vec2 q = abs(p - (params.box.xy * resolution + half_size)) - half_size;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float m = params.feather > 0.0 ? clamp(-d / params.feather, 0.0, 1.0) : (d <= 0.0 ? 1.0 : 0.0);
  return mix(texture(original, uv), mosaic, m);
}`,
});

/**
 * Scanlines, the raster lines of a CRT: a dark band every `spacing` pixels, `thickness` of the period wide, darkening
 * the picture by `intensity` in linear light. `angle` turns the lines (0 is horizontal), and `speed` rolls them by that
 * many pixels a second. The band's edges are antialiased over a pixel.
 */
const scanlines = shaderDefinition("effect", {
  name: "scanlines",
  params: z.object({
    spacing: z.number().min(2).max(200).default(4),
    thickness: z.number().min(0).max(1).default(0.5),
    intensity: z.number().min(0).max(1).default(0.35),
    speed: z.number().min(-2000).max(2000).default(0),
    angle: z.number().default(0),
  }),
  shader: glsl`${COLOUR}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  if (params.intensity <= 0.0) return c;
  float a = radians(params.angle);
  vec2 p = uv * resolution;
  float pos = dot(p, vec2(sin(a), cos(a))) + time * params.speed;
  float x = pos - params.spacing * floor(pos / params.spacing + 0.5);
  float w = params.thickness * params.spacing;
  float dark = min(clamp(w / 2.0 - abs(x) + 0.5, 0.0, 1.0), w);
  return vec4(cc_srgb(cc_linear(c.rgb) * (1.0 - params.intensity * dark)), c.a);
}`,
});

/**
 * A light leak: three soft blooms of `color`, whiter at their cores, wandering over the frame as low-frequency value
 * noise of time moves their centres and breathes their strength, `evolution` changes a second. Each spreads over
 * `spread` of the frame's diagonal. They are added with the screen blend (W3C "Compositing and Blending"), so they only
 * ever lighten, by up to `intensity`.
 */
const lightLeak = shaderDefinition("effect", {
  name: "lightLeak",
  params: z.object({
    color: HEX.default("#ff8a3d"),
    intensity: z.number().min(0).max(1).default(0.6),
    spread: z.number().min(0.05).max(2).default(0.6),
    evolution: z.number().min(0).max(10).default(0.15),
    seed: z.number().int().min(0).default(0),
  }),
  shader: glsl`${NOISE}${BLEND}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float t = time * params.evolution;
  uint seed = uint(params.seed) * 3u;
  float diag = length(resolution);
  vec3 light = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float k = float(i);
    vec2 at = vec2(cc_value(vec2(t + k * 7.31, k * 3.17), seed), cc_value(vec2(k * 5.71, t + k * 1.93), seed + 1u));
    at = mix(vec2(-0.2), vec2(1.2), at);
    float d = length((uv - at) * resolution) / (params.spread * diag);
    float fall = exp(-3.0 * d * d);
    float breath = 0.55 + 0.45 * cc_value(vec2(t * 1.7 + k * 9.13, k), seed + 2u);
    light += mix(params.color, vec3(1.0), fall * fall * 0.6) * fall * breath;
  }
  vec3 leak = clamp(light * params.intensity, 0.0, 1.0);
  return vec4(cc_blend(c.rgb, leak, 2), c.a);
}`,
});

/**
 * Fractal noise: fractal Brownian motion over three-dimensional value noise (Ebert, Musgrave et al., "Texturing and
 * Modeling"), its features about `size` pixels across, `octaves` layers of finer detail, and time as the third axis so
 * the pattern evolves in place, `evolution` changes a second. `contrast` scales it about mid-grey, `color` tints it, and
 * it is blended onto the picture by `blend` (the W3C separable modes) at `opacity`. Over a shape it is a moving
 * background; over footage, a texture.
 */
const fractalNoise = shaderDefinition("effect", {
  name: "fractalNoise",
  params: z.object({
    size: z.number().min(2).max(2000).default(160),
    octaves: z.number().int().min(1).max(8).default(5),
    evolution: z.number().min(0).max(10).default(0.2),
    contrast: z.number().min(0).max(10).default(1),
    color: HEX.default("#ffffff"),
    blend: z.enum(BLEND_MODES).default("overlay"),
    opacity: z.number().min(0).max(1).default(0.5),
    seed: z.number().int().min(0).default(0),
  }),
  shader: glsl`${NOISE3}${BLEND}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float n = cc_fbm3(vec3(uv * resolution / params.size, time * params.evolution), uint(params.seed), int(params.octaves));
  n = clamp((n - 0.5) * params.contrast + 0.5, 0.0, 1.0);
  vec3 blended = cc_blend(c.rgb, params.color * n, params.blend);
  return vec4(mix(c.rgb, clamp(blended, 0.0, 1.0), params.opacity), c.a);
}`,
});

export { fractalNoise, halftone, lightLeak, pixelate, scanlines };
