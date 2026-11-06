// The CSS-type effects drawn as shader passes (RFC 0001: one pipeline in file order) against the same effects drawn
// by Chrome's own canvas filter. Each effect is drawn twice on the same picture: alone, which takes the CSS filter,
// and followed by an effect that changes nothing, which puts every effect on the element into the shader pipeline.
// They must match within the golden tolerance. Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "css-passes");
let dir = "";

/** The two pictures: an opaque hue and brightness chart, and two shapes on transparency. */
const CHART = `const chart = effect({
  name: "chart",
  params: z.object({ shape: z.boolean().default(false) }),
  shader: \`vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
vec4 effect(vec2 uv) {
  if (params.shape) {
    vec2 p = uv * resolution;
    vec2 q = abs(p - vec2(110.0, 90.0)) - vec2(50.0, 35.0) + 12.0;
    float box = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 12.0;
    float disc = length(p - vec2(225.0, 90.0)) - 40.0;
    float inside = 1.0 - smoothstep(-0.5, 0.5, min(box, disc));
    vec3 c = box < disc ? vec3(0.95, 0.35, 0.1) : vec3(0.15, 0.55, 0.95);
    return vec4(c, inside);
  }
  if (uv.y > 0.45 && uv.y < 0.55) return vec4(vec3(floor(uv.x * 8.0) / 7.0), 1.0);
  return vec4(hue(uv.x) * mix(1.0, 0.15, uv.y), 1.0);
}\`,
});`;

const PASS_THROUGH = `const same = effect({ name: "same", shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });`;

const manifest = {
  assets: {
    ...mediaManifest.assets,
    photo: { id: "photo", kind: "image" as const, duration: 0, width: 320, height: 180 },
    shape: { id: "shape", kind: "image" as const, duration: 0, width: 320, height: 180 },
  },
};

async function still(name: string, body: string, declarations: string, background = "#000000"): Promise<string> {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { z } from "zod";
import { Clip, ColorGrade, Composition, effect, Effect, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(manifest)};
${declarations}
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ mode: "color", color: "${background}" }}>
      <Track id="t">${body}</Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, `${name}.png`);
  await renderStill({
    state: loaded.state,
    media: directoryResolver(mediaDir, loaded.manifest, {
      photo: join(dir, "photo.png"),
      shape: join(dir, "shape.png"),
    }),
    out,
    time: 0.5,
    source: loaded.source,
  });
  return out;
}

beforeAll(async () => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "c-"));
  // The photo, drawn once by the chart effect; the shapes, drawn here with real transparency (a composition has no
  // transparent background to draw them on).
  const photo = await still(
    "photo-chart",
    `<Clip id="c" src="asset:solid" fit="cover"><Effect id="chart" type={chart} /></Clip>`,
    CHART,
  );
  copyFileSync(photo, join(dir, "photo.png"));
  writeShapes(join(dir, "shape.png"));
});
afterAll(() => {
  // CUTCRAFT_KEEP_STILLS=1 keeps the stills, to look at.
  if (process.env.CUTCRAFT_KEEP_STILLS !== "1") rmSync(dir, { recursive: true, force: true });
});

