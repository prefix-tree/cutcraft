// Footage tools: colour key, region blur, corner pin, zoom blur and chromatic aberration.
import { z } from "zod";

import { shaderDefinition } from "../jsx/shader-definition";
import { GAUSS_PASS, HEX, UV } from "./glsl";

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
  float d = 2.0 * distance(ck_chroma(c.rgb), ck_chroma(params.color));
  float keep = smoothstep(params.tolerance, params.tolerance + params.softness + 1e-4, d);
  vec3 rgb = c.rgb;
  if (params.color.g >= params.color.r && params.color.g >= params.color.b) rgb.g = mix(rgb.g, min(rgb.g, (rgb.r + rgb.b) / 2.0), params.spill);
  else if (params.color.b >= params.color.r) rgb.b = mix(rgb.b, min(rgb.b, (rgb.r + rgb.g) / 2.0), params.spill);
  else rgb.r = mix(rgb.r, min(rgb.r, (rgb.g + rgb.b) / 2.0), params.spill);
  return vec4(rgb, c.a * keep);
}`,
});

/**
 * A blur inside a box (faces, plates, screens), or outside it with `inverted`: the picture blurred in two Gaussian
 * passes (`radius` the standard deviation, in pixels), then mixed with the original by a mask from the signed distance to a rounded box (`roundness` 1 rounds the
 * short side fully). `feather` fades the blur in over that many pixels inside the box's edge.
 */
const regionBlur = shaderDefinition("effect", {
  name: "regionBlur",
  params: z.object({
    box: z
      .tuple([z.number(), z.number(), z.number().positive(), z.number().positive()])
      .default([0.25, 0.25, 0.5, 0.5]),
    radius: z.number().min(0).max(200).default(7),
    feather: z.number().min(0).max(500).default(10),
    roundness: z.number().min(0).max(1).default(0),
    inverted: z.boolean().default(false),
  }),
  passes: [
    GAUSS_PASS("x", "rgba"),
    GAUSS_PASS("y", "rgba"),
    `vec4 effect(vec2 uv) {
  vec2 p = uv * resolution;
  vec2 half_size = params.box.zw * resolution / 2.0;
  vec2 centre = params.box.xy * resolution + half_size;
  float r = params.roundness * min(half_size.x, half_size.y);
  vec2 q = abs(p - centre) - (half_size - r);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float m = params.feather > 0.0 ? clamp(-d / params.feather, 0.0, 1.0) : (d <= 0.0 ? 1.0 : 0.0);
  if (params.inverted) m = 1.0 - m;
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
  vec2 p0 = params.topLeft, p1 = params.topRight, p2 = params.bottomRight, p3 = params.bottomLeft;
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

/** Zoom blur: each pixel averaged along the line toward `center`, the smear growing with distance to `length` pixels at a corner. */
const zoomBlur = shaderDefinition("effect", {
  name: "zoomBlur",
  params: z.object({
    length: z.number().min(0).max(500).default(40),
    center: UV.default([0.5, 0.5]),
    samples: z.number().int().min(1).max(64).default(24),
  }),
  shader: `vec4 effect(vec2 uv) {
  float reach = params.length / length(resolution / 2.0);
  int n = int(params.samples);
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 64; i++) {
    if (i >= n) break;
    float t = n > 1 ? float(i) / float(n - 1) : 0.0;
    vec4 s = texture(image, uv + (params.center - uv) * reach * t);
    sum += vec4(s.rgb * s.a, s.a);
  }
  sum /= float(n);
  return sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a) : vec4(0.0);
}`,
});

/**
 * Chromatic aberration: red and blue read from either side of each pixel, green in place. Along `angle` (degrees
 * clockwise from up, so 90 splits them sideways) it is a uniform split of `distance` pixels; with `radial` the split
 * points out from `center` and grows with distance to `distance` pixels at a corner, as a lens fringes toward its edges.
 */
const chromaticAberration = shaderDefinition("effect", {
  name: "chromaticAberration",
  params: z.object({
    distance: z.number().min(0).max(100).default(4),
    angle: z.number().default(90),
    radial: z.boolean().default(false),
    center: UV.default([0.5, 0.5]),
  }),
  shader: `vec4 effect(vec2 uv) {
  float a = radians(params.angle);
  vec2 shift = params.radial
    ? (uv - params.center) * params.distance / length(resolution / 2.0)
    : vec2(sin(a), -cos(a)) * params.distance / resolution;
  vec4 c = texture(image, uv);
  vec4 r = texture(image, uv - shift);
  vec4 b = texture(image, uv + shift);
  return vec4(r.r, c.g, b.b, max(c.a, max(r.a, b.a)));
}`,
});

export { chromaticAberration, colorKey, cornerPin, regionBlur, zoomBlur };
