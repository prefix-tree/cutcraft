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
import { Adjustment, Clip, Composition, defineEffect, defineTransition, Effect, Keyframe, Layer, Motion, Title, Track, Transition } from "@cutcraft/kit";
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

describe("colour effects", () => {
  // A picture of known colours, painted by an effect of the file's own, then the colour effect under test.
  const PAINT = `const paint = defineEffect({
    name: "paint",
    params: z.object({ left: z.array(z.number()).default([0.5, 0.5, 0.5]), right: z.array(z.number()).default([0.5, 0.5, 0.5]) }),
    shader: "vec4 effect(vec2 uv) { return vec4(uv.x < 0.5 ? left : right, 1.0); }",
  });`;
  const graded = (name: string, effect: string, left: number[], right = left) =>
    colourAt(
      name,
      `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="p" type={paint} params={{ left: ${JSON.stringify(left)}, right: ${JSON.stringify(right)} }} />${effect}</Clip></Track>`,
      PAINT,
      0.5,
      [
        [30, 90],
        [290, 90],
      ],
    );
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const toSrgb = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);
  /** Each channel within `by` of the expected 0..1 value. */
  const about = (c: number[] | undefined, want: readonly number[], by = 4) =>
    want.every((v, i) => Math.abs((c?.[i] ?? -999) - v * 255) <= by);

  it("exposure doubles linear light at +1 stop", async () => {
    const [c] = await graded("exposure", `<Effect id="e" type="exposure" params={{ stops: 1 }} />`, [0.2, 0.2, 0.2]);
    const v = toSrgb(toLinear(51 / 255) * 2);
    expect(about(c, [v, v, v])).toBe(true);
  });

  it("vibrance moves a muted colour and leaves a saturated one", async () => {
    const [muted, blue] = await graded(
      "vibrance",
      `<Effect id="v" type="vibrance" params={{ amount: 0.8 }} />`,
      [0.4, 0.45, 0.6],
      [0, 0, 1],
    );
    expect(about(blue, [0, 0, 1])).toBe(true);
    // The muted colour spreads from its luminance: blue up, red down.
    expect((muted?.[2] ?? 0) - (muted?.[0] ?? 0)).toBeGreaterThan((0.6 - 0.4) * 255 + 20);
  });

  it("white balance warms grey at a positive temperature, and cools it at a negative one", async () => {
    const [warm, cool] = await Promise.all([
      graded("wb-warm", `<Effect id="w" type="whiteBalance" params={{ temperature: 50 }} />`, [0.5, 0.5, 0.5]),
      graded("wb-cool", `<Effect id="w" type="whiteBalance" params={{ temperature: -50 }} />`, [0.5, 0.5, 0.5]),
    ]);
    expect((warm[0]?.[0] ?? 0) - (warm[0]?.[2] ?? 0)).toBeGreaterThan(10);
    expect((cool[0]?.[2] ?? 0) - (cool[0]?.[0] ?? 0)).toBeGreaterThan(10);
  });

  it("duotone maps black and white to its two colours", async () => {
    const [black, white] = await graded(
      "duotone",
      `<Effect id="d" type="duotone" params={{ dark: "#102040", light: "#ffcc00" }} />`,
      [0, 0, 0],
      [1, 1, 1],
    );
    expect(about(black, [0x10 / 255, 0x20 / 255, 0x40 / 255])).toBe(true);
    expect(about(white, [1, 0xcc / 255, 0])).toBe(true);
  });

  it("curves lift the midtones through a point and keep black and white", async () => {
    const effect = `<Effect id="k" type="curves" params={{ rgb: [[0, 0], [0.5, 0.75], [1, 1]] }} />`;
    const [mid, white] = await graded("curves", effect, [0.5, 0.5, 0.5], [1, 1, 1]);
    const [black] = await graded("curves-black", effect, [0, 0, 0]);
    expect(about(mid, [0.75, 0.75, 0.75], 5)).toBe(true);
    expect(about(white, [1, 1, 1])).toBe(true);
    expect(about(black, [0, 0, 0])).toBe(true);
  });

  it("shadows lift a dark area and leave a bright one", async () => {
    const [dark, bright] = await graded(
      "shadows",
      `<Effect id="s" type="shadowsHighlights" params={{ shadows: 1, radius: 20 }} />`,
      [0.1, 0.1, 0.1],
      [0.9, 0.9, 0.9],
    );
    // The dark side's surroundings are all 0.1, so its shadow weight is 1 − smoothstep(0, 0.5, 0.1): 2 stops times that.
    const t = 0.1 / 0.5;
    const v = toSrgb(toLinear(26 / 255) * 2 ** (2 * (1 - t * t * (3 - 2 * t))));
    expect(about(dark, [v, v, v])).toBe(true);
    expect(about(bright, [0.9, 0.9, 0.9])).toBe(true);
  });
});