/** A rounded orange box and a blue disc on transparency, antialiased over one pixel, as a 320 × 180 PNG. */
function writeShapes(file: string): void {
  const [w, h] = [320, 180];
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const px = x + 0.5,
        py = y + 0.5;
      const qx = Math.abs(px - 110) - 50 + 12,
        qy = Math.abs(py - 90) - 35 + 12;
      const box = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 12;
      const disc = Math.hypot(px - 225, py - 90) - 40;
      const d = Math.min(box, disc);
      const a = Math.min(1, Math.max(0, 0.5 - d));
      const c = box < disc ? [242, 89, 26] : [38, 140, 242];
      const i = (y * w + x) * 4;
      rgba.set([...(a > 0 ? c : [0, 0, 0]), Math.round(a * 255)] as number[], i);
    }
  execFileSync(
    "ffmpeg",
    ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${w}x${h}`, "-i", "-", file],
    {
      input: rgba,
    },
  );
}

/** The share of channel values off by more than 2, and the largest difference. */
function difference(a: string, b: string): { off: number; max: number } {
  const x = readImage(a),
    y = readImage(b);
  let off = 0,
    max = 0;
  for (let i = 0; i < x.rgba.length; i++) {
    const d = Math.abs((x.rgba[i] as number) - (y.rgba[i] as number));
    if (d > 2) off++;
    if (d > max) max = d;
  }
  return { off: off / x.rgba.length, max };
}

/**
 * `tolerance` is the golden one (at most 0.2% of values off by more than 2, none by more than 32) unless a case says
 * otherwise. Blur is looser: Chrome approximates the Gaussian (Skia's box blurs) where the pass computes the spec's
 * true Gaussian, which RFC 0001 makes `blur` everywhere; they differ by a few levels along soft edges.
 */
const CASES: readonly {
  name: string;
  effect: string;
  picture: "photo" | "shape";
  tolerance?: { off: number; max: number };
}[] = [
  { name: "brightness", picture: "photo", effect: `<Effect id="e" type="brightness" params={{ amount: 25 }} />` },
  { name: "contrast", picture: "photo", effect: `<Effect id="e" type="contrast" params={{ amount: 40 }} />` },
  { name: "saturation", picture: "photo", effect: `<Effect id="e" type="saturation" params={{ amount: 60 }} />` },
  { name: "hue", picture: "photo", effect: `<Effect id="e" type="hue" params={{ angle: 90 }} />` },
  { name: "sepia", picture: "photo", effect: `<Effect id="e" type="sepia" params={{ amount: 70 }} />` },
  { name: "grayscale", picture: "photo", effect: `<Effect id="e" type="grayscale" params={{ amount: 80 }} />` },
  { name: "invert", picture: "photo", effect: `<Effect id="e" type="invert" params={{ amount: 60 }} />` },
  { name: "temperature", picture: "photo", effect: `<Effect id="e" type="temperature" params={{ amount: 40 }} />` },
  { name: "tint", picture: "photo", effect: `<Effect id="e" type="tint" params={{ amount: 30 }} />` },
  { name: "colorGrade", picture: "photo", effect: `<ColorGrade id="e" temperature={-40} tint={20} />` },
  {
    name: "blur",
    picture: "photo",
    effect: `<Effect id="e" type="blur" params={{ radius: 4 }} />`,
    tolerance: { off: 0.15, max: 10 },
  },
  {
    name: "blur-shape",
    picture: "shape",
    effect: `<Effect id="e" type="blur" params={{ radius: 6 }} />`,
    tolerance: { off: 0.15, max: 10 },
  },
  {
    name: "shadow-shape",
    picture: "shape",
    effect: `<Effect id="e" type="shadow" params={{ x: 6, y: 8, blur: 10, color: "rgba(0,0,0,0.6)" }} />`,
  },
  {
    name: "brightness-shape",
    picture: "shape",
    effect: `<Effect id="e" type="brightness" params={{ amount: -30 }} />`,
  },
];

const measured: Record<string, { off: number; max: number }> = {};
afterAll(() => {
  mkdirSync(scratch, { recursive: true });
  writeFileSync(join(scratch, "..", "css-passes.json"), JSON.stringify(measured, null, 2));
});

describe.each(CASES)("$name as a shader pass", (c) => {
  it("matches Chrome's canvas filter", async () => {
    const clip = (extra: string) =>
      `<Clip id="c" src="asset:${c.picture}" duration={2} fit="cover">${c.effect}${extra}</Clip>`;
    // The shapes sit on light grey, so a dark shadow or a blurred edge shows against it.
    const ground = c.picture === "shape" ? "#d0d0d0" : "#000000";
    const css = await still(`${c.name}-css`, clip(""), PASS_THROUGH, ground);
    const shader = await still(`${c.name}-shader`, clip(`<Effect id="same" type={same} />`), PASS_THROUGH, ground);
    const d = difference(css, shader);
    measured[c.name] = d;
    const t = c.tolerance ?? { off: 0.002, max: 32 };
    expect({ name: c.name, off: d.off <= t.off, max: d.max <= t.max }).toEqual({ name: c.name, off: true, max: true });
  });
});
