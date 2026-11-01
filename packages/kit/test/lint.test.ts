import { describe, expect, it } from "vitest";
import { buildSourceIndex, lint } from "@cutcut/kit/source";
import { fixtureText, manifest } from "./helpers";

const wrap = (body: string, extra = "") => `
import { Composition, Track, Clip, Layer, Title, Transition, Effect, AudioEffect, Adjustment, SpeedKey, Freeze, Mask, ColorGrade, Keyframe } from "@cutcut/kit";
${extra}
export default function V() {
  return (<Composition fps={30} width={1920} height={1080}>${body}</Composition>);
}
`;

describe("lint", () => {
  it("accepts the sample file, warning only about the gap on its main track and what does not render", () => {
    const d = lint(fixtureText, { manifest });
    expect(d.filter((x) => x.rule !== "not-rendered").map((x) => `${x.severity}:${x.rule}:${x.id}`)).toEqual(["warning:sequence-gap:g1"]);
    expect(d.filter((x) => x.rule === "not-rendered").map((x) => x.id)).toEqual(["st1", "adj1", "ae1"]);
  });

  it("flags missing and non-literal ids", () => {
    const d = lint(wrap('<Track id="t"><Clip src="asset:city" /><Clip id={"c" + 1} src="asset:city" /></Track>'));
    expect(d.filter((x) => x.rule === "literal-ids")).toHaveLength(2);
  });

  it("flags duplicate ids and start on sequence tracks", () => {
    const d = lint(wrap('<Track id="t"><Clip id="c" src="asset:city" start={1} /><Clip id="d" src="asset:city" /><Clip id="d" src="asset:city" /></Track>'));
    expect(d.map((x) => x.rule).sort()).toEqual(["no-start-on-sequence", "unique-ids"]);
  });

  it("flags impure helpers and ambiguous durations, warns on expression timing", () => {
    const d = lint(wrap('<Track id="t"><Clip id="c" src="asset:city" out={4} duration={3} in={x} /></Track>', "const x = 1;\nfunction H() { const [s] = useState(0); return <Title id=\"h\">{s}</Title>; }\nimport { useState } from \"react\";"));
    expect(d.map((x) => `${x.severity}:${x.rule}`).sort()).toEqual(["error:ambiguous-duration", "error:pure-helpers", "warning:expression-locked"]);
  });

  it("lets a Layer interior call useT and useLayer but no other hook", () => {
    const text = wrap('<Track id="t"><Layer id="l" duration={3}><Clock /></Layer></Track>', 'import { useLayer } from "@cutcut/kit";\nfunction Clock() { const { remaining } = useLayer(); return <div>{Math.ceil(remaining)}</div>; }');
    expect(lint(text).filter((d) => d.rule === "pure-helpers")).toEqual([]);
  });

  it("checks assets against the manifest and the file shape", () => {
    const d = lint(wrap('<Track id="t"><Clip id="c" src="asset:missing" /></Track>', "export const schema = 1;"), { manifest });
    expect(d.map((x) => x.rule).sort()).toEqual(["file-shape", "missing-asset"]);
  });

  it("warns on gaps on the first sequence track only", () => {
    const gap = (track: string) => `<Track id="${track}"><Clip id="c-${track}" src="asset:city" duration={2} /><Gap id="g-${track}" duration={1} /></Track>`;
    const d = lint(wrap(`${gap("a")}${gap("b")}`).replace("Clip, Title", "Clip, Gap, Title"));
    expect(d.map((x) => `${x.rule}:${x.id}`)).toEqual(["sequence-gap:g-a"]);
    const free = lint(wrap(`<Track id="z" layout="free">${""}</Track>${gap("hid").replace('id="hid"', 'id="hid" hidden')}${gap("a")}`).replace("Clip, Title", "Clip, Gap, Title"));
    expect(free.map((x) => `${x.rule}:${x.id}`)).toEqual(["sequence-gap:g-a"]);
  });

  it("warns on numeric trims that land inside a transcript word", () => {
    const words = manifest.assets.interview!.transcript!.words;
    const w = words[1]!;
    const inside = (w.start + w.end) / 2;
    const d = lint(wrap(`<Track id="t"><Clip id="c" src="asset:interview" in={${inside}} out={${w.end}} /><Clip id="d" src="asset:city" in={${inside}} /></Track>`), { manifest });
    expect(d.map((x) => `${x.rule}:${x.id}.${x.prop}`)).toEqual(["cut-inside-word:c.in"]);
    expect(d[0]!.message).toContain(`word:${w.i}`);
    expect(lint(wrap(`<Track id="t"><Clip id="c" src="asset:interview" in={${inside}} /></Track>`))).toEqual([]);
  });

  it("warns on a cut a few frames off a source shot change, on the side that flashes the other shot", () => {
    // interview shots: 0–9.5, 9.5–21, 21–26, 26–60
    const near = (body: string) => lint(wrap(body), { manifest, rules: ["cut-near-shot"] }).map((d) => `${d.id}.${d.prop}`);
    expect(near('<Track id="t"><Clip id="c" src="asset:interview" in={9.4} out={21.1} /></Track>')).toEqual(["c.in", "c.out"]);
    const d = lint(wrap('<Track id="t"><Clip id="c" src="asset:interview" in={9.4} /></Track>'), { manifest, rules: ["cut-near-shot"] });
    expect(d[0]!.message).toContain('use in="shot:1"');
    // The safe side of the edge, exactly on it, or by reference: nothing to say.
    expect(near('<Track id="t"><Clip id="c" src="asset:interview" in={9.6} out={20.9} /><Clip id="d" src="asset:interview" in={9.5} out={21} /><Clip id="e" src="asset:interview" in="shot:1" out="shot:1.end" /></Track>')).toEqual([]);
    expect(near('<Track id="t"><Clip id="c" src="asset:city" in={1} /></Track>')).toEqual([]);
  });

  it("warns on one crop over a range the camera cuts inside", () => {
    const inside = (body: string) => lint(wrap(body), { manifest, rules: ["shot-change-inside-crop"] }).map((d) => `${d.id}.${d.prop}: ${d.message}`);
    const d = inside('<Track id="t"><Clip id="c" src="asset:interview" in={5} out={15} transform={{ crop: { x: 0, y: 0, width: 0.5, height: 1 } }} /></Track>');
    expect(d).toHaveLength(1);
    expect(d[0]).toContain("c.transform: ");
    expect(d[0]).toContain("shot:1 (9.5)");
    expect(inside('<Track id="t"><Clip id="c" src="asset:interview" in={5} out={15} /><Clip id="d" src="asset:interview" in="shot:1" out="shot:1.end" transform={{ crop: { x: 0, y: 0, width: 0.5, height: 1 } }} /></Track>')).toEqual([]);
  });

  it("warns when one track plays the same stretch of an asset twice", () => {
    const repeated = (body: string) => lint(wrap(body), { manifest, rules: ["repeated-source"] }).map((d) => d.id);
    expect(repeated('<Track id="t"><Clip id="a" src="asset:interview" in={0} out={9.5} /><Clip id="b" src="asset:interview" in={21} out={26} /><Clip id="c" src="asset:interview" in="shot:1" out="shot:1.end" /><Clip id="d" src="asset:interview" in={22} out={30} /></Track>')).toEqual(["d"]);
    // Adjacent ranges, another asset, or another track: not a repeat.
    expect(repeated('<Track id="t"><Clip id="a" src="asset:interview" in={0} out={9.5} /><Clip id="b" src="asset:interview" in={9.5} out={21} /><Clip id="c" src="asset:city" in={0} out={5} /></Track><Track id="u" layout="free"><Clip id="e" src="asset:interview" start={0} in={0} out={9.5} /></Track>')).toEqual([]);
  });

  describe("not-rendered", () => {
    const notRendered = (body: string) => lint(wrap(body)).filter((d) => d.rule === "not-rendered").map((d) => `${d.severity}:${d.id}.${d.prop ?? ""}: ${d.message}`);

    it("warns on enum values that draw as something else", () => {
      expect(notRendered('<Track id="t"><Clip id="a" src="asset:city" /><Transition id="x" type="glitch" /><Clip id="b" src="asset:city" /></Track>'))
        .toEqual(['warning:x.type: "x" <Transition> type "glitch" draws as a crossfade']);
      expect(notRendered('<Track id="t"><Clip id="c" src="asset:city"><Effect id="v" type="glow" /><AudioEffect id="r" type="reverb" /></Clip></Track>'))
        .toEqual(['warning:v.type: "v" <Effect> type "glow" is ignored: the picture renders without it', 'warning:r.type: "r" <AudioEffect> type "reverb" is ignored: the audio plays without it']);
      expect(notRendered('<Track id="t"><Title id="h" animation={{ preset: "bounce" }}>Hi</Title></Track>')).toEqual(['warning:h.animation: "h" <Title> animation.preset "bounce" shows as a fade']);
    });

    it("warns on accepted props that are ignored, but not on values that ask for nothing", () => {
      expect(notRendered('<Track id="t"><Clip id="c" src="asset:city" reverse emphasis="pulse" chromaKey={{ color: "#0f0" }} transform={{ rotate3d: { x: 0, y: 1, z: 0 } }} /></Track>').map((d) => d.split(":")[1]))
        .toEqual(["c.emphasis", "c.chromaKey", "c.transform"]);
      expect(notRendered('<Track id="t"><Clip id="c" src="asset:city" reverse={false} emphasis="none" audioTrack={0} /><Adjustment id="a" affects="all" duration={1} /></Track>')).toEqual([]);
      expect(notRendered('<Track id="t"><Adjustment id="a" affects={["c"]} duration={1} /></Track>')).toHaveLength(1);
    });

    it("warns on SpeedKey and Freeze inside a Nested only, and on masks that do not render", () => {
      const d = notRendered(`<Track id="t">
        <Clip id="c" src="asset:city"><SpeedKey id="s" at={1} speed={2} /><Freeze id="f" at={1} start={0} duration={1} /><Mask id="m1" /><Mask id="m2" /><Mask id="m3" type="matte" matte={{ source: "c" }} /></Clip>
        <Title id="h">Hi<Mask id="m4" /></Title>
        <Nested id="n" duration={3}><SpeedKey id="ns" at={1} speed={2} /><Freeze id="nf" at={1} start={0} duration={1} /></Nested>
      </Track>`);
      expect(d.map((x) => x.split(":")[1])).toEqual(["m2.", "m3.", "m3.type", "m3.matte", "m4.", "ns.", "nf."]);
      expect(d[5]).toContain("is ignored inside <Nested>");
      expect(d[4]).toContain("masks render on clips and nested sequences only");
    });

    it("warns on a diagonal or soft wipe, which draws as a hard wipe to the left", () => {
      expect(notRendered('<Track id="t"><Clip id="a" src="asset:city" /><Transition id="x" type="wipe" params={{ direction: "diagonal", softness: 0.3 }} /><Clip id="b" src="asset:city" /></Track>').map((d) => d.split(":")[1]))
        .toEqual(["x.params", "x.params"]);
    });

    it("warns on a levels gamma, which has no filter form", () => {
      expect(notRendered('<Track id="t"><Clip id="c" src="asset:city"><Effect id="lv" type="levels" params={{ black: 0.1, gamma: 1.2 }} /></Clip></Track>'))
        .toEqual(['warning:lv.params: "lv" <Effect> params.gamma is ignored: levels render their black and white points only']);
    });

    it("warns on path keyframes and on keyframe handles and roving, which do not render", () => {
      expect(notRendered('<Track id="t"><Clip id="c" src="asset:city"><Keyframe id="p" property="path" at={0} value="M0 0" /><Keyframe id="h" property="transform.opacity" at={0} value={1} handles={{ in: { x: 0, y: 0 }, out: { x: 1, y: 1 } }} roving /><Keyframe id="f" property="effect.e.radius" at={0} value={2} /></Clip></Track>').map((d) => d.split(":")[1]))
        .toEqual(["p.property", "h.handles", "h.roving"]);
    });

    it("warns on an overlay's blend, which mixes with the footage in the export only", () => {
      expect(notRendered('<Track id="t"><Clip id="c" src="asset:city" blend="screen" /><Title id="h" blend="screen">Hi</Title><Title id="n" blend="normal">Hi</Title></Track>'))
        .toEqual(['warning:h.blend: "h" <Title> blend "screen" blends with the footage in the export only: the preview draws it unblended over the footage']);
    });

    it("says nothing about a file that only uses what renders", () => {
      expect(notRendered(`<Track id="t">
        <Clip id="a" src="asset:city" speed={2}><Effect id="e" type="blur" /><Effect id="tp" type="temperature" params={{ amount: 20 }} /><Effect id="tn" type="tint" params={{ amount: -10 }} /><Effect id="lv" type="levels" params={{ black: 0.05, white: 0.95 }} /><Effect id="vg" type="vignette" params={{ amount: 40 }} /><Effect id="gr" type="grain" /><ColorGrade id="g" temperature={20} /><Mask id="m" shape={{ rect: { x: 0, y: 0, width: 1, height: 1 } }} /><Keyframe id="k" property="transform.position.x" at={0} value={0} /></Clip>
        <Transition id="x" type="crossfade" />
        <Clip id="b" src="asset:city" />
        <Transition id="w" type="wipe" params={{ direction: "up" }} />
        <Clip id="b2" src="asset:city" />
        <Transition id="s" type="slide" params={{ direction: "right", pushOut: true }} />
        <Clip id="b3" src="asset:city" />
        <Transition id="d" type="dipToWhite" params={{ holdDuration: 0.2 }} />
        <Clip id="b4" src="asset:city" />
        <Title id="h" animation={{ preset: "fade" }}>Hi</Title>
      </Track>`)).toEqual([]);
    });
  });

  it("indexes elements with prop sites, locked props and schema bindings", () => {
    const index = buildSourceIndex(fixtureText);
    const c1 = index.elements.get("c1")!;
    expect(c1.kind).toBe("clip");
    expect(c1.props.get("in")?.literal).toBe("word:3");
    expect(c1.parent).toBe("main");
    expect(index.elements.get("t1")?.lockedProps).toEqual([]);
    expect(index.elements.get("t1")?.boundProps).toEqual({ color: "accent" });
    expect(index.defaults?.props.get("title")?.literal).toBe("Why we built it");
    expect(index.helpers.get("Badge")?.pure).toBe(true);
    expect(index.helpers.get("Counter")?.hooks).toEqual(["useT"]);
    expect(index.calls.filter((c) => c.helper === "Badge")).toHaveLength(2);
  });

  it("indexes a Layer's one component as its handles", () => {
    const l1 = buildSourceIndex(fixtureText).elements.get("l1")!;
    expect(l1.interior?.component).toBe("Counter");
    expect([...l1.interior!.props.keys()]).toEqual(["from", "to"]);
    expect(l1.interior?.props.get("to")?.literal).toBe(1200);
    expect(l1.lockedProps).toEqual([]);
    const bound = buildSourceIndex(wrap('<Track id="t"><Layer id="l" duration={2}><Clock total={limit} label="go" step={1 + 1} /></Layer></Track>', 'export const schema = 1;\nexport const defaults = { limit: 90 };\nfunction Clock() { return null; }').replace("export default function V() {", "export default function V({ limit }: { limit: number }) {")).elements.get("l")!;
    expect(bound.interior?.boundProps).toEqual({ total: "limit" });
    expect(bound.boundProps).toEqual({ "interior.total": "limit" });
    expect(bound.lockedProps).toEqual(["interior.step"]);
    const none = buildSourceIndex(wrap('<Track id="t"><Layer id="l" duration={2}><div><Clock /></div></Layer><Layer id="m" duration={2}><Clock /><Clock /></Layer></Track>', "function Clock() { return null; }"));
    expect(none.elements.get("l")?.interior).toBeUndefined();
    expect(none.elements.get("m")?.interior).toBeUndefined();
  });
});
