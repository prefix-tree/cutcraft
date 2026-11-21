import { describe, expect, it } from "vitest";

import { buildSourceIndex, collectModule, fixSource, lint, loadModule, resolve } from "@uberscene/sdk";

import { fixtureText, manifest } from "./helpers";

const wrap = (body: string, extra = "") => `
import { Composition, Track, Clip, Layer, Title, Transition, Adjustment, Mask } from "@uberscene/kit";
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
    const d = lint(
      wrap(
        '<Track id="t"><Clip id="c" src="asset:city" start={1} /><Clip id="d" src="asset:city" /><Clip id="d" src="asset:city" /></Track>',
      ),
    );
    expect(d.map((x) => x.rule).sort()).toEqual(["no-start-on-sequence", "unique-ids"]);
  });

  it("flags impure helpers and ambiguous durations, warns on expression timing", () => {
    const d = lint(
      wrap(
        '<Track id="t"><Clip id="c" src="asset:city" out={4} duration={3} in={x} /></Track>',
        'const x = 1;\nfunction H() { const [s] = useState(0); return <Title id="h">{s}</Title>; }\nimport { useState } from "react";',
      ),
    );
    expect(d.map((x) => `${x.severity}:${x.rule}`).sort()).toEqual([
      "error:ambiguous-duration",
      "error:pure-helpers",
      "warning:expression-locked",
    ]);
  });

  it("lets free code in a Layer use any hook, HTML ids and libraries", () => {
    const extra = [
      'import { useEffect, useRef } from "react";',
      'import { useT } from "@uberscene/kit";',
      'function Scene() { const t = useT(); const ref = useRef(null); useEffect(() => {}, [t]); return <div id="stage"><canvas ref={ref} id="stage-2" /><Spark /></div>; }',
      'function Spark() { const [x] = useState(0); return <div id="stage">{x}</div>; }',
      'import { useState } from "react";',
    ].join("\n");
    const d = lint(wrap('<Track id="t"><Layer id="l" duration={3}><Scene /></Layer></Track>', extra));
    expect(d.filter((x) => ["pure-helpers", "unique-ids", "stray-html", "free-code-clock"].includes(x.rule))).toEqual(
      [],
    );
  });

  it("warns about HTML straight in a track, where nothing draws it", () => {
    const d = lint(wrap('<Track id="t"><Clip id="c" src="asset:city" /><div>lost</div></Track>'));
    expect(d.filter((x) => x.rule === "stray-html").map((x) => x.message)).toEqual([
      expect.stringContaining("put free code inside a <Layer>"),
    ]);
  });

  it("warns about free code that runs off the video's clock", () => {
    const extra =
      'function Bad() { setTimeout(() => {}, 10); const c = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); return <video src="x.mp4" />; }';
    const d = lint(wrap('<Track id="t"><Layer id="l" duration={3}><Bad /></Layer></Track>', extra));
    expect(d.filter((x) => x.rule === "free-code-clock").map((x) => x.message.split(" ")[0])).toEqual([
      "setTimeout",
      "a",
      "<video>",
    ]);
  });

  it("warns about Math.random and about clock globals reached through window", () => {
    const extra = [
      'import { random } from "@uberscene/kit";',
      "function Bad() { const x = Math.random(); window.requestAnimationFrame(() => {}); const t = globalThis.performance.now(); return <div>{x + t}</div>; }",
      "function Good() { const x = random(7); requestAnimationFrame(() => {}); return <div>{x + performance.now() + Math.floor(1.5)}</div>; }",
    ].join("\n");
    const d = lint(wrap('<Track id="t"><Layer id="l" duration={3}><Bad /><Good /></Layer></Track>', extra));
    expect(d.filter((x) => x.rule === "free-code-clock").map((x) => x.message.split(" ")[0])).toEqual([
      "Math.random()",
      "window.requestAnimationFrame",
      "globalThis.performance",
    ]);
  });

  it("warns about three.js and Motion on their own clocks, and names the adapter", () => {
    const extra = [
      'import { Canvas } from "@react-three/fiber";',
      'import { motion, animate as play } from "motion/react";',
      'function Bad() { play("#x", { opacity: 1 }); return <div><Canvas /><motion.div animate={{ x: 10 }} /><motion.div style={{ x: 1 }} /></div>; }',
    ].join("\n");
    const d = lint(wrap('<Track id="t"><Layer id="l" duration={3}><Bad /></Layer></Track>', extra));
    expect(d.filter((x) => x.rule === "free-code-clock").map((x) => x.message.split(";")[1]?.trim())).toEqual([
      "use useTimeline or useLayerTime from @uberscene/graphics/motion",
      "use <ThreeScene> from @uberscene/graphics/three",
      "drive it with useTimeline or useLayerTime from @uberscene/graphics/motion",
    ]);
  });

  it("lets three.js and Motion run through the adapters", () => {
    const extra = [
      'import { ThreeScene } from "@uberscene/graphics/three";',
      'import { useTimeline, useLayerTime } from "@uberscene/graphics/motion";',
      'import { motion, useTransform } from "motion/react";',
      "function Good() { const scope = useTimeline([]); const x = useTransform(useLayerTime(), [0, 1], [0, 9]); return <div ref={scope}><ThreeScene /><motion.div style={{ x }} /></div>; }",
    ].join("\n");
    const d = lint(wrap('<Track id="t"><Layer id="l" duration={3}><Good /></Layer></Track>', extra));
    expect(d.filter((x) => x.rule === "free-code-clock")).toEqual([]);
  });

  it("finds an element's parent through the HTML it is wrapped in, as the resolver does", () => {
    const index = buildSourceIndex(wrap('<Track id="t"><div><Clip id="c" src="asset:city" /></div></Track>'));
    expect(index.elements.get("c")?.parent).toBe("t");
  });

  it("checks assets against the manifest and the file shape", () => {
    const d = lint(wrap('<Track id="t"><Clip id="c" src="asset:missing" /></Track>', "export const schema = 1;"), {
      manifest,
    });
    expect(d.map((x) => x.rule).sort()).toEqual(["file-shape", "missing-asset"]);
  });

  it("warns on gaps on the first sequence track only", () => {
    const gap = (track: string) =>
      `<Track id="${track}"><Clip id="c-${track}" src="asset:city" duration={2} /><Gap id="g-${track}" duration={1} /></Track>`;
    const d = lint(wrap(`${gap("a")}${gap("b")}`).replace("Clip, Title", "Clip, Gap, Title"));
    expect(d.map((x) => `${x.rule}:${x.id}`)).toEqual(["sequence-gap:g-a"]);
    const free = lint(
      wrap(
        `<Track id="z" layout="free">${""}</Track>${gap("hid").replace('id="hid"', 'id="hid" hidden')}${gap("a")}`,
      ).replace("Clip, Title", "Clip, Gap, Title"),
    );
    expect(free.map((x) => `${x.rule}:${x.id}`)).toEqual(["sequence-gap:g-a"]);
  });

  it("warns on numeric trims that land inside a transcript word", () => {
    const words = manifest.assets.interview!.transcript!.words;
    const w = words[1]!;
    const inside = (w.start + w.end) / 2;
    const d = lint(
      wrap(
        `<Track id="t"><Clip id="c" src="asset:interview" in={${inside}} out={${w.end}} /><Clip id="d" src="asset:city" in={${inside}} /></Track>`,
      ),
      { manifest },
    );
    expect(d.map((x) => `${x.rule}:${x.id}.${x.prop}`)).toEqual(["cut-inside-word:c.in"]);
    expect(d[0]!.message).toContain(`word:${w.i}`);
    expect(lint(wrap(`<Track id="t"><Clip id="c" src="asset:interview" in={${inside}} /></Track>`))).toEqual([]);
  });

  it("warns on a cut a few frames off a source shot change, on the side that flashes the other shot", () => {
    // interview shots: 0–9.5, 9.5–21, 21–26, 26–60
    const near = (body: string) =>
      lint(wrap(body), { manifest, rules: ["cut-near-shot"] }).map((d) => `${d.id}.${d.prop}`);
    expect(near('<Track id="t"><Clip id="c" src="asset:interview" in={9.4} out={21.1} /></Track>')).toEqual([
      "c.in",
      "c.out",
    ]);
    const d = lint(wrap('<Track id="t"><Clip id="c" src="asset:interview" in={9.4} /></Track>'), {
      manifest,
      rules: ["cut-near-shot"],
    });
    expect(d[0]!.message).toContain('use in="shot:1"');
    // The safe side of the edge, exactly on it, or by reference: nothing to say.
    expect(
      near(
        '<Track id="t"><Clip id="c" src="asset:interview" in={9.6} out={20.9} /><Clip id="d" src="asset:interview" in={9.5} out={21} /><Clip id="e" src="asset:interview" in="shot:1" out="shot:1.end" /></Track>',
      ),
    ).toEqual([]);
    expect(near('<Track id="t"><Clip id="c" src="asset:city" in={1} /></Track>')).toEqual([]);
  });

  it("warns on one crop over a range the camera cuts inside", () => {
    const inside = (body: string) =>
      lint(wrap(body), { manifest, rules: ["shot-change-inside-crop"] }).map((d) => `${d.id}.${d.prop}: ${d.message}`);
    const d = inside(
      '<Track id="t"><Clip id="c" src="asset:interview" in={5} out={15} transform={{ crop: { x: 0, y: 0, width: 0.5, height: 1 } }} /></Track>',
    );
    expect(d).toHaveLength(1);
    expect(d[0]).toContain("c.transform: ");
    expect(d[0]).toContain("shot:1 (9.5)");
    expect(
      inside(
        '<Track id="t"><Clip id="c" src="asset:interview" in={5} out={15} /><Clip id="d" src="asset:interview" in="shot:1" out="shot:1.end" transform={{ crop: { x: 0, y: 0, width: 0.5, height: 1 } }} /></Track>',
      ),
    ).toEqual([]);
  });

  it("warns when one track plays the same stretch of an asset twice", () => {
    const repeated = (body: string) => lint(wrap(body), { manifest, rules: ["repeated-source"] }).map((d) => d.id);
    expect(
      repeated(
        '<Track id="t"><Clip id="a" src="asset:interview" in={0} out={9.5} /><Clip id="b" src="asset:interview" in={21} out={26} /><Clip id="c" src="asset:interview" in="shot:1" out="shot:1.end" /><Clip id="d" src="asset:interview" in={22} out={30} /></Track>',
      ),
    ).toEqual(["d"]);
    // Adjacent ranges, another asset, or another track: not a repeat.
    expect(
      repeated(
        '<Track id="t"><Clip id="a" src="asset:interview" in={0} out={9.5} /><Clip id="b" src="asset:interview" in={9.5} out={21} /><Clip id="c" src="asset:city" in={0} out={5} /></Track><Track id="u" layout="free"><Clip id="e" src="asset:interview" start={0} in={0} out={9.5} /></Track>',
      ),
    ).toEqual([]);
  });

  describe("not-rendered", () => {
    const notRendered = (body: string) =>
      lint(wrap(body))
        .filter((d) => d.rule === "not-rendered")
        .map((d) => `${d.severity}:${d.id}.${d.prop ?? ""}: ${d.message}`);

    it("warns on a second mask or one on a title, and not on a clip's speed keys and freezes", () => {
      const d = notRendered(`<Track id="t">
        <Clip id="c" src="asset:city" speed={[{ at: 1, value: 2 }]} freezes={[{ at: 0, duration: 1, source: 1 }]}><Mask id="m1" /><Mask id="m2" /></Clip>
        <Title id="h">Hi<Mask id="m4" /></Title>
      </Track>`);
      expect(d.map((x) => x.split(":")[1])).toEqual(["m2.", "m4."]);
      expect(d[1]).toContain("masks render on clips and nested sequences only");
    });

    it("leaves a levels gamma alone, which the shader draws", () => {
      expect(
        notRendered(
          '<Track id="t"><Clip id="c" src="asset:city" effects={[{ type: "levels", black: 0.1, gamma: 1.2 }]} /></Track>',
        ),
      ).toEqual([]);
    });

    it("warns on an overlay's blend, which mixes with the footage in the export only", () => {
      expect(
        notRendered(
          '<Track id="t"><Clip id="c" src="asset:city" blend="screen" /><Title id="h" blend="screen">Hi</Title><Title id="n" blend="normal">Hi</Title></Track>',
        ),
      ).toEqual([
        'warning:h.blend: "h" <Title> blend "screen" is drawn unblended over the footage, in the preview and the export',
      ]);
    });

    it("warns on vignette and grain on an overlay, and not on a clip or an adjustment", () => {
      expect(
        notRendered(`<Track id="t">
        <Clip id="c" src="asset:city" effects={[{ type: "vignette" }]} />
        <Adjustment id="a" start={0} duration={1} effects={[{ type: "vignette" }, { type: "grain" }]} />
        <Title id="h" effects={[{ type: "vignette" }, { type: "grain" }, { type: "blur" }]}>Hi</Title>
      </Track>`),
      ).toEqual([
        'warning:h.effects: "h" <Title> effect 0 "vignette" is not drawn on an overlay yet: put it on the clip, or on an <Adjustment> to cover everything beneath',
        'warning:h.effects: "h" <Title> effect 1 "grain" is not drawn on an overlay yet: put it on the clip, or on an <Adjustment> to cover everything beneath',
      ]);
    });

    it("says nothing about a file that only uses what renders", () => {
      expect(
        notRendered(`<Track id="t">
        <Clip id="a" src="asset:city" speed={2} box={{ x: [{ at: 0, value: 0 }] }} effects={[
          { type: "blur" },
          { type: "whiteBalance", temperature: 0.2, tint: -0.1 },
          { type: "levels", black: 0.05, white: 0.95 },
          { type: "vignette", amount: 0.4 },
          { type: "grain" },
        ]}><Mask id="m" shape={{ rect: { x: 0, y: 0, width: 1, height: 1 } }} /></Clip>
        <Transition id="x" type="crossfade" />
        <Clip id="b" src="asset:city" />
        <Transition id="w" type="wipe" params={{ direction: "up" }} />
        <Clip id="b2" src="asset:city" />
        <Transition id="s" type="slide" params={{ direction: "right", pushOut: true }} />
        <Clip id="b3" src="asset:city" />
        <Transition id="d" type="dipToWhite" params={{ holdDuration: 0.2 }} />
        <Clip id="b4" src="asset:city" />
        <Title id="h" animation={{ preset: "fade" }}>Hi</Title>
      </Track>`),
      ).toEqual([]);
    });
  });

  describe("everything-is-a-prop", () => {
    // The old spelling: keys, effects, speed keys and holds as children, sound keys as automation.
    const OLD = `import { Audio, Clip, Composition, Effect, Freeze, Keyframe, SpeedKey, Track } from "@uberscene/kit";

