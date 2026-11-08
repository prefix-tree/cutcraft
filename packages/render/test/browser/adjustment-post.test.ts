// Vignette and grain on an <Adjustment> darken and speckle everything beneath it, in the export as in the preview:
// the goldens' chart under an adjustment with a vignette has darker corners than the chart alone, and the same centre.
// Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "adjustment-post");
let dir = "";

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "a-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const CHART = `const chart = effect({
  name: "chart",
  shader: \`vec4 effect(vec2 uv) { return vec4(vec3(0.8), 1.0); }\`,
});`;

async function still(name: string, looks: string): Promise<string> {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Adjustment, Clip, Composition, effect, Effect, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify({ assets: mediaManifest.assets })};
${CHART}
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ mode: "color", color: "#000000" }}>
      <Track id="t">
        <Clip id="c" src="asset:solid" fit="cover">
          <Effect id="chart" type={chart} />
        </Clip>
      </Track>
      <Track id="looks" layout="free">
        <Adjustment id="a" start={0} duration={1}>
          ${looks}
        </Adjustment>
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

/** The mean of the RGB channels in a square of `size` pixels centred at (x, y). */
function mean(file: string, x: number, y: number, size = 8): number {
  const img = readImage(file);
  let sum = 0,
    n = 0;
  for (let j = y - size / 2; j < y + size / 2; j++)
    for (let i = x - size / 2; i < x + size / 2; i++)
      for (let k = 0; k < 3; k++) {
        sum += img.rgba[(j * img.width + i) * 4 + k] as number;
        n++;
      }
  return sum / n;
}

it("darkens the corners of everything beneath an adjustment with a vignette, and leaves its centre", async () => {
  const plain = await still("plain", '<Effect id="none" type="brightness" params={{ amount: 0 }} />');
  const vignette = await still("vignette", '<Effect id="v" type="vignette" params={{ amount: 0.9 }} />');
  expect(mean(vignette, 6, 6)).toBeLessThan(mean(plain, 6, 6) - 60);
  expect(Math.abs(mean(vignette, 160, 90) - mean(plain, 160, 90))).toBeLessThan(4);
});

it("speckles everything beneath an adjustment with grain", async () => {
  const plain = await still("plain-g", '<Effect id="none" type="brightness" params={{ amount: 0 }} />');
  const grain = await still("grain", '<Effect id="g" type="grain" params={{ amount: 0.6 }} />');
  const a = readImage(plain),
    b = readImage(grain);
  let off = 0;
  for (let i = 0; i < a.rgba.length; i += 4) if (Math.abs((a.rgba[i] as number) - (b.rgba[i] as number)) > 8) off++;
  expect(off / (a.rgba.length / 4)).toBeGreaterThan(0.2);
});
