// A prop the player never reads is not in the schema: writing it is an error that names it, where it used to be
// taken and silently ignored. The capability table says what the resolver and the player accept.
import { describe, expect, it } from "vitest";

import { capabilitiesOf } from "@uberscene/kit/schema";
import { collectModule, loadModule, type ResolvedState, resolve } from "@uberscene/sdk";

import { fixtureExecutor } from "./helpers";

const manifest = {
  assets: {
    shot: { id: "shot", kind: "video" as const, duration: 20, fps: 30, width: 1920, height: 1080 },
    logo: { id: "logo", kind: "image" as const, duration: 0, width: 256, height: 256 },
  },
};

/** A video of one free track holding `body`, with `outside` beside the track. */
function resolved(body: string, outside = ""): ResolvedState {
  const text = `import { Adjustment, Captions, Caption, Clip, Composition, Mask, Nested, Shape, Sticker, Svg, Title, Track } from "@uberscene/kit";
function Inner() {
  return (
    <Track id="inner-main">
      <Clip id="inner-clip" src="asset:shot" in={0} out={2} />
    </Track>
  );
}
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="t" layout="free">
        ${body}
      </Track>
      ${outside}
    </Composition>
  );
}
`;
  return resolve(collectModule(loadModule(text) as never), manifest);
}

/** The schema errors on `id`, as `prop: message`. */
const schemaErrors = (state: ResolvedState, id: string): string[] =>
  state.errors.filter((e) => e.id === id && e.code === "SCHEMA").map((e) => `${e.prop ?? ""}: ${e.message}`);

describe("props the player never read are refused by name", () => {
  const refused: readonly [what: string, id: string, body: string, names: RegExp, outside?: string][] = [
    ["fit on a title", "x", `<Title id="x" start={0} duration={2} fit="cover">Hi</Title>`, /"fit"/],
    [
      "blendOpacity on a title",
      "x",
      `<Title id="x" start={0} duration={2} blendOpacity={0.5}>Hi</Title>`,
      /"blendOpacity"/,
    ],
    ["fit on a shape", "x", `<Shape id="x" start={0} duration={2} shape="rectangle" fit="cover" />`, /"fit"/],
    [
      "blendOpacity on a shape",
      "x",
      `<Shape id="x" start={0} duration={2} shape="rectangle" blendOpacity={0.5} />`,
      /"blendOpacity"/,
    ],
    ["fit on a sticker", "x", `<Sticker id="x" start={0} duration={2} src="asset:logo" fit="cover" />`, /"fit"/],
    [
      "blendOpacity on a sticker",
      "x",
      `<Sticker id="x" start={0} duration={2} src="asset:logo" blendOpacity={0.5} />`,
      /"blendOpacity"/,
    ],
    [
      "blendOpacity on an svg",
      "x",
      `<Svg id="x" start={0} duration={2} content="<svg/>" blendOpacity={0.5} />`,
      /"blendOpacity"/,
    ],
    [
      "transform on an adjustment",
      "x",
      `<Adjustment id="x" start={0} duration={2} transform={{ scale: 0.5 }} />`,
      /"transform"/,
    ],
    [
      "expansion on a mask",
      "m",
      `<Clip id="c" src="asset:shot" in={0} out={2}><Mask id="m" shape={{ ellipse: { cx: 9, cy: 9, rx: 5, ry: 5 } }} expansion={4} /></Clip>`,
      /"expansion"/,
    ],
    [
      "easing on a mask",
      "m",
      `<Clip id="c" src="asset:shot" in={0} out={2}><Mask id="m" shape={{ ellipse: { cx: 9, cy: 9, rx: 5, ry: 5 } }} easing="linear" /></Clip>`,
      /"easing"/,
    ],
    [
      "a unit on a title's animation",
      "x",
      `<Title id="x" start={0} duration={2} animation={{ preset: "fade", unit: "word" }}>Hi</Title>`,
      /^animation: .*"unit"/,
    ],
    [
      "params on a title's animation",
      "x",
      `<Title id="x" start={0} duration={2} animation={{ preset: "fade", params: { a: 1 } }}>Hi</Title>`,
      /^animation: .*"params"/,
    ],
    [
      "a spread on a title's shadow",
      "x",
      `<Title id="x" start={0} duration={2} style={{ shadow: { color: "#000", spread: 4 } }}>Hi</Title>`,
      /^style\.shadow: .*"spread"/,
    ],
    [
      "an inner shadow on a title",
      "x",
      `<Title id="x" start={0} duration={2} style={{ shadow: { color: "#000", inset: true } }}>Hi</Title>`,
      /^style\.shadow: .*"inset"/,
    ],
    [
      "a spread on a caption shadow",
      "caps",
      "",
      /^style\.shadow: .*"spread"/,
      `<Captions id="caps" style={{ shadow: { color: "#000", spread: 4 } }}><Caption id="cue" start={0} end={1} text="Hi" /></Captions>`,
    ],
  ];

  it.each(refused)("%s", (_what, id, body, names, outside) => {
    const state = resolved(body, outside);
    const errors = schemaErrors(state, id);
    expect(
      errors.some((e) => names.test(e)),
      errors.join(" | "),
    ).toBe(true);
    // The element is still placed, as if the prop had not been written.
    expect(state.items.has(id)).toBe(true);
  });

  it("keeps the same props where they are drawn", () => {
    const state = resolved(
      `<Clip id="c" src="asset:shot" in={0} out={2} start={0} fit="cover" blend="screen" blendOpacity={0.5}>
          <Mask id="m" shape={{ ellipse: { cx: 9, cy: 9, rx: 5, ry: 5 } }} feather={8} inverted opacity={0.8} />
        </Clip>
        <Nested id="n" of={Inner} start={2} duration={2} fit="contain" blendOpacity={0.5} />
        <Svg id="s" start={0} duration={2} content="<svg/>" fit="contain" blend="multiply" />
        <Shape id="sh" start={0} duration={2} shape="rectangle" blend="screen" shadow={{ color: "#000", spread: 4 }} />
        <Title id="ti" start={0} duration={2} blend="screen" style={{ shadow: { color: "#000", blur: 6, x: 2, y: 2 } }} animation={{ preset: "word-by-word", in: 1, stagger: 0.1 }}>Hi</Title>
        <Adjustment id="a" start={0} duration={2} opacity={0.5} blend="screen" />`,
    );
    expect(state.errors).toEqual([]);
  });
});