export default function V() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="c" src="asset:city" in={0} out={6} transform={{ scale: 1.1 }}>
          <Keyframe id="k1" property="transform.opacity" at={0} value={0} />
          <Keyframe id="k2" property="transform.opacity" at={0.5} value={1} easing="ease-out" />
          <Effect id="fx" type="blur" params={{ radius: 2 }}>
            <Keyframe id="fk1" param="radius" at={0} value={0} />
            <Keyframe id="fk2" param="radius" at={1} value={4} />
          </Effect>
          <Effect id="lv" type="levels" params={{ gamma: 1.2 }} enabled={false} />
          <SpeedKey id="s1" at={0} speed={1} />
          <SpeedKey id="s2" at={2} speed={0.5} easing="easeInOutQuad" />
          <Freeze id="f1" at={1.5} start={3} duration={0.5} />
        </Clip>
      </Track>
      <Track id="music" layout="free">
        <Audio id="a" src="asset:bed" start={0} duration={4} volume={0.5} automation={{ volume: [[0, 0], [2, 1]] }} />
      </Track>
    </Composition>
  );
}
`;
    // The same video written with props by hand.
    const PROPS = `import { Audio, Clip, Composition, Track } from "@uberscene/kit";

export default function V() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip
          id="c"
          src="asset:city"
          in={0}
          out={6}
          transform={{ scale: 1.1, opacity: [{ at: 0, value: 0 }, { at: 0.5, value: 1, easing: "ease-out" }] }}
          effects={[
            { type: "blur", radius: [{ at: 0, value: 0 }, { at: 1, value: 4 }] },
            { type: "levels", gamma: 1.2, enabled: false },
          ]}
          speed={[{ at: 0, value: 1 }, { at: 2, value: 0.5, easing: "easeInOutQuad" }]}
          freezes={[{ at: 3, duration: 0.5, source: 1.5 }]}
        />
      </Track>
      <Track id="music" layout="free">
        <Audio id="a" src="asset:bed" start={0} duration={4} volume={[{ at: 0, value: 0 }, { at: 2, value: 0.5 }]} />
      </Track>
    </Composition>
  );
}
`;
    const rule = (text: string) => lint(text, { manifest }).filter((d) => d.rule === "everything-is-a-prop");

    it("moves old children, automation and the kit's removed names into props", () => {
      const found = rule(OLD);
      expect(found.map((d) => [d.id, d.fix !== undefined && d.fix.length > 0])).toEqual([
        ["c", true],
        ["a", true],
      ]);
      expect(found[0]?.message).toContain("2 <Keyframe>, 2 <Effect>, 2 <SpeedKey>, 1 <Freeze>");
      // The kit's names go once no tag uses them: the next round of the fix.
      const unused = rule(OLD.replace(/<Clip id="c"[\s\S]*?<\/Clip>/, '<Clip id="c" src="asset:city" />'));
      expect(unused.map((d) => d.message)).toEqual([
        "@uberscene/kit no longer has Effect, Freeze, Keyframe, SpeedKey: they are props of the elements now",
        expect.stringContaining("automation"),
      ]);
      expect(unused[0]?.fix).toHaveLength(1);
      const { text, remaining } = fixSource(OLD, { manifest });
      expect(remaining).toEqual([]);
      expect(text).toContain('import { Audio, Clip, Composition, Track } from "@uberscene/kit";');
      expect(text).not.toMatch(/<(Keyframe|Effect|SpeedKey|Freeze)\b|automation=/);
      expect(text).toContain('opacity: [{ at: 0, value: 0 }, { at: 0.5, value: 1, easing: "ease-out" }]');
      expect(text).toContain('{ type: "blur", radius: [{ at: 0, value: 0 }, { at: 1, value: 4 }] }');
      expect(text).toContain('{ type: "levels", gamma: 1.2, enabled: false }');
      expect(text).toContain('speed={[{ at: 0, value: 1 }, { at: 2, value: 0.5, easing: "easeInOutQuad" }]}');
      expect(text).toContain("freezes={[{ at: 3, duration: 0.5, source: 1.5 }]}");
      // Automation's points were multiplied into the volume.
      expect(text).toContain("volume={[{ at: 0, value: 0 }, { at: 2, value: 0.5 }]}");
    });

    it("reports keys made in code without a fix", () => {
      const made = `import { Clip, Composition, Keyframe, Track } from "@uberscene/kit";
