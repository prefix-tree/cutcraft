import { createElement as h } from "react";

import {
  type AssetManifest,
  Caption,
  Captions,
  Clip,
  Composition,
  collect,
  Keyframe,
  resolve,
  Shape,
  Svg,
  Title,
  Track,
} from "@cutcraft/kit";

import { manifest } from "../../../player/e2e/app/composition";
import { mediaDir } from "../../../player/e2e/gen-media";
import { checkLayout, directoryResolver, formatLayout, type LayoutIssue, subjectRects } from "../../src";
import { toSource } from "../helpers/jsx";

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  hgt: number,
  start = 0,
  duration = 1,
  children: unknown[] = [],
) =>
  h(
    Shape,
    {
      id,
      shape: "rectangle",
      width: w,
      height: hgt,
      fill: "#ff0000",
      start,
      duration,
      transform: { position: { x, y } },
    },
    ...(children as []),
  );

async function check(
  composition: ReturnType<typeof h>,
  m: AssetManifest = manifest,
  extra: Partial<Omit<Parameters<typeof checkLayout>[0], "source">> & {
    source?: { readonly file: string; readonly text: string };
  } = {},
) {
  const state = resolve(collect(composition), m);
  expect(state.errors).toEqual([]);
  // The page loads the file itself: the text given (for the source positions), or the composition written back.
  const { source, ...rest } = extra;
  return checkLayout({
    state,
    media: directoryResolver(mediaDir, m),
    source: { ...(source ?? { text: toSource(composition) }), manifest: m },
    ...rest,
  });
}

const brief = (issues: readonly LayoutIssue[]) =>
  issues.map((i) => `${i.rule}:${i.id}${i.with ? `>${i.with}` : ""}@${i.from.toFixed(2)}-${i.to.toFixed(2)}`);

