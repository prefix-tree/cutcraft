// Golden stills: every built-in shader effect, drawn by the export on a fixed test chart, against a PNG checked in
// under test/goldens. They guard the effects' refactors: a change that moves a pixel by more than the tolerance fails.
// Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM. CUTCRAFT_UPDATE_GOLDENS=1 writes the stills as the new goldens;
// a failing still is kept beside the test output (test/.tmp/goldens-actual) to compare or adopt. The goldens are drawn
// on CI's Linux, and a Mac draws text and WebGL a little differently: scripts/goldens-linux.sh runs them as CI does.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { BUILT_IN_SHADERS } from "@cutcraft/kit";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const goldens = join(import.meta.dirname, "..", "goldens");
const scratch = join(import.meta.dirname, "..", ".tmp", "goldens");
const actual = join(import.meta.dirname, "..", ".tmp", "goldens-actual");
const update = process.env.CUTCRAFT_UPDATE_GOLDENS === "1";
let dir = "";

/** A size-5 LUT that warms: red up, blue down, by a curve on each. */
function warmCube(): string {
  const n = 5;
  const lines = [`LUT_3D_SIZE ${n}`];
  for (let b = 0; b < n; b++)
    for (let g = 0; g < n; g++)
      for (let r = 0; r < n; r++) {
        const [R, G, B] = [r, g, b].map((v) => v / (n - 1)) as [number, number, number];
        lines.push(`${(R ** 0.85).toFixed(5)} ${G.toFixed(5)} ${(B ** 1.15 * 0.95).toFixed(5)}`);
      }
  return lines.join("\n");
}

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "g-"));
  writeFileSync(join(dir, "warm.cube"), warmCube());
  if (update) mkdirSync(goldens, { recursive: true });
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/**
 * The charts the effects draw on, as an effect of the file's own that ignores the clip: `photo` is opaque, a hue
 * sweep across and a brightness ramp down with a grey band and hard edges; `shape` is a rounded box and a disc on
 * transparency, for the effects that work on alpha.
 */
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

interface Case {
  readonly name: string;
  readonly effects: string;
  readonly shape?: boolean;
  /** On a `<Layer>` over a CSS gradient (an overlay, drawn through HTML-in-Canvas) instead of the chart on a clip. */
  readonly layer?: boolean;
}

