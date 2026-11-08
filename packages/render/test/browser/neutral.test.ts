// The neutral params the built-ins declare, proven: at them, an effect changes nothing, so the player may skip it.
// The player now does skip a built-in there, so each is drawn here by an effect of the file's own (never skipped) with
// the built-in's own GLSL and schema, at its neutral params, and compared with the chart alone.
//
// This covers the one-pass built-ins. The others reduce to these in their last pass: glow and longShadow composite at
// alpha 0, bevel mixes by 0, shadowsHighlights at 0 stops is exposure's round trip, and regionBlur at radius 0 sums one
// tap. lut and curves are exact by construction (a mix by 0, a table of the identity read at its entries' centres).
// Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "neutral");
let dir = "";

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "n-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The goldens' chart: a hue sweep, a brightness ramp and a grey band; or two shapes on transparency. */
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
    return vec4(box < disc ? vec3(0.95, 0.35, 0.1) : vec3(0.15, 0.55, 0.95), inside);
  }
  if (uv.y > 0.45 && uv.y < 0.55) return vec4(vec3(floor(uv.x * 8.0) / 7.0), 1.0);
  return vec4(hue(uv.x) * mix(1.0, 0.15, uv.y), 1.0);
}\`,
});`;

async function still(name: string, type: string | null, neutral: string, shape: boolean): Promise<string> {
  const file = join(dir, `${name}.tsx`);
  const probe = type
    ? `const def = builtInShader(${JSON.stringify(type)});
const probe = effect({ name: "probe", params: def.params, shader: def.passes[0] });`
    : "";
  writeFileSync(
    file,
    `import { z } from "zod";
import { builtInShader, Clip, Composition, effect, Effect, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify({ assets: mediaManifest.assets })};
${CHART}
${probe}
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ mode: "color", color: "#000000" }}>
      <Track id="t">
        <Clip id="c" src="asset:solid" fit="cover">
          <Effect id="chart" type={chart} params={{ shape: ${shape} }} />
          ${type ? `<Effect id="p" type={probe} params={${neutral}} />` : ""}
        </Clip>
      </Track>
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
    media: directoryResolver(mediaDir, loaded.manifest),
    out,
    time: 0.5,
    source: loaded.source,
  });
  return out;
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

const CASES: readonly { type: string; neutral: string; shape?: boolean }[] = [
  { type: "levels", neutral: "{ black: 0, white: 1, gamma: 1 }" },
  { type: "exposure", neutral: "{ stops: 0 }" },
  { type: "vibrance", neutral: "{ amount: 0 }" },
  { type: "whiteBalance", neutral: "{ temperature: 0, tint: 0 }" },
  { type: "duotone", neutral: "{ amount: 0 }" },
  { type: "zoomBlur", neutral: "{ length: 0 }" },
  { type: "chromaticAberration", neutral: "{ distance: 0 }" },
  { type: "longShadow", neutral: "{ opacity: 0 }", shape: true },
  { type: "halftone", neutral: "{ amount: 0 }" },
  { type: "pixelate", neutral: "{ size: 1 }" },
  { type: "scanlines", neutral: "{ intensity: 0 }" },
  { type: "lightLeak", neutral: "{ intensity: 0 }" },
  { type: "fractalNoise", neutral: "{ opacity: 0 }" },
];

const measured: Record<string, { off: number; max: number }> = {};
afterAll(() => {
  mkdirSync(join(scratch, ".."), { recursive: true });
  writeFileSync(join(scratch, "..", "neutral.json"), JSON.stringify(measured, null, 2));
});

describe.each(CASES)("$type at its neutral params", (c) => {
  it("changes nothing", async () => {
    const plain = await still(`${c.type}-plain`, null, "", c.shape === true);
    const neutral = await still(`${c.type}-neutral`, c.type, c.neutral, c.shape === true);
    const d = difference(plain, neutral);
    measured[c.type] = d;
    expect({ type: c.type, off: d.off <= 0.002, max: d.max <= 32 }).toEqual({ type: c.type, off: true, max: true });
  });
});

it("draws the probe at all: off its neutral params, the same effect changes the picture", async () => {
  const plain = await still("control-plain", null, "", false);
  const changed = await still("control-exposure", "exposure", "{ stops: 1 }", false);
  expect(difference(plain, changed).max).toBeGreaterThan(32);
});