describe("checkLayout", () => {
  it("reports frame edges, the safe zone and captions, as runs of samples", async () => {
    // 640×360 at 30 fps; title-safe keeps 32 px at the sides and 18 px top and bottom.
    const result = await check(
      h(
        Composition,
        { fps: 30, width: 640, height: 360 },
        h(
          Track,
          { id: "t", layout: "free" },
          box("fine", 0, -60, 60, 60),
          box("edge", 300, -60, 100, 100),
          box("margin", 290, -60, 40, 40),
          box("low", 0, 130, 400, 30, 0.5, 0.5),
          h(Title, { id: "hi", start: 0, duration: 1, size: 40 }, "Hi"),
        ),
        h(
          Captions,
          { id: "caps", style: { position: "bottom", size: 30 } },
          h(Caption, { id: "c1", start: 0, end: 1, text: "Hello world" }),
        ),
      ),
    );
    expect(result.samples).toBe(30);
    const issues = brief(result.issues);
    expect(issues).toContain("frame-edge:edge@0.00-0.97");
    expect(issues).toContain("safe-zone:margin>title-safe@0.00-0.97");
    expect(issues).toContain("captions:low>caps@0.50-0.97");
    expect(issues.filter((i) => i.includes(":fine") || i.includes(":hi") || i.includes(":caps"))).toEqual([]);
    expect(result.summary).toBe("3 layout issues on 3 elements in 30 samples (every frame, safe zone title-safe).");
  });

  it("says what is wrong and how to fix it, in words and transform props", async () => {
    const { issues } = await check(
      h(
        Composition,
        { fps: 10, width: 640, height: 360 },
        h(
          Track,
          { id: "t", layout: "free" },
          box("edge", 300, -60, 100, 100),
          box("wide", 0, 0, 700, 40),
          box("low", 0, 130, 400, 30),
        ),
        h(
          Captions,
          { id: "caps", style: { position: "bottom", size: 30 } },
          h(Caption, { id: "c1", start: 0, end: 1, text: "Hello world" }),
        ),
      ),
    );
    const edge = issues.find((i) => i.id === "edge")!;
    expect(edge).toMatchObject({
      rule: "frame-edge",
      at: 0,
      box: { x: 570, y: 70, w: 100, h: 100 },
      area: { x: 0, y: 0, w: 640, h: 360 },
    });
    expect(edge.message).toBe('shape "edge" runs off the frame on the right by 30 px, from 0.00 s to 0.90 s.');
    expect(edge.fix).toBe("move it left 30 px (transform.position.x -30)");
    expect(issues.find((i) => i.id === "wide")!.fix).toMatch(
      /^it is 700×40 px but the frame is 640×360: scale it to 0\.91 or less \(transform\.scale\)/,
    );
    const low = issues.find((i) => i.rule === "captions")!;
    expect(low.message).toBe('shape "low" covers captions "caps" from 0.00 s to 0.90 s.');
    expect(low.box.y).toBe(295);
    expect(low.fix).toMatch(/^move it (up|down) \d+ px \(transform\.position\.y [+-]\d+\), then check again/);
  });

  it("points each issue at its place in the JSX, as a compiler does", async () => {
    const text = [
      'import { Composition, Shape, Track } from "@cutcraft/kit";',
      "",
      "function Dot({ id }: { id: string }) {",
      '  return <Shape id={id} shape="circle" width={60} height={60} fill="#f00" start={0} duration={1} transform={{ position: { x: 300, y: 0 } }} />;',
      "}",
      "",
      "export default function Video() {",
      "  return (",
      '    <Composition id="v" fps={10} width={640} height={360}>',
      '      <Track id="t" layout="free">',
      '        <Shape id="edge" shape="rectangle" width={100} height={100} fill="#f00" start={0} duration={1} transform={{ position: { x: 300, y: -60 } }} />',
      '        <Dot id="d1" />',
      '        <Dot id="d2" />',
      "      </Track>",
      "    </Composition>",
      "  );",
      "}",
    ].join("\n");
    const Dot = ({ id }: { id: string }) =>
      h(Shape, {
        id,
        shape: "circle",
        width: 60,
        height: 60,
        fill: "#f00",
        start: 0,
        duration: 1,
        transform: { position: { x: 300, y: 0 } },
      });
    const el = h(
      Composition,
      { id: "v", fps: 10, width: 640, height: 360 },
      h(
        Track,
        { id: "t", layout: "free" },
        box("edge", 300, -60, 100, 100),
        h(Dot, { id: "d1" }),
        h(Dot, { id: "d2" }),
      ),
    );
    const result = await check(el, manifest, { source: { file: "video.tsx", text } });
    const edge = result.issues.find((i) => i.id === "edge")!;
    // The spot is the element's transform, which the fix edits.
    expect(edge.source).toMatchObject({
      file: "video.tsx",
      line: 11,
      column: text.split("\n")[10]!.indexOf("transform=") + 1,
    });
    const d2 = result.issues.find((i) => i.id === "d2")!;
    expect(d2.source).toMatchObject({ line: 13, column: 9, helper: "Dot" });
    const printed = formatLayout(result);
    expect(printed).toContain(
      `video.tsx:11:${edge.source!.column}: frame-edge: shape "edge" runs off the frame on the right by 30 px, from 0.00 s to 0.90 s.\n  11 | ${text.split("\n")[10]}\n     | ${" ".repeat(edge.source!.column - 1)}^\n  fix: move it left 30 px (transform.position.x -30)`,
    );
    expect(printed).toContain("^ made by Dot()");
    expect(printed.trimEnd().endsWith(result.summary)).toBe(true);
  });

  it("points an element a loop made at the JSX in the loop, and lists issues by line", async () => {
    const text = [
      'import { Composition, Shape, Track } from "@cutcraft/kit";',
      "export default function Video() {",
      "  return (",
      '    <Composition id="v" fps={10} width={640} height={360}>',
      '      <Track id="t" layout="free">',
      '        <Shape id="late" shape="rectangle" width={40} height={40} fill="#f00" start={0.5} duration={0.5} transform={{ position: { x: 330, y: 0 } }} />',
      "        {[0, 1].map((i) => (",
      '          <Shape key={i} id={`dot-${i}`} shape="circle" width={40} height={40} fill="#f00" start={0} duration={1} transform={{ position: { x: 200 + 130 * i, y: -60 } }} />',
      "        ))}",
      "        {[0, 1].map((i) => (",
      '          <Shape key={i} id={`bar-${i}`} shape="rectangle" width={40} height={10} fill="#00f" start={0} duration={1} transform={{ position: { x: -100 * i, y: 100 } }} />',
      "        ))}",
      "      </Track>",
      "    </Composition>",
      "  );",
      "}",
    ].join("\n");
    const el = h(
      Composition,
      { id: "v", fps: 10, width: 640, height: 360 },
      h(
        Track,
        { id: "t", layout: "free" },
        box("late", 330, 0, 40, 40, 0.5, 0.5),
        ...[0, 1].map((i) =>
          h(Shape, {
            key: `d${i}`,
            id: `dot-${i}`,
            shape: "circle",
            width: 40,
            height: 40,
            fill: "#f00",
            start: 0,
            duration: 1,
            transform: { position: { x: 200 + 130 * i, y: -60 } },
          }),
        ),
        ...[0, 1].map((i) =>
          h(Shape, {
            key: `b${i}`,
            id: `bar-${i}`,
            shape: "rectangle",
            width: 40,
            height: 10,
            fill: "#00f",
            start: 0,
            duration: 1,
            transform: { position: { x: -100 * i, y: 100 } },
          }),
        ),
      ),
    );
    const result = await check(el, manifest, { source: { file: "video.tsx", text } });
    // "late" breaks from 0.5 s and "dot-1" from 0 s, but "late" comes first in the file.
    expect(result.issues.map((i) => `${i.id}@${i.source?.line}`)).toEqual(["late@6", "dot-1@8"]);
    expect(result.issues[1]!.source).toMatchObject({ line: 8, column: 11, loop: true });
    expect(formatLayout(result)).toContain('^ made in a loop, as "dot-1"');
  });

  it("refuses a step or range that is not a number instead of checking nothing", async () => {
    const el = h(
      Composition,
      { fps: 10, width: 640, height: 360 },
      h(Track, { id: "t", layout: "free" }, box("a", 0, 0, 10, 10)),
    );
    await expect(check(el, manifest, { step: Number("0,5") })).rejects.toThrow(/step must be above 0 seconds, got NaN/);
    await expect(check(el, manifest, { from: Number("abc") })).rejects.toThrow(/from must be 0 or more/);
    await expect(check(el, manifest, { step: 0 })).rejects.toThrow(/step/);
  });

  it("catches what happens between samples a person would take: a slide into the edge", async () => {
    const result = await check(
      h(
        Composition,
        { fps: 30, width: 640, height: 360 },
        h(
          Track,
          { id: "t", layout: "free" },
          box("slide", 0, 0, 60, 60, 0, 2, [
            h(Keyframe, { id: "k1", property: "transform.position.x", at: 1, value: 0 }),
            h(Keyframe, { id: "k2", property: "transform.position.x", at: 2, value: 400 }),
          ]),
        ),
      ),
      manifest,
      { safeZone: { top: 0, right: 0, bottom: 0, left: 0 } },
    );
    const [edge] = result.issues;
    expect(result.issues).toHaveLength(1);
    // The right side (320 + x + 30) passes 640 once x > 290: 1.725 s into the ramp.
    expect(edge).toMatchObject({ rule: "frame-edge", id: "slide" });
    expect(edge!.from).toBeGreaterThan(1.68);
    expect(edge!.from).toBeLessThan(1.78);
    expect(edge!.to).toBeCloseTo(59 / 30);
  });

  it("names a platform zone, and leaves out backgrounds that fill the frame", async () => {
    // 360×640 vertical: TikTok's bottom 660/1920 is 220 px, so anything below y 420 is under its UI.
    const result = await check(
      h(
        Composition,
        { fps: 10, width: 360, height: 640 },
        h(Track, { id: "t", layout: "free" }, box("bg", 0, 0, 360, 640), box("cta", 0, 200, 200, 60)),
      ),
      manifest,
      { safeZone: "tiktok" },
    );
    expect(brief(result.issues)).toEqual(["safe-zone:cta>tiktok@0.00-0.90"]);
  });

  it("checks against the manifest's subject boxes through the clip's transform", async () => {
    const m: AssetManifest = {
      assets: {
        ...manifest.assets,
        bars: {
          ...manifest.assets.bars!,
          subjects: [
            { t: 0, x: 0.4, y: 0.2, w: 0.2, h: 0.5 },
            { t: 2, x: 0, y: 0, w: 0.1, h: 0.1 },
          ],
        },
      },
    };
    const el = h(
      Composition,
      { fps: 10, width: 640, height: 360 },
      h(Track, { id: "v" }, h(Clip, { id: "c", src: "asset:bars", in: 0, out: 2 })),
      h(Track, { id: "t", layout: "free" }, box("face", 0, 0, 40, 40), box("aside", -200, 0, 40, 40)),
    );
    const result = await check(el, m);
    // The second box (t 2) is nearer from 1 s on and sits in the top-left corner, clear of "face".
    expect(brief(result.issues)).toEqual(["subject:face>subject@0.00-0.90"]);

    // Scaled to half about the centre, the subject's box (256..384 × 72..252) halves too.
    const scaled = resolve(
      collect(
        h(
          Composition,
          { fps: 10, width: 640, height: 360 },
          h(Track, { id: "v" }, h(Clip, { id: "c", src: "asset:bars", in: 0, out: 2, transform: { scale: 0.5 } })),
        ),
      ),
      m,
    );
    const [r] = subjectRects(scaled, 0);
    expect(r!.x).toBeCloseTo(288);
    expect(r!.y).toBeCloseTo(126);
    expect(r!.w).toBeCloseTo(64);
    expect(r!.h).toBeCloseTo(90);
  });

  it("does not count a hollow frame around the subject as covering it", async () => {
    const el = h(
      Composition,
      { fps: 10, width: 640, height: 360 },
      h(Track, { id: "v" }, h(Clip, { id: "c", src: "asset:bars", in: 0, out: 1 })),
      h(
        Track,
        { id: "t", layout: "free" },
        // Corner brackets: four marks at the corners of a 300x260 box, hollow in the middle.
        h(Svg, {
          id: "brackets",
          start: 0,
          duration: 1,
          content:
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 260'><path d='M3 43V3H43M257 3H297V43M297 217V257H257M43 257H3V217' stroke='#ffffff' stroke-width='6' fill='none'/></svg>",
        }),
        box("solid", 0, 0, 40, 40),
      ),
    );
    // The subject fills the middle of the brackets, clear of their corner marks.
    const result = await check(el, manifest, { subject: { x: 0.35, y: 0.25, w: 0.3, h: 0.5 } });
    expect(brief(result.issues)).toEqual(["subject:solid>subject@0.00-0.90"]);
  });

  it("falls back to a given subject region while footage without subject boxes shows", async () => {
    const el = h(
      Composition,
      { fps: 10, width: 640, height: 360 },
      h(Track, { id: "v" }, h(Clip, { id: "c", src: "asset:bars", in: 0, out: 1 })),
      h(Track, { id: "t", layout: "free" }, box("face", 0, 0, 40, 40, 0, 2)),
    );
    const result = await check(el, manifest, { subject: { x: 0.3, y: 0.1, w: 0.4, h: 0.6 } });
    // The clip ends at 1 s; after it there is no footage, so no subject.
    expect(brief(result.issues)).toEqual(["subject:face>subject@0.00-0.90"]);
  });
});
