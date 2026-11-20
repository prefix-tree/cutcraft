// Fixes a lint diagnostic can carry: the helpers that build them, the `deprecated-props` rule that uses them, and
// `fixSource`, which applies them round by round.
import { describe, expect, it } from "vitest";

import {
  applyEdits,
  type Deprecation,
  fixSource,
  jsxTags,
  lint,
  movePropInto,
  movePropsInto,
  parseSource,
  renameProp,
  renameValue,
} from "@uberscene/sdk";

const wrap = (body: string, extra = "") => `import { Composition, Track, Title, Layer } from "@uberscene/kit";
${extra}
export default function V() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="t" layout="free">
        ${body}
      </Track>
    </Composition>
  );
}
`;

/** The first tag of that name, and a way to apply edits made for it. */
const on = (text: string, name: string) => {
  const tag = jsxTags(parseSource(text), name)[0];
  if (!tag) throw new Error(`no <${name}>`);
  return tag;
};
const apply = (text: string, edits: ReturnType<typeof renameProp>): string | null =>
  edits ? applyEdits(text, edits) : null;

describe("renameProp", () => {
  it("renames an attribute, whatever its value", () => {
    const text = wrap('<Title id="a" size={64} start={1} duration={2}>Hi</Title>');
    expect(apply(text, renameProp(on(text, "Title"), "size", "fontSize"))).toBe(
      text.replace("size={64}", "fontSize={64}"),
    );
  });

  it("renames a key inside an object prop", () => {
    const text = wrap('<Title id="a" animation={{ preset: "fade", in: 0.3 }} duration={2}>Hi</Title>');
    expect(apply(text, renameProp(on(text, "Title"), "animation.preset", "type"))).toBe(
      text.replace("preset:", "type:"),
    );
  });

  it("gives no fix when the new name is taken, the prop is absent, or the object is an expression", () => {
    const taken = wrap('<Title id="a" size={64} fontSize={10} duration={2}>Hi</Title>');
    expect(renameProp(on(taken, "Title"), "size", "fontSize")).toBeNull();
    const absent = wrap('<Title id="a" duration={2}>Hi</Title>');
    expect(renameProp(on(absent, "Title"), "size", "fontSize")).toBeNull();
    const opaque = wrap('<Title id="a" animation={ANIM} duration={2}>Hi</Title>', "const ANIM = { preset: 'fade' };");
    expect(renameProp(on(opaque, "Title"), "animation.preset", "type")).toBeNull();
    const keyTaken = wrap('<Title id="a" animation={{ preset: "fade", type: 1 }} duration={2}>Hi</Title>');
    expect(renameProp(on(keyTaken, "Title"), "animation.preset", "type")).toBeNull();
  });
});

describe("renameValue", () => {
  it("respells an attribute string, a string in braces and a string inside an object", () => {
    const attr = wrap('<Title id="a" align="flush-left" duration={2}>Hi</Title>');
    expect(apply(attr, renameValue(attr, on(attr, "Title"), "align", "flush-left", "flushLeft"))).toBe(
      attr.replace('"flush-left"', '"flushLeft"'),
    );
    const braces = wrap("<Title id=\"a\" align={'flush-left'} duration={2}>Hi</Title>");
    expect(apply(braces, renameValue(braces, on(braces, "Title"), "align", "flush-left", "flushLeft"))).toBe(
      braces.replace("'flush-left'", "'flushLeft'"),
    );
    const nested = wrap('<Title id="a" animation={{ preset: "word-by-word" }} duration={2}>Hi</Title>');
    expect(
      apply(nested, renameValue(nested, on(nested, "Title"), "animation.preset", "word-by-word", "wordByWord")),
    ).toBe(nested.replace('"word-by-word"', '"wordByWord"'));
  });

  it("gives no fix for another value or an expression", () => {
    const other = wrap('<Title id="a" align="center" duration={2}>Hi</Title>');
    expect(renameValue(other, on(other, "Title"), "align", "flush-left", "flushLeft")).toBeNull();
    const expr = wrap('<Title id="a" align={side} duration={2}>Hi</Title>', 'const side = "flush-left";');
    expect(renameValue(expr, on(expr, "Title"), "align", "flush-left", "flushLeft")).toBeNull();
  });
});

