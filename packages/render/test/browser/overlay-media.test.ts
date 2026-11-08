// Overlays that load a file (a sticker's image, an SVG's markup) are captured once it has loaded, not before: a still
// taken the moment they appear shows the file. Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "overlay-media");
let dir = "";

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "m-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

it("draws a sticker's image in a still of its first moment", async () => {
  const file = join(dir, "sticker.tsx");
  writeFileSync(
    file,
    `import { Composition, Sticker, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify({ assets: mediaManifest.assets })};
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ mode: "color", color: "#000000" }}>
      <Track id="o" layout="free">
        <Sticker id="s" start={0.3} duration={1} src="asset:logo" />
      </Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, "sticker.png");
  await renderStill({
    state: loaded.state,
    media: directoryResolver(mediaDir, loaded.manifest),
    out,
    time: 0.4,
    source: loaded.source,
  });
  const img = readImage(out);
  const at = (x: number, y: number) => [...img.rgba.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)];
  // The logo is a red square, drawn in the middle of the frame.
  const [r, g, b] = at(160, 90) as [number, number, number];
  expect(r).toBeGreaterThan(150);
  expect(g + b).toBeLessThan(120);
});