describe("the capability table", () => {
  it("puts a multicam on a track, where the resolver takes it, and not in the composition", () => {
    expect(capabilitiesOf("multicam").placementScope).toBe("track");
    expect(capabilitiesOf("composition").childKinds).not.toContain("multicam");
    expect(capabilitiesOf("track").childKinds).toContain("multicam");
  });

  it("gives an adjustment no source to trim, and a mask no children", () => {
    expect(capabilitiesOf("adjustment").trimSource).toBe(false);
    expect(capabilitiesOf("adjustment").transformable).toBe(false);
    expect(capabilitiesOf("mask").childKinds).toEqual([]);
    expect(capabilitiesOf("mask").container).toBe(false);
  });

  it("lets a sound ramp and freeze, as the resolver and the mixer already do", () => {
    expect(capabilitiesOf("audio").childKinds).toEqual(["keyframe", "speedKey", "freeze"]);
  });
});

describe("the actions follow the schemas", () => {
  it("clip/setBlend sets a mode on anything that draws, and an opacity only on a clip or a nested sequence", () => {
    const exec = fixtureExecutor();
    const title = [...exec.state().items.values()].find((p) => p.kind === "title")!;
    const clip = [...exec.state().items.values()].find((p) => p.kind === "clip")!;
    expect(exec.can({ type: "clip/setBlend", params: { id: title.id, mode: "screen" } }).ok).toBe(true);
    const refused = exec.can({ type: "clip/setBlend", params: { id: title.id, opacity: 0.5 } });
    expect(refused.ok).toBe(false);
    expect(refused.errors?.[0]).toMatchObject({ code: "INVALID_PARAMS", path: "opacity" });
    expect(exec.can({ type: "clip/setBlend", params: { id: clip.id, mode: "screen", opacity: 0.5 } }).ok).toBe(true);
  });

  it("transform/update does not apply to an adjustment, which has no transform", () => {
    const exec = fixtureExecutor();
    const adjustment = [...exec.state().items.values()].find((p) => p.kind === "adjustment")!;
    const refused = exec.can({ type: "transform/update", params: { id: adjustment.id, transform: { scale: 0.5 } } });
    expect(refused.ok).toBe(false);
    expect(refused.errors?.[0]?.message).toMatch(/does not apply to <adjustment>/);
  });

  it("element/remove still leaves a multicam to multicam/remove", () => {
    const exec = fixtureExecutor();
    expect(exec.state().items.get("mc1")?.kind).toBe("multicam");
    expect(exec.can({ type: "element/remove", params: { id: "mc1" } }).ok).toBe(false);
    expect(exec.can({ type: "multicam/remove", params: { id: "mc1" } }).ok).toBe(true);
  });
});