describe("movePropInto", () => {
  it("makes the object prop where the moved prop was, when the tag has none", () => {
    const text = wrap('<Title id="a" size={64} duration={2}>Hi</Title>');
    expect(apply(text, movePropInto(text, on(text, "Title"), "size", "style"))).toBe(
      text.replace("size={64}", "style={{ size: 64 }}"),
    );
  });

  it("moves several props at once: strings, expressions and a bare prop, under new keys", () => {
    const text = wrap('<Title id="a" font="Inter" size={big * 2} italic duration={2}>Hi</Title>', "const big = 32;");
    const edits = movePropsInto(
      text,
      on(text, "Title"),
      [{ prop: "font" }, { prop: "size" }, { prop: "italic", key: "slanted" }],
      "style",
    );
    expect(apply(text, edits)).toBe(
      text.replace('font="Inter" size={big * 2} italic', 'style={{ font: "Inter", size: big * 2, slanted: true }}'),
    );
  });

  it("extends an object literal, on one line or one key to a line", () => {
    const flat = wrap('<Title id="a" style={{ color: "#fff" }} size={64} duration={2}>Hi</Title>');
    expect(apply(flat, movePropInto(flat, on(flat, "Title"), "size", "style"))).toBe(
      flat.replace('style={{ color: "#fff" }} size={64}', 'style={{ color: "#fff", size: 64 }}'),
    );
    const empty = wrap('<Title id="a" size={64} style={{}} duration={2}>Hi</Title>');
    expect(apply(empty, movePropInto(empty, on(empty, "Title"), "size", "style"))).toBe(
      empty.replace("size={64} style={{}}", "style={{ size: 64 }}"),
    );
    const tall = `<Title
          id="a"
          style={{
            color: "#fff",
            weight: 700,
          }}
          size={64}
          duration={2}
        >
          Hi
        </Title>`;
    const text = wrap(tall);
    expect(apply(text, movePropInto(text, on(text, "Title"), "size", "style"))).toBe(
      text.replace("weight: 700,", "weight: 700,\n            size: 64,").replace("\n          size={64}", ""),
    );
  });

  it("wraps a plain value when told the key it takes", () => {
    const text = wrap('<Title id="a" style="h1" size={64} duration={2}>Hi</Title>');
    expect(apply(text, movePropInto(text, on(text, "Title"), "size", "style", "size", { wrap: "preset" }))).toBe(
      text.replace('style="h1" size={64}', 'style={{ preset: "h1", size: 64 }}'),
    );
    expect(movePropInto(text, on(text, "Title"), "size", "style")).toBeNull();
  });

  it("gives no fix when the object is an expression, spreads another, or has the key already", () => {
    const opaque = wrap('<Title id="a" style={LOOK} size={64} duration={2}>Hi</Title>', "const LOOK = {};");
    expect(movePropInto(opaque, on(opaque, "Title"), "size", "style", "size", { wrap: "preset" })).toBeNull();
    const spread = wrap('<Title id="a" style={{ ...LOOK }} size={64} duration={2}>Hi</Title>', "const LOOK = {};");
    expect(movePropInto(spread, on(spread, "Title"), "size", "style")).toBeNull();
    const has = wrap('<Title id="a" style={{ size: 10 }} size={64} duration={2}>Hi</Title>');
    expect(movePropInto(has, on(has, "Title"), "size", "style")).toBeNull();
    const none = wrap('<Title id="a" duration={2}>Hi</Title>');
    expect(movePropInto(none, on(none, "Title"), "size", "style")).toBeNull();
  });
});

