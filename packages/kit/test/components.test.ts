// The ready-made components: each expands to the kit's own elements with ids derived from its own, passes its timing
// to every part, rejects props its schema does not take, and can be written out into the file when a part is edited.
import { describe, expect, it } from "vitest";

import { type AssetManifest, COMPONENTS, collectModule, Executor, resolve } from "@cutcraft/kit";
import { bake, buildSourceIndex, foldToSource, lint, loadModule } from "@cutcraft/kit/source";

const manifest: AssetManifest = {
  assets: { shot: { id: "shot", kind: "video", duration: 10, fps: 30, width: 1920, height: 1080 } },
};

const file = (
  body: string,
) => `import { Arrow, Background, Badge, Callout, Clip, Composition, Counter, Highlight, LowerThird, ProgressBar, Track } from "@cutcraft/kit";

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
  ProgressBar: {
    use: '<ProgressBar id="pb" start={1} duration={3} value={0.7} />',
    parts: ["pb-track:shape", "pb-fill:shape"],
  },
  Arrow: {
    use: '<Arrow id="ar" start={1} duration={3} from={{ x: -200, y: 0 }} to={{ x: 200, y: -80 }} curve={60} />',
    parts: ["ar:svg"],
  },
  Highlight: {
    use: '<Highlight id="hl" start={1} duration={3} variant="circle" width={300} height={80} />',
    parts: ["hl:svg"],
  },
  Background: { use: '<Background id="bg" start={0} duration={6} variant="dots" />', parts: ["bg:svg"] },
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

  it("say which prop is wrong", () => {
    const { state } = resolved('<ProgressBar id="pb" start={0} duration={2} value={2} />');
    expect(state.errors.map((e) => e.message).join(" ")).toMatch(/ProgressBar: value/);
  });

  it("write their output into the file when a part is edited, imports included", () => {
    const { text, tree, state } = resolved('<Badge id="b" start={1} duration={3} text="New" />');
    expect(state.items.get("b-text")!.editable).toBe("generated");
    expect(bake(text, "b-text", state)).toHaveLength(1);
    // As the editor does it: an edit to one part, folded into the file, which bakes the call first.
    const exec = new Executor({ tree, manifest, now: () => 0 });
    exec.execute({ type: "source/setProps", params: { id: "b-text", props: { color: "#ff0000" } } });
    const { text: edited, skipped } = foldToSource(text, exec.log(), exec.state());
    expect(skipped).toEqual([]);
    expect(edited).not.toContain("<Badge");
    expect(edited).toMatch(/<Title id="b-text"[^>]*color="#ff0000"/s);
    expect(edited).toContain('<Shape id="b-pill"');
    expect(edited).toMatch(/import \{[^}]*Shape[^}]*Title[^}]*\} from "@cutcraft\/kit"/);
    // The written-out file resolves to the same parts, now literals the editor can change directly.
    const again = resolve(
      collectModule(loadModule(edited) as never, {}, { index: buildSourceIndex(edited) }),
      manifest,
    );
    expect(again.errors).toEqual([]);
    expect(again.items.get("b-text")!.editable).not.toBe("generated");
  });
});