/** One case per built-in shader effect, and stacks that later steps fuse or reorder. */
const CASES: readonly Case[] = [
  { name: "levels", effects: `<Effect id="e" type="levels" params={{ black: 0.1, white: 0.85, gamma: 1.4 }} />` },
  { name: "lut", effects: `<Effect id="e" type="lut" params={{ src: "asset:warm", amount: 0.8 }} />` },
  { name: "exposure", effects: `<Effect id="e" type="exposure" params={{ stops: 0.75 }} />` },
  { name: "vibrance", effects: `<Effect id="e" type="vibrance" params={{ amount: 0.6 }} />` },
  { name: "whiteBalance", effects: `<Effect id="e" type="whiteBalance" params={{ temperature: 0.35, tint: -0.2 }} />` },
  {
    name: "shadowsHighlights",
    effects: `<Effect id="e" type="shadowsHighlights" params={{ shadows: 0.7, highlights: -0.5, radius: 8 }} />`,
  },
  { name: "duotone", effects: `<Effect id="e" type="duotone" params={{ dark: "#102040", light: "#ffcc66" }} />` },
  {
    name: "curves",
    effects: `<Effect id="e" type="curves" params={{ rgb: [[0, 0.05], [0.3, 0.22], [0.7, 0.82], [1, 0.97]], blue: [[0, 0.1], [1, 0.9]] }} />`,
  },
  {
    name: "colorKey",
    effects: `<Effect id="e" type="colorKey" params={{ color: "#00ff00", tolerance: 0.35, softness: 0.15 }} />`,
  },
  {
    name: "regionBlur",
    effects: `<Effect id="e" type="regionBlur" params={{ box: [0.3, 0.2, 0.4, 0.5], radius: 5, feather: 8, roundness: 0.5 }} />`,
  },
  {
    name: "cornerPin",
    effects: `<Effect id="e" type="cornerPin" params={{ topLeft: [0.1, 0.15], topRight: [0.85, 0.05], bottomRight: [0.9, 0.9], bottomLeft: [0.05, 0.8] }} />`,
  },
  { name: "zoomBlur", effects: `<Effect id="e" type="zoomBlur" params={{ length: 60, center: [0.4, 0.5] }} />` },
  {
    name: "chromaticAberration",
    effects: `<Effect id="e" type="chromaticAberration" params={{ distance: 10, radial: true }} />`,
  },
  {
    name: "glow",
    shape: true,
    effects: `<Effect id="e" type="glow" params={{ radius: 6, intensity: 1.5, color: "#ffee88" }} />`,
  },
  { name: "outline", shape: true, effects: `<Effect id="e" type="outline" params={{ width: 6 }} />` },
  {
    name: "longShadow",
    shape: true,
    effects: `<Effect id="e" type="longShadow" params={{ length: 60, color: "#333333", fade: true }} />`,
  },
  { name: "bevel", shape: true, effects: `<Effect id="e" type="bevel" params={{ size: 2, amount: 0.8 }} />` },
  { name: "halftone", effects: `<Effect id="e" type="halftone" params={{ size: 10, mode: "cmyk" }} />` },
  {
    name: "pixelate",
    effects: `<Effect id="e" type="pixelate" params={{ size: 16, box: [0.25, 0.2, 0.5, 0.6], feather: 6 }} />`,
  },
  {
    name: "scanlines",
    effects: `<Effect id="e" type="scanlines" params={{ spacing: 6, intensity: 0.6, speed: 20, angle: 10 }} />`,
  },
  { name: "lightLeak", effects: `<Effect id="e" type="lightLeak" params={{ intensity: 0.8, seed: 3 }} />` },
  {
    name: "fractalNoise",
    effects: `<Effect id="e" type="fractalNoise" params={{ size: 50, octaves: 6, blend: "softLight", opacity: 0.8, seed: 2 }} />`,
  },
  { name: "blur", effects: `<Effect id="e" type="blur" params={{ radius: 4 }} />` },
  { name: "blur-shape", shape: true, effects: `<Effect id="e" type="blur" params={{ radius: 6 }} />` },
  {
    name: "stack-grade",
    effects: `<Effect id="s1" type="exposure" params={{ stops: 0.4 }} />
      <Effect id="s2" type="whiteBalance" params={{ temperature: 0.2 }} />
      <Effect id="s3" type="curves" params={{ rgb: [[0, 0], [0.5, 0.6], [1, 1]] }} />
      <Effect id="s4" type="vibrance" params={{ amount: 0.4 }} />
      <Effect id="s5" type="lut" params={{ src: "asset:warm", amount: 0.5 }} />`,
  },
  {
    name: "stack-css-and-shader-title",
    layer: true,
    effects: `<Effect id="s1" type="brightness" params={{ amount: 0.1 }} />
      <Effect id="s2" type="levels" params={{ gamma: 1.2 }} />
      <Effect id="s3" type="blur" params={{ radius: 1 }} />`,
  },
  {
    name: "stack-css-and-shader",
    effects: `<Effect id="s1" type="brightness" params={{ amount: 0.1 }} />
      <Effect id="s2" type="levels" params={{ gamma: 1.2 }} />
      <Effect id="s3" type="blur" params={{ radius: 1 }} />`,
  },
];

