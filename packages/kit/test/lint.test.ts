import { describe, expect, it } from "vitest";
import { buildSourceIndex, lint } from "@cutcut/kit/source";
import { fixtureText, manifest } from "./helpers";

const wrap = (body: string, extra = "") => `
import { Composition, Track, Clip, Title } from "@cutcut/kit";
${extra}
export default function V() {
  return (<Composition fps={30} width={1920} height={1080}>${body}</Composition>);
}
`;

describe("lint", () => {
  it("accepts the sample file, warning only about the gap on its main track", () => {
    const d = lint(fixtureText, { manifest });
    expect(d.map((x) => `${x.severity}:${x.rule}:${x.id}`)).toEqual(["warning:sequence-gap:g1"]);
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
    const text = wrap('<Track id="t"><Layer id="l" duration={3}><Clock /></Layer></Track>', 'import { Layer, useLayer } from "@cutcut/kit";\nfunction Clock() { const { remaining } = useLayer(); return <div>{Math.ceil(remaining)}</div>; }');
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
});
