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
async function colourAt(
  name: string,
  body: string,
  declarations: string,
  time: number,
  points: [number, number][],
  /** More assets, each with the file it is read from. */
  extra: Readonly<Record<string, { kind: "lut" | "image"; file: string }>> = {},
) {
  const file = join(dir, `${name}.tsx`);
  const manifest = {
    assets: {
      ...mediaManifest.assets,
      ...Object.fromEntries(Object.entries(extra).map(([id, a]) => [id, { id, kind: a.kind, duration: 0 }])),
    },
  };
  writeFileSync(
    file,
    `import { z } from "zod";
import { Adjustment, Clip, Composition, defineEffect, defineTransition, Effect, Layer, Motion, Title, Track, Transition } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(manifest)};
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
    media: directoryResolver(
      mediaDir,
      loaded.manifest,
      Object.fromEntries(Object.entries(extra).map(([id, a]) => [id, a.file])),
    ),
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

it("runs an effect's passes in order, each the right way up, with the element's picture as original", async () => {
  // Pass 1 paints red over green, ignoring the clip; pass 2 copies it through a texture; pass 3 keeps it on the left
  // and shows the blue clip (original) on the right.
  const [top, bottom, right] = await colourAt(
    "passes",
    `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="e" type={split} /></Clip></Track>`,
    `const split = defineEffect({
      name: "split",
      passes: [
        "vec4 effect(vec2 uv) { return uv.y < 0.5 ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0, 1.0, 0.0, 1.0); }",
        "vec4 effect(vec2 uv) { return texture(image, uv); }",
        "vec4 effect(vec2 uv) { return uv.x < 0.5 ? texture(image, uv) : texture(original, uv); }",
      ],
    });`,
    0.5,
    [
      [40, 40],
      [40, 140],
      [280, 90],
    ],
  );
  expect(near(top, [255, 0, 0])).toBe(true);
  expect(near(bottom, [0, 255, 0])).toBe(true);
  expect(near(right, [0, 0, 255])).toBe(true);
});

it("draws levels with its gamma, after an effect of the file's own", async () => {
  // The file's effect paints mid grey (0.5); levels with gamma 2 lifts it to 0.5^(1/2), with gamma 0.5 lowers it to 0.25.
  const grey = `const grey = defineEffect({ name: "grey", shader: "vec4 effect(vec2 uv) { return vec4(0.5, 0.5, 0.5, 1.0); }" });`;
  const at = (gamma: number) =>
    colourAt(
      `levels-${gamma}`,
      `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="g" type={grey} /><Effect id="l" type="levels" params={{ gamma: ${gamma} }} /></Clip></Track>`,
      grey,
      0.5,
      [[160, 90]],
    );
  const [lifted] = await at(2);
  const [lowered] = await at(0.5);
  const close = (c: number[] | undefined, v: number) => c?.slice(0, 3).every((x) => Math.abs(x - v) <= 6) === true;
  expect(close(lifted, Math.round(255 * Math.SQRT1_2))).toBe(true);
  expect(close(lowered, Math.round(255 * 0.25))).toBe(true);
});

it("draws levels with its gamma on an overlay, through HTML-in-Canvas", async () => {
  const [c] = await colourAt(
    "levels-layer",
    `<Track id="fx" layout="free">
      <Layer id="l" start={0} duration={2}>
        <Effect id="e" type="levels" params={{ gamma: 2 }} />
        <div style={{ position: "absolute", inset: 0, background: "#808080" }} />
      </Layer>
    </Track>`,
    "",
    0.5,
    [[160, 90]],
  );
  const v = Math.round(255 * Math.sqrt(128 / 255));
  expect(c?.slice(0, 3).every((x) => Math.abs(x - v) <= 6)).toBe(true);
});

it("grades through a LUT asset, mixed by its amount", async () => {
  // A size-2 table whose output is (b, g, r): the blue clip turns red; at amount 0.5, half of each.
  const cube = join(dir, "swap.cube");
  writeFileSync(
    cube,
    ["LUT_3D_SIZE 2", ...[0, 1].flatMap((b) => [0, 1].flatMap((g) => [0, 1].map((r) => `${b} ${g} ${r}`)))].join("\n"),
  );
  const at = (amount: number) =>
    colourAt(
      `lut-${amount}`,
      `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="l" type="lut" params={{ src: "asset:swap", amount: ${amount} }} /></Clip></Track>`,
      "",
      0.5,
      [[160, 90]],
      { swap: { kind: "lut", file: cube } },
    );
  const [full] = await at(1);
  const [half] = await at(0.5);
  expect(near(full, [255, 0, 0])).toBe(true);
  expect(near(half, [128, 0, 128])).toBe(true);
});

it("lets a file's own effect read an image asset as a texture", async () => {
  // The effect shows the logo (red) where the clip (blue) is: the image param is a sampler2D.
  const [c] = await colourAt(
    "texture",
    `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="o" type={over} params={{ picture: "asset:logo" }} /></Clip></Track>`,
    `const over = defineEffect({ name: "over", params: z.object({ picture: z.string() }), shader: "vec4 effect(vec2 uv) { return texture(picture, uv); }" });`,
    0.5,
    [[160, 90]],
  );
  expect(near(c, [255, 0, 0])).toBe(true);
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
