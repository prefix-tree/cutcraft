// The ready-made components: each expands to the kit's own elements with ids derived from its own, passes its timing
// to every part, rejects props its schema does not take, and can be written out into the file when a part is edited.
import { describe, expect, it } from "vitest";

import { COMPONENTS } from "@uberscene/kit";
import {
  type AssetManifest,
  bake,
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  lint,
  loadModule,
  resolve,
} from "@uberscene/sdk";

const manifest: AssetManifest = {
  assets: {
    shot: {
      id: "shot",
      kind: "video",
      duration: 10,
      fps: 30,
      width: 1920,
      height: 1080,
      transcript: {
        words: [
          { i: 0, text: "Stress", start: 1.5, end: 1.9 },
          { i: 1, text: "is", start: 2.5, end: 2.6 },
          { i: 2, text: "energy", start: 3.25, end: 3.7 },
        ],
      },
    },
  },
};

const file = (
  body: string,
) => `import { Badge, Callout, Clip, Composition, Counter, LowerThird, Sticker, Track, TypeCard } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="shot" src="asset:shot" in={0} out={6} />
      </Track>
      <Track id="over" layout="free">
        ${body}
      </Track>
    </Composition>
  );
}
`;

function resolved(body: string) {
  const text = file(body);
  const tree = collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) });
  return { text, tree, state: resolve(tree, manifest) };
}

const USES: Record<keyof typeof COMPONENTS, { use: string; parts: string[] }> = {
  LowerThird: {
    use: '<LowerThird id="lt" start={1} duration={3} name="Maya Chen" role="Founder, Shed" />',
    parts: ["lt-card:shape", "lt-bar:shape", "lt-name:title", "lt-role:title"],
  },
  Callout: {
    use: '<Callout id="co" start={1} duration={3} text="Ships on Fridays" to={{ x: 0, y: 0 }} />',
    parts: ["co-line:svg", "co-box:shape", "co-text:title"],
  },
  Badge: { use: '<Badge id="b" start={1} duration={3} text="New" />', parts: ["b-pill:shape", "b-text:title"] },
  Counter: {
    use: '<Counter id="n" start={1} duration={3} to={1200} suffix="+" label="teams" />',
    parts: ["n-value:layer", "n-label:title"],
  },
  TypeCard: {
    use: '<TypeCard id="tc" start={1} duration={3} lines={[{ text: "STRESS", struck: true }, { text: "ENERGY", offset: 1, pill: "$accent" }]} />',
    parts: ["tc-card:layer", "tc-line-1:layer", "tc-strike-1:layer", "tc-line-2:layer"],
  },
};

