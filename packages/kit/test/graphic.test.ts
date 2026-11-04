import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { Composition, collect, Graphic, resolve, Track } from "@cutcraft/kit";
import { lint } from "@cutcraft/kit/source";

import { manifest } from "./helpers";

const h = createElement;

function film(theme: Record<string, unknown> | undefined, ...children: ReturnType<typeof h>[]) {
  return h(
    Composition,
    { fps: 30, width: 1920, height: 1080, ...(theme ? { theme } : {}) },
    h(Track, { id: "over", layout: "free" }, ...children),
  );
}

describe("<Graphic>", () => {
  it("parses the kind's props with its defaults, and takes presets and motion from the theme", () => {
    const state = resolve(
      collect(
        film(
          { motion: "snappy", styles: { graphic: { loud: { fill: "$accent", size: 52 } } } },
          h(Graphic, { id: "c", kind: "callout", text: "Hi", start: 0 } as never),
          h(Graphic, { id: "l", kind: "callout", text: "Hey", style: "loud", start: 0 } as never),
        ),
      ),
      manifest,
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("c")?.props).toMatchObject({
      kind: "callout",
      text: "Hi",
      tail: "bottom",
      fill: "$surface",
      size: 36,
    });
    expect(state.items.get("c")?.props.enter).toMatchObject({ type: "slide-up" });
    expect(state.items.get("l")?.props).toMatchObject({ fill: "#ffb020", size: 52 });
  });

  it("reports a prop the kind does not take", () => {
    const state = resolve(
      collect(film(undefined, h(Graphic, { id: "b", kind: "badge", tail: "left", start: 0 } as never))),
      manifest,
    );
    expect(state.errors.map((e) => [e.code, e.id])).toEqual([["SCHEMA", "b"]]);
  });

  it("lints kinds, props, values and icon names before anything renders", () => {
    const text = `import { Composition, Graphic, Sticker, Track } from "@cutcraft/kit";
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="over" layout="free">
        <Graphic id="a" kind="arrows" start={0} />
        <Graphic id="b" kind="badge" tail="left" start={0} />
        <Graphic id="c" kind="steps" count={1} start={0} />
        <Graphic id="d" kind="icon" name="rocket" start={0} />
        <Sticker id="s" src="icon:no-such-icon" start={0} />
        <Graphic id="ok" kind="callout" text="Fine" tail="left" start={0} />
      </Track>
    </Composition>
  );
}
`;
    const d = lint(text).filter((x) => x.rule === "graphic-props");
    expect(d.map((x) => [x.id, x.prop, x.severity])).toEqual([
      ["a", "kind", "error"],
      ["b", "tail", "error"],
      ["c", "count", "error"],
      ["s", "src", "warning"],
    ]);
    expect(d[0]?.message).toContain('did you mean "arrow"');
  });
});

describe("deprecated-graphic", () => {
  it("warns on every <Graphic>, naming its kind, and on nothing else", () => {
    const text = `import { Composition, Graphic, Title, Track } from "@cutcraft/kit";
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t" layout="free">
        <Graphic id="who" kind="lower-third" name="A" start={0} duration={2} />
        <Title id="hi" start={0} duration={2}>Hi</Title>
      </Track>
    </Composition>
  );
}
`;
    const d = lint(text).filter((x) => x.rule === "deprecated-graphic");
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ severity: "warning", id: "who" });
    expect(d[0]?.message).toContain('<Graphic kind="lower-third"> is deprecated');
    expect(text.slice(d[0]!.range[0], d[0]!.range[1])).toMatch(/^<Graphic id="who"/);
  });
});