describe("footage tools", () => {
  // Two colours either side of x = split (a fraction of the width), then the effect under test. Background black.
  const PAINT = `const paint = defineEffect({
    name: "paint",
    params: z.object({ left: z.array(z.number()), right: z.array(z.number()), split: z.number().default(0.5) }),
    shader: "vec4 effect(vec2 uv) { return vec4(uv.x < split ? left : right, 1.0); }",
  });`;
  const at = (
    name: string,
    effect: string,
    paint: { left: number[]; right: number[]; split?: number },
    points: [number, number][],
    time = 0.5,
    keys = "",
  ) =>
    colourAt(
      name,
      `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="p" type={paint} params={${JSON.stringify(paint)}} />${effect}${keys}</Clip></Track>`,
      PAINT,
      time,
      points,
    );
  const near = (c: number[] | undefined, want: readonly number[], by = 6) =>
    want.every((v, i) => Math.abs((c?.[i] ?? -999) - v) <= by);
  const chroma = ([r, g, b]: readonly number[]) => [
    -0.1146 * (r as number) - 0.3854 * (g as number) + 0.5 * (b as number),
    0.5 * (r as number) - 0.4542 * (g as number) - 0.0458 * (b as number),
  ];

  it("colorKey takes out the key colour, keeps the rest, and fades what is close", async () => {
    const [green, red] = await at("key", `<Effect id="k" type="colorKey" />`, { left: [0, 1, 0], right: [1, 0, 0] }, [
      [40, 90],
      [280, 90],
    ]);
    expect(near(green, [0, 0, 0])).toBe(true);
    expect(near(red, [255, 0, 0])).toBe(true);
    // A pale green, with no spill change: alpha from the chroma distance, over the black background.
    const pale = [0.5, 1, 0.5];
    const [a, b] = [chroma(pale), chroma([0, 1, 0])];
    const d = 2 * Math.hypot((a[0] as number) - (b[0] as number), (a[1] as number) - (b[1] as number));
    const t = Math.min(1, Math.max(0, (d - 0.4) / 0.4));
    const keep = t * t * (3 - 2 * t);
    const [faded] = await at(
      "key-soft",
      `<Effect id="k" type="colorKey" params={{ tolerance: 0.4, softness: 0.4, spill: 0 }} />`,
      { left: pale, right: pale },
      [[160, 90]],
    );
    expect(
      near(
        faded,
        pale.map((v) => v * keep * 255),
      ),
    ).toBe(true);
  });

  it("regionBlur softens an edge inside the box and leaves it sharp outside", async () => {
    const [inside, outside] = await at(
      "region",
      `<Effect id="b" type="regionBlur" params={{ box: [0.4, 0, 0.2, 0.5], radius: 20, feather: 0 }} />`,
      { left: [0, 0, 0], right: [1, 1, 1] },
      [
        [156, 40],
        [156, 140],
      ],
    );
    expect(inside?.[0] ?? 0).toBeGreaterThan(40);
    expect(inside?.[0] ?? 255).toBeLessThan(215);
    expect(near(outside, [0, 0, 0])).toBe(true);
  });

  it("regionBlur's box follows its keyframes", async () => {
    // The box moves from x 0..0.2 to 0.6..0.8; half way it is at 0.3..0.5, over the edge at 0.4.
    const [edge] = await at(
      "region-keys",
      `<Effect id="b" type="regionBlur" params={{ box: [0, 0, 0.2, 1], radius: 20, feather: 0 }} />`,
      { left: [0, 0, 0], right: [1, 1, 1], split: 0.4 },
      [[124, 90]],
      1,
      `<Keyframe id="k1" property="effect.b.box" at={0} value={[0, 0, 0.2, 1]} /><Keyframe id="k2" property="effect.b.box" at={2} value={[0.6, 0, 0.2, 1]} />`,
    );
    expect(edge?.[0] ?? 0).toBeGreaterThan(40);
  });

  it("cornerPin draws the picture into its quad and nothing outside it", async () => {
    const [left, right, outside] = await at(
      "pin",
      `<Effect id="p2" type="cornerPin" params={{ topRight: [0.5, 0], bottomRight: [0.5, 1] }} />`,
      { left: [1, 0, 0], right: [0, 1, 0] },
      [
        [40, 90],
        [120, 90],
        [280, 90],
      ],
    );
    expect(near(left, [255, 0, 0])).toBe(true);
    expect(near(right, [0, 255, 0])).toBe(true);
    expect(near(outside, [0, 0, 0])).toBe(true);
  });

  it("zoomBlur keeps its centre and smears an edge far from it", async () => {
    const [centre, edge] = await at(
      "zoom",
      `<Effect id="z" type="zoomBlur" params={{ amount: 120, center: [0.25, 0.5] }} />`,
      { left: [0, 0, 0], right: [1, 1, 1], split: 0.75 },
      [
        [80, 90],
        [244, 90],
      ],
    );
    expect(near(centre, [0, 0, 0])).toBe(true);
    expect(edge?.[0] ?? 255).toBeLessThan(215);
  });

  it("chromaticAberration splits red and blue across an edge", async () => {
    const [before, after, far] = await at(
      "aberration",
      `<Effect id="a" type="chromaticAberration" params={{ amount: 8 }} />`,
      { left: [0, 0, 0], right: [1, 1, 1] },
      [
        [156, 90],
        [164, 90],
        [30, 90],
      ],
    );
    // Left of the edge, blue is read from the white side; right of it, red from the black side.
    expect(near(before, [0, 0, 255], 30)).toBe(true);
    expect(near(after, [0, 255, 255], 30)).toBe(true);
    expect(near(far, [0, 0, 0])).toBe(true);
  });

  it("radial aberration fringes the edges and leaves the centre", async () => {
    const [centre, edge] = await at(
      "aberration-radial",
      `<Effect id="a" type="chromaticAberration" params={{ amount: 12, radial: true }} />`,
      { left: [1, 1, 1], right: [0, 0, 0], split: 0.95 },
      [
        [160, 90],
        [302, 90],
      ],
    );
    expect(near(centre, [255, 255, 255])).toBe(true);
    // Just left of the edge near the right side: blue is read further out, on the black.
    expect(edge?.[2] ?? 255).toBeLessThan(100);
    expect(edge?.[0] ?? 0).toBeGreaterThan(200);
  });
});