describe.each(Object.entries(USES))("%s", (name, { use, parts }) => {
  it("expands to the kit's elements, ids derived from its own, and resolves cleanly", () => {
    const { state, text } = resolved(use);
    expect(state.errors).toEqual([]);
    const made = [...state.items.values()]
      .filter((p) => parts.some((part) => part.startsWith(`${p.id}:`)))
      .map((p) => `${p.id}:${p.kind}`);
    expect(made.sort()).toEqual([...parts].sort());
    expect(lint(text, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
    expect(name in COMPONENTS).toBe(true);
  });

  it("starts every part at or after its own start, and ends them all together", () => {
    const { state } = resolved(use);
    const start = use.includes("start={0}") ? 0 : 1;
    const end = start + (use.includes("duration={6}") ? 6 : 3);
    for (const part of parts) {
      const p = state.items.get(part.split(":")[0]!)!;
      expect([part, p.start >= start - 1e-9, Math.abs(p.start + p.duration - end) < 1e-6]).toEqual([part, true, true]);
    }
  });
});

describe("components", () => {
  it("follow an anchor and a word like any element", () => {
    const { state } = resolved('<LowerThird id="lt" anchor="shot" offset={2} duration={2} name="Maya" />');
    expect(state.errors).toEqual([]);
    expect(state.items.get("lt-card")!.start).toBeCloseTo(2, 3);
    expect(state.items.get("lt-name")!.start).toBeCloseTo(2.15, 3);
  });

  it("bring each part of a card in at its own word, and take them all away with the card", () => {
    const { state } = resolved(
      `<TypeCard id="tc" anchor="shot" at="word:0" duration={4} lines={[
        { text: "STRESS", struck: { at: "word:2" } },
        { text: "ENERGY", at: "word:2", offset: 0.25 },
        { text: "hormone", offset: 3 },
      ]} />`,
    );
    expect(state.errors).toEqual([]);
    const span = (id: string) => {
      const p = state.items.get(id)!;
      return [p.start, p.start + p.duration].map((x) => Math.round(x * 1000) / 1000);
    };
    // The card: from word 0 (1.5 s) for 4 s. A line with no cue comes in with the card.
    expect(span("tc-card")).toEqual([1.5, 5.5]);
    expect(span("tc-line-1")).toEqual([1.5, 5.5]);
    expect(span("tc-strike-1")).toEqual([3.25, 5.5]);
    expect(span("tc-line-2")).toEqual([3.5, 5.5]);
    // Seconds after the card, not after the video's start.
    expect(span("tc-line-3")).toEqual([4.5, 5.5]);
  });

  it("say when a card's word has no clip to be a word of", () => {
    const word = resolved('<TypeCard id="tc" start={0} duration={2} lines={[{ text: "A", at: "word:1" }]} />');
    expect(word.state.errors.map((e) => e.message).join(" ")).toMatch(/TypeCard: at="word:1" needs the card's anchor/);
  });

  it("last until another element ends, every part of them, however late a part comes in", () => {
    const { state } = resolved(
      `<LowerThird id="lt" anchor="shot" offset={2} duration={{ until: "shot" }} name="Maya" role="Founder" />
        <TypeCard id="tc" anchor="shot" at="word:0" duration={{ until: "shot" }} lines={[{ text: "A" }, { text: "B", at: "word:2" }]} />`,
    );
    expect(state.errors).toEqual([]);
    const ends = ["lt-card", "lt-bar", "lt-name", "lt-role", "tc-card", "tc-line-1", "tc-line-2"].map((id) => {
      const p = state.items.get(id)!;
      return Math.round((p.start + p.duration) * 1000) / 1000;
    });
    // The clip plays from 0 to 6 s.
    expect(ends).toEqual([6, 6, 6, 6, 6, 6, 6]);
    expect(state.items.get("lt-role")!.start).toBeGreaterThan(state.items.get("lt-card")!.start);
  });

  it("say which prop is wrong", () => {
    const { state } = resolved('<Badge id="b" start={0} duration={2} text="New" size={-1} />');
    expect(state.errors.map((e) => e.message).join(" ")).toMatch(/Badge: size/);
  });

  it("write their output into the file when a part is edited, imports included", () => {
    const { text, tree, state } = resolved('<Badge id="b" start={1} duration={3} text="New" />');
    expect(state.items.get("b-text")!.editable).toBe("generated");
    expect(bake(text, "b-text", state)).toHaveLength(1);
    // As the editor does it: an edit to one part, folded into the file, which bakes the call first.
    const exec = new Executor({ tree, manifest, now: () => 0 });
    exec.execute({
      type: "source/setProps",
      params: { id: "b-text", props: { style: { font: "$heading", size: 30, weight: 700, color: "#ff0000" } } },
    });
    const { text: edited, skipped } = foldToSource(text, exec.log(), exec.state());
    expect(skipped).toEqual([]);
    expect(edited).not.toContain("<Badge");
    expect(edited).toMatch(/<Title id="b-text"[^>]*color: "#ff0000"/s);
    expect(edited).toContain('<Shape id="b-pill"');
    expect(edited).toMatch(/import \{[^}]*Shape[^}]*Title[^}]*\} from "@uberscene\/kit"/);
    // The written-out file resolves to the same parts, now literals the editor can change directly.
    const again = resolve(
      collectModule(loadModule(edited) as never, {}, { index: buildSourceIndex(edited) }),
      manifest,
    );
    expect(again.errors).toEqual([]);
    expect(again.items.get("b-text")!.editable).not.toBe("generated");
  });
});

describe("what they replace", () => {
  it("say what replaced a <Graphic> a file still uses", () => {
    const text = `import { Composition, Graphic, Track } from "@uberscene/kit";
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="over" layout="free">
        <Graphic id="g" kind="lower-third" start={0} duration={2} />
      </Track>
    </Composition>
  );
}
`;
    const state = resolve(collectModule(loadModule(text) as never, {}), manifest);
    expect(state.errors.map((e) => e.message).join(" ")).toMatch(
      /<Graphic kind="lower-third"> was removed: use LowerThird, Callout/,
    );
  });

  it("take a sticker as an image asset, and say icon stickers are gone", () => {
    const icon = resolved('<Sticker id="s" start={0} duration={2} src="icon:check" />');
    expect(icon.state.errors.map((e) => e.message).join(" ")).toMatch(/icon stickers were removed/);
  });
});

describe("where a component sits when its box leaves an axis out", () => {
  const vertical = (body: string) => file(body).replace("width={1920} height={1080}", "width={1080} height={1920}");
  const boxOf = (text: string, id: string) =>
    resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest).items.get(id)
      ?.props.box;

  it("is centred on the composition's frame, whatever its size", () => {
    expect(boxOf(file('<Badge id="b" start={0} duration={2} text="New" />'), "b-pill")).toMatchObject({
      x: 960,
      y: 540,
    });
    expect(boxOf(vertical('<Badge id="b" start={0} duration={2} text="New" />'), "b-pill")).toMatchObject({
      x: 540,
      y: 960,
    });
    expect(
      boxOf(vertical('<Badge id="b" start={0} duration={2} text="New" box={{ y: 300 }} />'), "b-pill"),
    ).toMatchObject({ x: 540, y: 300 });
  });

  it("keeps a default set for 1920 by 1080 where the component has one", () => {
    expect(boxOf(vertical('<LowerThird id="l" start={0} duration={2} name="Ada" />'), "l-card")).toMatchObject({
      x: 400,
      y: 870,
    });
  });

  it("takes its frame from withFrame when the component is called as a function", async () => {
    const { Badge, withFrame } = await import("@uberscene/kit");
    const parts = withFrame({ width: 640, height: 360 }, () => Badge({ id: "b", text: "New" })) as {
      props: { box?: unknown };
    }[];
    expect(parts[0]?.props.box).toMatchObject({ x: 320, y: 180 });
  });
});