describe("deprecated-props", () => {
  const deprecations: Deprecation[] = [
    { element: "Title", prop: "size", to: { into: "style", wrap: "preset" }, since: "0.6.0" },
    { element: "Title", prop: "weight", to: { into: "style", wrap: "preset" }, since: "0.6.0" },
    { element: "Title", prop: "align", to: { into: "style", wrap: "preset" }, since: "0.6.0" },
    { element: "Title", prop: "align", to: { value: { from: "flush-left", to: "flushLeft" } }, since: "0.6.0" },
    { element: "Title", prop: "animation.preset", to: { rename: "type" }, since: "0.6.0", note: "a kind is a type" },
    {
      element: "Title",
      prop: "animation.preset",
      to: { value: { from: "word-by-word", to: "wordByWord" } },
      since: "0.6.0",
    },
    { element: "*", prop: "ground", to: { rename: "backdrop" }, since: "0.6.0" },
  ];
  const only = { deprecations, rules: ["deprecated-props"] };

  it("is silent with an empty table and on files that use none of it", () => {
    const text = wrap('<Title id="a" size={64} duration={2}>Hi</Title>');
    expect(lint(text, { rules: ["deprecated-props"] })).toEqual([]);
    expect(lint(wrap('<Title id="a" duration={2}>Hi</Title>'), only)).toEqual([]);
  });

  it("reports each old spelling as an error that names the new one", () => {
    const text = wrap(
      '<Title id="a" size={64} animation={{ preset: "word-by-word" }} duration={2}>Hi</Title>\n        <Layer id="l" ground duration={2}><div /></Layer>',
    );
    const found = lint(text, only);
    expect(found.map((d) => [d.severity, d.id, d.prop, d.message])).toEqual([
      ["error", "a", "size", '<Title id="a">: `size` is `style.size` since 0.6.0'],
      [
        "error",
        "a",
        "animation",
        '<Title id="a">: `animation.preset` is `animation.type` since 0.6.0; a kind is a type',
      ],
      ["error", "a", "animation", '<Title id="a">: `animation.preset="word-by-word"` is "wordByWord" since 0.6.0'],
      ["error", "l", "ground", '<Layer id="l">: `ground` is `backdrop` since 0.6.0'],
    ]);
    expect(found.every((d) => d.fix && d.fix.length > 0)).toBe(true);
  });

  it("a star row covers the kit's tags and not the HTML of free code", () => {
    const text = wrap('<Layer id="l" duration={2}><div ground /></Layer>');
    expect(lint(text, only)).toEqual([]);
  });

  it("mends a whole tag in one fix: props moved, the moved value respelled, a key renamed and respelled", () => {
    const text = wrap(
      '<Title id="a" style="h1" size={64} weight={700} align="flush-left" animation={{ preset: "word-by-word", in: 0.3 }} duration={2}>Hi</Title>',
    );
    const fixed = fixSource(text, only);
    expect(fixed.text).toBe(
      wrap(
        '<Title id="a" style={{ preset: "h1", size: 64, weight: 700, align: "flushLeft" }} animation={{ type: "wordByWord", in: 0.3 }} duration={2}>Hi</Title>',
      ),
    );
    expect(fixed.remaining).toEqual([]);
    expect(fixed.applied.map((d) => d.prop)).toEqual(["size", "weight", "align", "align", "animation", "animation"]);
    // Every finding on the tag carried the same edits, so one round was enough.
    expect(new Set(fixed.applied.map((d) => JSON.stringify(d.fix))).size).toBe(1);
  });

  it("makes the object when there is none, and extends one that is there", () => {
    const none = wrap('<Title id="a" size={64} weight={700} duration={2}>Hi</Title>');
    expect(fixSource(none, only).text).toBe(
      wrap('<Title id="a" style={{ size: 64, weight: 700 }} duration={2}>Hi</Title>'),
    );
    const there = wrap('<Title id="a" size={64} style={{ color: "#fff" }} duration={2}>Hi</Title>');
    expect(fixSource(there, only).text).toBe(
      wrap('<Title id="a" style={{ color: "#fff", size: 64 }} duration={2}>Hi</Title>'),
    );
  });

  it("reports without a fix what it cannot write for certain, and still fixes the rest of the tag", () => {
    const text = wrap(
      '<Title id="a" style={LOOK} size={64} animation={{ preset: "fade" }} duration={2}>Hi</Title>',
      "const LOOK = {};",
    );
    const found = lint(text, only);
    expect(found.map((d) => [d.prop, d.fix !== undefined])).toEqual([
      ["size", false],
      ["animation", true],
    ]);
    const fixed = fixSource(text, only);
    expect(fixed.text).toBe(text.replace("preset:", "type:"));
    expect(fixed.remaining.map((d) => d.prop)).toEqual(["size"]);
  });

  it("fixes every tag of a file, each with its own edits", () => {
    const text = wrap(
      '<Title id="a" size={64} duration={2}>Hi</Title>\n        <Title id="b" size={32} duration={2}>Ho</Title>',
    );
    const fixed = fixSource(text, only);
    expect(fixed.text).toBe(
      text.replace("size={64}", "style={{ size: 64 }}").replace("size={32}", "style={{ size: 32 }}"),
    );
    expect(fixed.applied.map((d) => d.id)).toEqual(["a", "b"]);
  });
});

