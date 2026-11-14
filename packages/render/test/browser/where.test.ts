// `whereThings`: where each overlay, the captions and each part a layer's code named are at a moment.
// Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  checkLayout,
  directoryResolver,
  formatLayout,
  formatWhere,
  loadVideo,
  type WhereThing,
  whereThings,
} from "../../src";

const scratch = join(import.meta.dirname, "..", ".tmp", "where");
let dir = "";
beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "w-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

// A portrait frame with a layer that draws three named parts (a block, an SVG group, an SVG label), a plain layer,
// and captions the SVG label sits on.
const VIDEO = `import { Caption, Captions, Composition, Layer, Track } from "@cutcraft/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={540} height={960} background={{ mode: "color", color: "#000000" }}>
      <Track id="t" layout="free">
        <Layer id="diagram" start={0} duration={2}>
          <div data-name="block" style={{ position: "absolute", left: 100, top: 300, width: 120, height: 60, background: "#ffffff" }} />
          <svg width={540} height={960} style={{ position: "absolute", left: 0, top: 0 }}>
            <g data-name="pair">
              <rect x={300} y={200} width={40} height={40} fill="#ff0000" />
              <rect x={380} y={260} width={40} height={40} fill="#ff0000" />
            </g>
            <rect data-name="edge" x={500} y={500} width={30} height={30} fill="#00ff00" />
            <rect data-name="low" x={200} y={690} width={140} height={20} fill="#0000ff" />
          </svg>
        </Layer>
        <Layer id="plain" start={0} duration={2}>
          <div style={{ position: "absolute", left: 40, top: 100, width: 50, height: 50, background: "#ffff00" }} />
        </Layer>
      </Track>
      <Captions id="said" style={{ size: 40, background: "#222222", position: 0.73 }}>
        <Caption id="c1" start={0} end={2} text="Hello there world" />
      </Captions>
    </Composition>
  );
}
`;

async function where(options: Record<string, unknown> = {}) {
  const file = join(dir, "where.tsx");
  writeFileSync(file, VIDEO);
  const v = await loadVideo(file);
  expect(v.state.errors).toEqual([]);
  return whereThings({
    state: v.state,
    source: v.source,
    media: directoryResolver(dir, v.manifest),
    at: "1",
    ...options,
  });
}

const near = (thing: WhereThing | undefined, x: number, y: number, w: number, h: number): void => {
  expect(thing, "the thing is reported").toBeDefined();
  const b = (thing as WhereThing).box;
  for (const [got, want] of [
    [b.x, x],
    [b.y, y],
    [b.w, w],
    [b.h, h],
  ] as const)
    expect(Math.abs(got - want), `${(thing as WhereThing).id}: ${JSON.stringify(b)}`).toBeLessThanOrEqual(2);
};

