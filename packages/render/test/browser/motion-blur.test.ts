// Motion blur in the browser export: each frame averages the moments its shutter sees, so a bar moving fast smears
// into grey where a sharp frame has only black and white. Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Canvas, loadImage } from "skia-canvas";

import { directoryResolver, loadVideo, renderStill } from "../../src";

const scratch = join(import.meta.dirname, "..", ".tmp", "motion-blur");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "b-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** A white bar crossing a black frame at 600 px a second, with or without blur; a still of it half way. */
async function still(name: string, blur: string): Promise<{ grey: number; white: number }> {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Composition, Motion, Track } from "@cutcraft/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={320} height={120} ${blur}>
      <Track id="t" layout="free">
        <Motion id="bar" start={0} duration={1} sequence={[[".bar", { x: [0, 600] }, { duration: 1, ease: "linear" }]]}>
          <div className="bar" style={{ position: "absolute", left: -280, top: 20, width: 20, height: 80, background: "#ffffff" }} />
        </Motion>
      </Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  const out = join(dir, `${name}.png`);
  await renderStill({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    time: 0.5,
    source: loaded.source,
  });
  const image = await loadImage(out);
  const ctx = new Canvas(image.width, image.height).getContext("2d");
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  let grey = 0;
  let white = 0;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] as number;
    if (v > 240) white++;
    else if (v > 20) grey++;
  }
  return { grey, white };
}

it("smears a fast-moving bar across the open shutter, and leaves it sharp without blur", async () => {
  const sharp = await still("sharp", "");
  const blurred = await still("blurred", "motionBlur={{ shutterAngle: 180, samples: 8 }}");
  // Sharp: a 20 x 80 bar, all white. Blurred: 10 px of travel spread over the bar's edges, as greys.
  expect(sharp.white).toBeGreaterThan(1400);
  expect(sharp.grey).toBeLessThan(200);
  expect(blurred.grey).toBeGreaterThan(sharp.grey + 600);
  expect(blurred.white).toBeLessThan(sharp.white);
});
