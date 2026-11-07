// A run of colour effects drawn as one pass must look like the same effects drawn one pass each. The separate version
// puts an effect of the file's own that changes nothing between each pair, which breaks every run. Both are drawn on
// the goldens' chart and compared within the golden tolerance; fusing only removes the 8-bit rounding between passes.
// Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "fuse");
let dir = "";

/** A size-5 LUT that warms, as the goldens' one. */
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
  dir = mkdtempSync(join(scratch, "f-"));
  writeFileSync(join(dir, "warm.cube"), warmCube());
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const CHART = `const chart = effect({
  name: "chart",
  shader: \`vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
vec4 effect(vec2 uv) {
  if (uv.y > 0.45 && uv.y < 0.55) return vec4(vec3(floor(uv.x * 8.0) / 7.0), 1.0);
  return vec4(hue(uv.x) * mix(1.0, 0.15, uv.y), 1.0);
}\`,
});
const same = effect({ name: "same", shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });`;

const GRADE = [
  `<Effect id="s1" type="exposure" params={{ stops: 0.4 }} />`,
  `<Effect id="s2" type="whiteBalance" params={{ temperature: 0.2, tint: -0.1 }} />`,
  `<Effect id="s3" type="curves" params={{ rgb: [[0, 0], [0.5, 0.6], [1, 1]] }} />`,
  `<Effect id="s4" type="vibrance" params={{ amount: 0.4 }} />`,
  `<Effect id="s5" type="lut" params={{ src: "asset:warm", amount: 0.5 }} />`,
  `<Effect id="s6" type="brightness" params={{ amount: 0.05 }} />`,
  `<Effect id="s7" type="saturation" params={{ amount: -0.2 }} />`,
];

async function still(name: string, effects: string): Promise<string> {
  const file = join(dir, `${name}.tsx`);
  const manifest = { assets: { ...mediaManifest.assets, warm: { id: "warm", kind: "lut" as const, duration: 0 } } };
  writeFileSync(
    file,
    `import { Clip, Composition, effect, Effect, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(manifest)};
${CHART}
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ mode: "color", color: "#000000" }}>
      <Track id="t">
        <Clip id="c" src="asset:solid" fit="cover">
          <Effect id="chart" type={chart} />
          ${effects}
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
    media: directoryResolver(mediaDir, loaded.manifest, { warm: join(dir, "warm.cube") }),
    out,
    time: 0.5,
    source: loaded.source,
  });
  return out;
}

it("draws a run of colour effects as one pass that looks like one pass each", async () => {
  const fused = await still("fused", GRADE.join("\n          "));
  const separate = await still(
    "separate",
    GRADE.map((e, i) => (i === 0 ? e : `<Effect id="x${i}" type={same} />${e}`)).join("\n          "),
  );
  const a = readImage(fused),
    b = readImage(separate);
  let off = 0,
    max = 0;
  for (let i = 0; i < a.rgba.length; i++) {
    const d = Math.abs((a.rgba[i] as number) - (b.rgba[i] as number));
    if (d > 2) off++;
    if (d > max) max = d;
  }
  writeFileSync(join(scratch, "..", "fuse.json"), JSON.stringify({ off: off / a.rgba.length, max }));
  expect({ off: off / a.rgba.length <= 0.03, max: max <= 16 }).toEqual({ off: true, max: true });
});
