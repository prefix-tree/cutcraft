// Effects and transitions a file declares (defineEffect, defineTransition), drawn by the browser export with WebGL.
// Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { pixel, readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "shaders");
let dir = "";

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "s-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The colour at (x, y) of a still of `body` at `time`, with the test media and these declarations. */
async function colourAt(name: string, body: string, declarations: string, time: number, points: [number, number][]) {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { z } from "zod";
import { Adjustment, Clip, Composition, defineEffect, defineTransition, Effect, Layer, Motion, Title, Track, Transition } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(mediaManifest)};
${declarations}
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180}>
      ${body}
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
    time,
    source: loaded.source,
  });
  const image = readImage(out);
  return points.map(([x, y]) => pixel(image, x, y));
}

const INVERT = `defineEffect({
  name: "invert-it",
  params: z.object({ amount: z.number().min(0).max(1).default(1) }),
  shader: "vec4 effect(vec2 uv) { vec4 c = texture(image, uv); return vec4(mix(c.rgb, 1.0 - c.rgb, amount), c.a); }",
})`;

const near = (a: number[] | undefined, b: number[]) => a?.every((v, i) => Math.abs(v - (b[i] as number)) < 40) === true;

it("runs a declared effect over a clip, with its params", async () => {
  // solid.webm is blue: inverted, it is yellow; at amount 0 it stays blue.
  const [full] = await colourAt(
    "invert",
    `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="e" type={inv} /></Clip></Track>`,
    `const inv = ${INVERT};`,
    0.5,
    [[160, 90]],
  );
  expect(near(full, [255, 255, 0])).toBe(true);
  const [none] = await colourAt(
    "invert-0",
    `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="e" type={inv} params={{ amount: 0 }} /></Clip></Track>`,
    `const inv = ${INVERT};`,
    0.5,
    [[160, 90]],
  );
  expect(near(none, [0, 0, 255])).toBe(true);
});

it("runs a declared effect on an adjustment, over everything beneath it", async () => {
  const [c] = await colourAt(
    "adjust",
    `<Track id="t"><Clip id="c" src="asset:solid" fit="cover" /></Track>
     <Track id="fx" layout="free"><Adjustment id="a" start={0} duration={2}><Effect id="e" type={inv} /></Adjustment></Track>`,
    `const inv = ${INVERT};`,
    0.5,
    [[160, 90]],
  );
  expect(near(c, [255, 255, 0])).toBe(true);
});

it("blends two clips with a declared transition", async () => {
  // Blue (solid.webm) to red (logo.png): half way, the sweep shows red on the left and blue on the right.
  const body = `<Track id="t">
      <Clip id="a" src="asset:solid" in={0} out={2} fit="cover" />
      <Transition id="x" type={sweep} duration={1} />
      <Clip id="b" src="asset:logo" duration={2} fit="cover" />
    </Track>`;
  const declarations = `const sweep = defineTransition({
    name: "sweep",
    shader: "vec4 transition(vec2 uv) { return uv.x < progress ? texture(to, uv) : texture(from, uv); }",
  });`;
  const file = join(dir, "probe.tsx");
  writeFileSync(
    file,
    `import { Clip, Composition, defineTransition, Track, Transition } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(mediaManifest)};
${declarations}
export default function Video() { return <Composition fps={30} width={320} height={180}>${body}</Composition>; }`,
  );
  const x = (await loadVideo(file)).state.items.get("x")!;
  const [left, right] = await colourAt("sweep", body, declarations, (x.start + x.end) / 2, [
    [40, 90],
    [280, 90],
  ]);
  expect(near(left, [255, 0, 0])).toBe(true);
  expect(near(right, [0, 0, 255])).toBe(true);
});

const SWAP = `defineEffect({
  name: "swap",
  shader: "vec4 effect(vec2 uv) { vec4 c = texture(image, uv); return vec4(c.b, c.g, c.r, c.a); }",
})`;

it("runs a declared effect over overlays: a Layer, a Motion layer and a title, through HTML-in-Canvas", async () => {
  // Red boxes and red text over black: the swap turns each one blue, and leaves the black around them black.
  const [layer, motion, title, around] = await colourAt(
    "overlays",
    `<Track id="fx" layout="free">
      <Layer id="l" start={0} duration={2}>
        <Effect id="e1" type={swap} />
        <div style={{ position: "absolute", left: 10, top: 10, width: 80, height: 60, background: "#ff0000" }} />
      </Layer>
      <Motion id="m" start={0} duration={2} sequence={[[".box", { opacity: [1, 1] }, { duration: 1 }]]}>
        <Effect id="e2" type={swap} />
        <div className="box" style={{ position: "absolute", left: 120, top: 10, width: 80, height: 60, background: "#ff0000" }} />
      </Motion>
      <Title id="t" start={0} duration={2} color="#ff0000" size={90} transform={{ position: { x: 0, y: 40 } }}>
        <Effect id="e3" type={swap} />
        ███
      </Title>
    </Track>`,
    `const swap = ${SWAP};`,
    0.5,
    [
      [50, 40],
      [160, 40],
      [160, 130],
      [300, 20],
    ],
  );
  expect(near(layer, [0, 0, 255])).toBe(true);
  expect(near(motion, [0, 0, 255])).toBe(true);
  expect(near(title, [0, 0, 255])).toBe(true);
  expect(near(around, [0, 0, 0])).toBe(true);
});