describe("title effects", () => {
  // A red box at x 120..200, y 60..120 in a Layer, over black, through HTML-in-Canvas.
  const boxed = (name: string, effect: string, points: [number, number][]) =>
    colourAt(
      name,
      `<Track id="fx" layout="free">
        <Layer id="l" start={0} duration={2}>
          ${effect}
          <div style={{ position: "absolute", left: 120, top: 60, width: 80, height: 60, background: "#ff0000" }} />
        </Layer>
      </Track>`,
      "",
      0.5,
      points,
    );
  const near = (c: number[] | undefined, want: readonly number[], by = 12) =>
    want.every((v, i) => Math.abs((c?.[i] ?? -999) - v) <= by);

  it("glow lights the area around the box in its colour", async () => {
    const [around, far] = await boxed(
      "glow",
      `<Effect id="g" type="glow" params={{ radius: 20, color: "#00ffff" }} />`,
      [
        [205, 90],
        [20, 20],
      ],
    );
    // 5 px out from a hard edge, a Gaussian of sigma 20 / 3 holds about a fifth of the alpha.
    expect(around?.[1] ?? 0).toBeGreaterThan(35);
    expect(around?.[2] ?? 0).toBeGreaterThan(35);
    expect(around?.[0] ?? 255).toBeLessThan(15);
    expect(near(far, [0, 0, 0])).toBe(true);
  });

  it("outline draws a band around the box, and outlineOnly fills its silhouette", async () => {
    const [band, beyond, inside] = await boxed("outline", `<Effect id="o" type="outline" params={{ width: 8 }} />`, [
      [204, 90],
      [216, 90],
      [160, 90],
    ]);
    expect(near(band, [255, 255, 255])).toBe(true);
    expect(near(beyond, [0, 0, 0])).toBe(true);
    expect(near(inside, [255, 0, 0])).toBe(true);
    const [filled] = await boxed(
      "outline-only",
      `<Effect id="o" type="outline" params={{ width: 8, outlineOnly: true, color: "#0000ff" }} />`,
      [[160, 90]],
    );
    expect(near(filled, [0, 0, 255])).toBe(true);
  });

  it("longShadow falls down and right of the box, not up and left", async () => {
    const [cast, behind, inside] = await boxed(
      "long-shadow",
      `<Effect id="s" type="longShadow" params={{ reach: 40, color: "#00ff00" }} />`,
      [
        [205, 125],
        [115, 55],
        [160, 90],
      ],
    );
    expect(near(cast, [0, 255, 0])).toBe(true);
    expect(near(behind, [0, 0, 0])).toBe(true);
    expect(near(inside, [255, 0, 0])).toBe(true);
  });

  it("bevel lights the edge facing the light and shades the other, and leaves the middle", async () => {
    const [top, bottom, middle] = await boxed(
      "bevel",
      `<Effect id="b" type="bevel" params={{ size: 6, angle: 0, intensity: 1 }} />`,
      [
        [160, 61],
        [160, 118],
        [160, 90],
      ],
    );
    expect(top?.[1] ?? 0).toBeGreaterThan(50);
    expect(bottom?.[0] ?? 255).toBeLessThan(200);
    expect(near(middle, [255, 0, 0])).toBe(true);
  });

  it("glow works on footage too", async () => {
    const [edge] = await colourAt(
      "glow-clip",
      `<Track id="t"><Clip id="c" src="asset:solid" fit="cover"><Effect id="p" type={paint} /><Effect id="g" type="glow" params={{ radius: 20, color: "#ff0000" }} /></Clip></Track>`,
      `const paint = defineEffect({ name: "paint", shader: "vec4 effect(vec2 uv) { return uv.x < 0.5 ? vec4(0.0, 0.0, 0.0, 0.0) : vec4(1.0); }" });`,
      0.5,
      [[155, 90]],
    );
    expect(edge?.[0] ?? 0).toBeGreaterThan(35);
  });
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