describe("fixSource", () => {
  it("returns the text unchanged when nothing carries a fix", () => {
    const text = wrap('<Title id="a" duration={2}>Hi</Title>');
    const fixed = fixSource(text);
    expect(fixed.text).toBe(text);
    expect(fixed.applied).toEqual([]);
  });

  it("holds back a fix that overlaps one already taken, and applies it in the next round", () => {
    // The move rewrites the whole attribute; the clock fix sits inside its value, so it waits a round.
    const deprecations: Deprecation[] = [{ element: "Title", prop: "size", to: { into: "style" }, since: "1" }];
    const text = wrap('<Title id="t1" size={window.Date.now()} duration={2}>Hi</Title>');
    const fixed = fixSource(text, { deprecations, rules: ["deprecated-props", "free-code-clock"] });
    expect(fixed.text).toBe(text.replace("size={window.Date.now()}", "style={{ size: Date.now() }}"));
    expect(fixed.applied.map((d) => d.rule)).toEqual(["deprecated-props", "free-code-clock"]);
    expect(fixed.remaining).toEqual([]);
  });

  it("goes round again when a fix leaves something else to fix", () => {
    const deprecations: Deprecation[] = [
      { element: "Title", prop: "a", to: { rename: "x" }, since: "1" },
      { element: "Title", prop: "x", to: { rename: "y" }, since: "2" },
    ];
    const text = wrap('<Title id="t1" a={1} duration={2}>Hi</Title>');
    const fixed = fixSource(text, { deprecations, rules: ["deprecated-props"] });
    expect(fixed.text).toBe(text.replace("a={1}", "y={1}"));
    expect(fixed.applied.map((d) => d.message.split(": ")[1])).toEqual(["`a` is `x` since 1", "`x` is `y` since 2"]);
  });

  it("stops after ten rounds when a fix keeps making work", () => {
    const deprecations: Deprecation[] = [
      { element: "Title", prop: "a", to: { rename: "b" }, since: "1" },
      { element: "Title", prop: "b", to: { rename: "a" }, since: "1" },
    ];
    const text = wrap('<Title id="t1" a={1} duration={2}>Hi</Title>');
    const fixed = fixSource(text, { deprecations, rules: ["deprecated-props"] });
    expect(fixed.applied).toHaveLength(10);
    expect(fixed.remaining).toHaveLength(1);
  });

  it("fixes free code: the browser's clock by its bare name, and a CPU canvas option taken out", () => {
    const text = wrap(
      '<Layer id="l" duration={2}><Free /></Layer>',
      `function Free() {
  window.requestAnimationFrame(() => {});
  const now = globalThis.performance.now();
  const a = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const b = document.createElement("canvas").getContext("2d", { alpha: false, willReadFrequently: true });
  const c = document.createElement("canvas").getContext("2d", { willReadFrequently: true, alpha: false });
  return <div>{now}{String(a ?? b ?? c)}</div>;
}`,
    );
    const fixed = fixSource(text, { rules: ["free-code-clock"] });
    expect(fixed.text).toBe(
      text
        .replace("window.requestAnimationFrame", "requestAnimationFrame")
        .replace("globalThis.performance", "performance")
        .replace('getContext("2d", { willReadFrequently: true });', 'getContext("2d", {});')
        .replace("{ alpha: false, willReadFrequently: true }", "{ alpha: false }")
        .replace("{ willReadFrequently: true, alpha: false }", "{ alpha: false }"),
    );
    expect(fixed.remaining).toEqual([]);
    expect(fixed.applied).toHaveLength(5);
  });

  it("leaves window.Date alone when the file binds a Date of its own", () => {
    const text = wrap(
      '<Layer id="l" duration={2}><Free /></Layer>',
      "const Date = 1;\nfunction Free() { return <div>{String(window.Date)}{Date}</div>; }",
    );
    const found = lint(text, { rules: ["free-code-clock"] });
    expect(found).toHaveLength(1);
    expect(found[0]?.fix).toBeUndefined();
    expect(fixSource(text, { rules: ["free-code-clock"] }).text).toBe(text);
  });
});

describe("old-theme-variables", () => {
  const only = { rules: ["old-theme-variables"] };

  it("reports --cc-* in strings, templates and JSX text, and fixes each to --us-*", () => {
    const text = wrap(
      `<Layer id="l" duration={2} component={Card} />`,
      'const HEAD = "var(--cc-heading)";\nconst Card = () => <div style={{ color: `var(--cc-text, ${"#fff"})` }}><svg><rect fill="var(--cc-accent)" /></svg><style>{"a { color: var(--cc-muted) }"}</style></div>;',
    );
    const found = lint(text, only);
    expect(found.map((d) => d.message)).toEqual([
      "`--cc-heading` is `--us-heading` since 0.6",
      "`--cc-text` is `--us-text` since 0.6",
      "`--cc-accent` is `--us-accent` since 0.6",
      "`--cc-muted` is `--us-muted` since 0.6",
    ]);
    const fixed = fixSource(text, only);
    expect(fixed.text).toBe(text.replaceAll("--cc-", "--us-"));
    expect(lint(fixed.text, only)).toEqual([]);
  });

  it("leaves names and comments alone", () => {
    const text = wrap('<Title id="a" duration={2}>Hi</Title>', "// var(--cc-old) in a comment\nconst cc_x = 1;");
    expect(lint(text, only)).toEqual([]);
  });
});