async function still(c: Case): Promise<string> {
  const file = join(dir, `${c.name}.tsx`);
  const manifest = {
    assets: { ...mediaManifest.assets, warm: { id: "warm", kind: "lut" as const, duration: 0 } },
  };
  writeFileSync(
    file,
    `import { z } from "zod";
import { Clip, Composition, effect, Effect, Layer, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(manifest)};
${CHART}
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ mode: "color", color: "#000000" }}>
      ${
        c.layer
          ? `<Track id="fx" layout="free">
        <Layer id="l" start={0} duration={2}>
          ${c.effects}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #ff2200, #22ff88 50%, #2244ff)" }} />
        </Layer>
      </Track>`
          : `<Track id="t">
        <Clip id="c" src="asset:solid" fit="cover">
          <Effect id="chart" type={chart} params={{ shape: ${c.shape === true} }} />
          ${c.effects}
        </Clip>
      </Track>`
      }
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, `${c.name}.png`);
  await renderStill({
    state: loaded.state,
    media: directoryResolver(mediaDir, loaded.manifest, { warm: join(dir, "warm.cube") }),
    out,
    time: 0.5,
    source: loaded.source,
  });
  return out;
}

/**
 * How far a still is from its golden: the share of channel values off by more than 2, and the largest difference.
 * Chrome versions and GPUs round a little differently, hence a small allowance rather than exact equality.
 */
function difference(a: string, b: string): { off: number; max: number } {
  const x = readImage(a),
    y = readImage(b);
  if (x.width !== y.width || x.height !== y.height) return { off: 1, max: 255 };
  let off = 0,
    max = 0;
  for (let i = 0; i < x.rgba.length; i++) {
    const d = Math.abs((x.rgba[i] as number) - (y.rgba[i] as number));
    if (d > 2) off++;
    if (d > max) max = d;
  }
  return { off: off / x.rgba.length, max };
}

it("has a golden case for every built-in shader effect", () => {
  const covered = new Set(CASES.map((c) => c.name));
  expect(BUILT_IN_SHADERS.map((s) => s.name).filter((name) => !covered.has(name))).toEqual([]);
});

/** Compares a still with the golden of that name, or writes it as the golden under CUTCRAFT_UPDATE_GOLDENS=1. */
function matchesGolden(name: string, out: string): void {
  const golden = join(goldens, `${name}.png`);
  if (update) {
    copyFileSync(out, golden);
    return;
  }
  if (!existsSync(golden)) {
    // Kept with the drifted stills, so CI's goldens-actual artifact carries a new golden drawn on Linux to adopt.
    mkdirSync(actual, { recursive: true });
    copyFileSync(out, join(actual, `${name}.png`));
  }
  expect(existsSync(golden), `no golden for ${name}: run with CUTCRAFT_UPDATE_GOLDENS=1`).toBe(true);
  const { off, max } = difference(out, golden);
  if (off > 0.002 || max > 32) {
    mkdirSync(actual, { recursive: true });
    copyFileSync(out, join(actual, `${name}.png`));
  }
  expect({ name, off: off <= 0.002, max: max <= 32 }).toEqual({ name, off: true, max: true });
}

describe.each(CASES)("golden: $name", (c) => {
  it("matches its golden", async () => {
    matchesGolden(c.name, await still(c));
  });
});

// A whole frame as a file composes it: footage with a grade, a wipe, a title, word-highlighted captions and a Motion
// layer, so a change to the resolver, the compositor, text layout or caption timing that moves a pixel shows. Only
// the solid and the logo: the bars carry a counter drawn only by an ffmpeg with drawtext, so they differ by machine.
// solid 0–2, wipe 1.4–2, logo 1.4–3.4; the title 0.2–3; the dot slides right over 0.5–2.5.
const COMPOSED = `import { Caption, Captions, Clip, Composition, Effect, Motion, Title, Track, Transition } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(mediaManifest)};
export default function Video() {
  return (
    <Composition fps={30} width={480} height={270} background={{ mode: "color", color: "#000000" }}>
      <Track id="main">
        <Clip id="solid" src="asset:solid" in={0} out={2}>
          <Effect id="grade" type="levels" params={{ black: 0.05, white: 0.9, gamma: 1.2 }} />
        </Clip>
        <Transition id="w" type="wipe" duration={0.6} params={{ direction: "left" }} />
        <Clip id="logo" src="asset:logo" duration={2} fit="contain" />
      </Track>
      <Track id="overlays" layout="free">
        <Title id="title" start={0.2} duration={2.8} size={36} color="#ffffff">Golden frame</Title>
        <Motion id="dot" start={0.5} duration={2} sequence={[[".dot", { x: [0, 300] }, { duration: 2, ease: "linear" }]]}>
          <div className="dot" style={{ position: "absolute", left: 40, top: 200, width: 30, height: 30, borderRadius: 15, background: "#ffcc00" }} />
        </Motion>
      </Track>
      <Captions id="cap" animation="word-highlight" style={{ size: 24, color: "#ffffff", highlight: "#ff3366" }}>
        <Caption id="c1" start={0} end={3.4} text="every frame matters" words={[
          { text: "every", start: 0, end: 1 },
          { text: "frame", start: 1, end: 2 },
          { text: "matters", start: 2, end: 3.4 },
        ]} />
      </Captions>
    </Composition>
  );
}
`;

describe("golden: a composed frame", () => {
  it.each([0.7, 1.7, 2.8])("at %s s", async (time) => {
    const file = join(dir, "composed.tsx");
    writeFileSync(file, COMPOSED);
    const loaded = await loadVideo(file);
    expect(loaded.state.errors).toEqual([]);
    const out = join(dir, `composed-${time}.png`);
    await renderStill({
      state: loaded.state,
      media: directoryResolver(mediaDir, loaded.manifest),
      out,
      time,
      source: loaded.source,
    });
    matchesGolden(`composed-${time}`, out);
  });
});