const KEYS = [0, 1, 2];
export default function V() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="c" src="asset:city" in={0} out={6}>
          {KEYS.map((at) => (
            <Keyframe key={at} id={\`k\${at}\`} property="transform.opacity" at={at} value={at / 2} />
          ))}
        </Clip>
      </Track>
    </Composition>
  );
}
`;
      const found = rule(made);
      expect(found).toHaveLength(1);
      expect(found[0]?.message).toContain("<Keyframe> made in code is now a prop of the element it belongs to");
      expect(found[0]?.fix).toBeUndefined();
      expect(fixSource(made, { manifest }).text).toBe(made);
    });

    it("leaves a file that resolves to the same keys, effects, speed keys and holds as one written with props", () => {
      const stateOf = (text: string) => resolve(collectModule(loadModule(text) as never), manifest);
      const derived = (text: string) => {
        const state = stateOf(text);
        expect(state.errors).toEqual([]);
        return [...state.items.values()]
          .filter((p) => ["keyframe", "effect", "speedKey", "freeze"].includes(p.kind))
          .map((p) => ({ id: p.id, kind: p.kind, parent: p.parent, start: p.start, props: p.props }))
          .sort((a, b) => (a.id < b.id ? -1 : 1));
      };
      const fixed = derived(fixSource(OLD, { manifest }).text);
      expect(fixed.map((p) => p.id)).toEqual([
        "a.volume.0",
        "a.volume.1",
        "c.effects.0",
        "c.effects.0.radius.0",
        "c.effects.0.radius.1",
        "c.effects.1",
        "c.freezes.0",
        "c.speed.0",
        "c.speed.1",
        "c.transform.opacity.0",
        "c.transform.opacity.1",
      ]);
      expect(fixed).toEqual(derived(PROPS));
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
    const bound = buildSourceIndex(
      wrap(
        '<Track id="t"><Layer id="l" duration={2}><Clock total={limit} label="go" step={1 + 1} /></Layer></Track>',
        "export const schema = 1;\nexport const defaults = { limit: 90 };\nfunction Clock() { return null; }",
      ).replace("export default function V() {", "export default function V({ limit }: { limit: number }) {"),
    ).elements.get("l")!;
    expect(bound.interior?.boundProps).toEqual({ total: "limit" });
    expect(bound.boundProps).toEqual({ "interior.total": "limit" });
    expect(bound.lockedProps).toEqual(["interior.step"]);
    const none = buildSourceIndex(
      wrap(
        '<Track id="t"><Layer id="l" duration={2}><div><Clock /></div></Layer><Layer id="m" duration={2}><Clock /><Clock /></Layer></Track>',
        "function Clock() { return null; }",
      ),
    );
    expect(none.elements.get("l")?.interior).toBeUndefined();
    expect(none.elements.get("m")?.interior).toBeUndefined();
  });
});