describe("where things are", () => {
  it("reports each element, and each part a layer's code named, with its box in pixels", async () => {
    const result = await where();
    expect(result.errors).toEqual([]);
    expect(result.zones).toEqual(["tiktok", "reels", "shorts"]);
    const [m] = result.moments;
    expect(m?.frame).toBe(30);
    const things = new Map(m?.things.map((t) => [t.id, t]));
    expect([...things.keys()].sort()).toEqual(
      ["diagram", "diagram/block", "diagram/edge", "diagram/low", "diagram/pair", "plain", "said"].sort(),
    );
    expect(things.get("diagram/block")?.kind).toBe("part");
    near(things.get("diagram/block"), 100, 300, 120, 60);
    // A group is what it draws: both squares.
    near(things.get("diagram/pair"), 300, 200, 120, 100);
    near(things.get("diagram/edge"), 500, 500, 30, 30);
    // Code with no names is one row, the layer.
    near(things.get("plain"), 40, 100, 50, 50);
  });

  it("says which zones a thing is inside, and how far past an edge it is", async () => {
    const things = new Map((await where()).moments[0]?.things.map((t) => [t.id, t]));
    const block = things.get("diagram/block") as WhereThing;
    expect(block.inFrame).toBe(true);
    expect(Object.values(block.zones).every((z) => z.inside)).toBe(true);
    // 540 wide: TikTok keeps 60 px at each side, so a square ending at x 530 is 50 px past the right edge.
    const edge = things.get("diagram/edge") as WhereThing;
    expect(edge.inFrame).toBe(true);
    expect(edge.zones.tiktok).toEqual({ inside: false, out: [{ side: "right", px: 50 }] });
    // One zone when one is named.
    const named = await where({ safeZone: "title-safe" });
    expect(named.zones).toEqual(["title-safe"]);
    expect(Object.keys(named.moments[0]?.things[0]?.zones ?? {})).toEqual(["title-safe"]);
  });

  it("lists what a thing's ink overlaps, but not a part against the layer that drew it", async () => {
    const things = new Map((await where()).moments[0]?.things.map((t) => [t.id, t]));
    const low = things.get("diagram/low") as WhereThing;
    expect(low.over.map((o) => o.id)).toEqual(["said"]);
    expect((things.get("diagram/block") as WhereThing).over).toEqual([]);
    expect((things.get("said") as WhereThing).over.map((o) => o.id).sort()).toEqual(["diagram", "diagram/low"]);
  });

  it("prints a row per thing", async () => {
    const text = formatWhere(await where({ safeZone: "tiktok" }));
    expect(text).toMatch(/^1\.00 s \(frame 30\)\n/);
    expect(text).toMatch(/ {2}diagram\/edge +part +x 500\.\.530, y 500\.\.530 +in frame +tiktok: out right 50 px\n/);
    expect(text).toMatch(/ {2}diagram\/low +part .* tiktok: out bottom 80 px +over "said" \(\d+ x \d+ px\)/);
  });

  it("measures a part of a layer that is drawn through an effect", async () => {
    const file = join(dir, "effect.tsx");
    writeFileSync(
      file,
      `import { Composition, Effect, Layer, Track } from "@cutcraft/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={540} height={960} background={{ mode: "color", color: "#000000" }}>
      <Track id="t" layout="free">
        <Layer id="fx" start={0} duration={2}>
          <Effect id="inv" type="invert" params={{ amount: 1 }} />
          <div data-name="block" style={{ position: "absolute", left: 100, top: 300, width: 120, height: 60, background: "#ffffff" }} />
        </Layer>
      </Track>
    </Composition>
  );
}
`,
    );
    const v = await loadVideo(file);
    expect(v.state.errors).toEqual([]);
    const result = await whereThings({
      state: v.state,
      source: v.source,
      media: directoryResolver(dir, v.manifest),
      at: "1",
    });
    near(
      result.moments[0]?.things.find((t) => t.id === "fx/block"),
      100,
      300,
      120,
      60,
    );
  });

  it("the layout check reports a part by its name, once, at the place the file names it", async () => {
    const file = join(dir, "where.tsx");
    writeFileSync(file, VIDEO);
    const v = await loadVideo(file);
    const result = await checkLayout({
      state: v.state,
      media: directoryResolver(dir, v.manifest),
      source: { ...v.source, file: "where.tsx" },
      safeZone: "tiktok",
      step: 1,
    });
    const said = result.issues.map((i) => `${i.rule}:${i.id}${i.with ? `>${i.with}` : ""}`).sort();
    // The square past the right edge and the bar over the captions are reported as the parts they are. The layer
    // that drew them is not reported for the same things; the captions and the unnamed layer are, as before.
    expect(said).toEqual([
      "captions:diagram/low>said",
      "safe-zone:diagram/edge>tiktok",
      "safe-zone:diagram/low>tiktok",
      "safe-zone:plain>tiktok",
      "safe-zone:said>tiktok",
    ]);
    const edge = result.issues.find((i) => i.id === "diagram/edge");
    expect(edge?.message).toBe(
      'part "diagram/edge" sticks out of the tiktok safe zone on the right by 50 px, from 0.00 s to 1.00 s.',
    );
    expect(edge?.fix).toBe("move it left 50 px, in the layer's code where it is drawn");
    expect(edge?.source?.code).toContain('data-name="edge"');
    expect(formatLayout(result)).toContain("where.tsx:14:19: safe-zone:");
  });

  it("leaves out a part the code itself has hidden, and finds each layer's own part of a shared name", async () => {
    const file = join(dir, "twins.tsx");
    const text = `import { Composition, Layer, Track } from "@cutcraft/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={540} height={960} background={{ mode: "color", color: "#000000" }}>
      <Track id="t" layout="free">
        <Layer id="one" start={0} duration={2}>
          <div data-name="tag" style={{ position: "absolute", left: 500, top: 300, width: 30, height: 30, background: "#ffffff" }} />
          <div data-name="ghost" style={{ position: "absolute", left: 200, top: 300, width: 30, height: 30, background: "#ffffff", visibility: "hidden" }} />
        </Layer>
        <Layer id="two" start={0} duration={2}>
          <div data-name="tag" style={{ position: "absolute", left: 500, top: 500, width: 30, height: 30, background: "#ffffff" }} />
        </Layer>
      </Track>
    </Composition>
  );
}
`;
    writeFileSync(file, text);
    const v = await loadVideo(file);
    expect(v.state.errors).toEqual([]);
    const media = directoryResolver(dir, v.manifest);
    const report = await whereThings({ state: v.state, source: v.source, media, at: "1" });
    expect(report.moments[0]?.things.map((t) => t.id).sort()).toEqual(["one", "one/tag", "two", "two/tag"]);
    const result = await checkLayout({
      state: v.state,
      media,
      source: { ...v.source, file: "twins.tsx" },
      safeZone: "tiktok",
      step: 1,
    });
    const line = (id: string) => result.issues.find((i) => i.id === id)?.source?.line;
    const lines = text.split("\n");
    expect(lines[(line("one/tag") as number) - 1]).toContain("top: 300");
    expect(lines[(line("two/tag") as number) - 1]).toContain("top: 500");
  });
});
