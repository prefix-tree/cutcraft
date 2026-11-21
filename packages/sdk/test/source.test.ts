import { describe, expect, it } from "vitest";

import {
  applyEdits,
  bake,
  buildSourceIndex,
  foldToSource,
  lineRange,
  literalOf,
  printElement,
  printLiteral,
} from "@uberscene/sdk";

import { parseSource } from "../src/source/parse";
import { fixtureExecutor, fixtureText } from "./helpers";

describe("edits", () => {
  it("applies non-overlapping edits from the end and rejects overlaps", () => {
    expect(
      applyEdits("hello world", [
        { kind: "prop", id: "a", prop: "x", range: [0, 5], text: "bye" },
        { kind: "insert", id: "b", range: [11, 11], text: "!" },
      ]),
    ).toBe("bye world!");
    expect(() =>
      applyEdits("abc", [
        { kind: "remove", id: "a", range: [0, 2], text: "" },
        { kind: "remove", id: "b", range: [1, 3], text: "" },
      ]),
    ).toThrow(/overlapping/);
  });

  it("moves text", () => {
    expect(applyEdits("one two three", [{ kind: "move", id: "a", from: [0, 4], range: [13, 13], text: " one" }])).toBe(
      "two three one",
    );
  });

  it("widens a range to the whole line", () => {
    const text = "a\n    <X />\nb";
    expect(lineRange(text, [6, 11])).toEqual([2, 12]);
    expect(text.slice(...lineRange(text, [6, 11]))).toBe("    <X />\n");
  });
});

describe("print", () => {
  it("prints literals, functions and nested elements", () => {
    expect(printLiteral({ a: [1, "x", null], "b-c": true })).toBe('{ a: [1, "x", null], "b-c": true }');
    expect(printLiteral({})).toBe("{}");
    expect(
      printLiteral(function Outro() {
        return null;
      } as never),
    ).toBe("Outro");
    expect(
      printElement(
        {
          id: "c",
          kind: "clip",
          props: {
            id: "c",
            src: "asset:a",
            of: function Outro() {
              return null;
            } as never,
          },
          children: [{ id: "m", kind: "mask", props: { id: "m", shape: { rect: { x: 0, y: 0 } }, feather: 2 } }],
        },
        "  ",
      ),
    ).toBe(
      '  <Clip id="c" src="asset:a" of={Outro}>\n    <Mask id="m" shape={{ rect: { x: 0, y: 0 } }} feather={2} />\n  </Clip>',
    );
    expect(printElement({ id: "t", kind: "title", props: { id: "t" }, text: "a {b}" })).toBe(
      '<Title id="t">{"a {b}"}</Title>',
    );
  });
});

describe("index", () => {
  it("evaluates literal expressions and marks the rest as expressions", () => {
    const { ast } = parseSource('const v = [1, -2, "s", { a: true, b: null }, `t`];\nconst e = [x, 1 + 2];');
    const decls = ast.program.body.map((n) => (n as { declarations: { init: unknown }[] }).declarations[0]!.init);
    expect(literalOf(decls[0] as never)).toEqual({ ok: true, value: [1, -2, "s", { a: true, b: null }, "t"] });
    expect(literalOf(decls[1] as never).ok).toBe(false);
  });

  it("records tag ranges, children ranges and sibling positions", () => {
    const index = buildSourceIndex(fixtureText);
    const main = index.elements.get("main")!;
    expect(fixtureText.slice(...main.openingTag)).toBe('<Track id="main" name="Main">');
    expect(fixtureText.slice(...main.closingTag!)).toBe("</Track>");
    expect(main.childrenRange).not.toBeNull();
    const c2 = index.elements.get("c2")!;
    expect(c2.siblingIndex).toBe(2);
    expect(c2.props.get("transform")?.literal).toEqual({ scale: 1.1 });
    expect(c2.props.get("fit")?.valueRange && fixtureText.slice(...c2.props.get("fit")!.valueRange!)).toBe('"cover"');
    expect(index.elements.get("cp1")?.parent).toBe("cap");
    expect(index.compositionId).toBe("composition");
    expect(index.hasSchema).toBe(true);
    expect(index.anonymous).toEqual([]);
  });

  it("treats a bare attribute as true", () => {
    const index = buildSourceIndex(
      'import { Track } from "@uberscene/kit";\nexport default () => <Track id="t" hidden />;',
    );
    expect(index.elements.get("t")?.props.get("hidden")).toMatchObject({
      literal: true,
      valueRange: null,
      isExpression: false,
    });
  });
});

describe("fold, structural cases", () => {
  it("inserts a first child into a self-closing element", () => {
    const exec = fixtureExecutor();
    exec.execute({
      type: "mask/create",
      params: { id: "mk9", parentId: "c3", props: { shape: { ellipse: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.3 } } } },
    });
    const { text, skipped } = foldToSource(fixtureText, exec.log(), exec.state());
    expect(skipped).toEqual([]);
    expect(text).toContain(
      'speed={1.2}>\n          <Mask shape={{ ellipse: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.3 } }} id="mk9" />\n        </Clip>',
    );
  });

  it("removes an element with its line, moves a sibling, and rewrites a bare attribute", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "element/remove", params: { id: "c2" } });
    exec.execute({ type: "clip/move", params: { id: "c1", place: { after: "c3" } } });
    exec.execute({ type: "track/setFlag", params: { trackId: "mc", flag: "hidden", value: false } });
    const { text, skipped } = foldToSource(fixtureText, exec.log(), exec.state());
    expect(skipped).toEqual([]);
    expect(text).not.toContain('<Clip id="c2"');
    expect(text.search(/<Clip\s+id="c3"/)).toBeGreaterThan(0);
    expect(text.search(/<Clip\s+id="c3"/)).toBeLessThan(text.search(/<Clip\s+id="c1"/));
    expect(text).toContain('<Track id="mc" layout="free" hidden={false}>');
    expect(buildSourceIndex(text).elements.get("c1")?.parent).toBe("main");
  });

  it("deletes a prop and converts a string prop to an expression", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "source/setProps", params: { id: "c2", props: { fit: undefined, transform: undefined } } });
    expect(exec.execute({ type: "source/setProps", params: { id: "m1", props: { label: 'we"ird' } } }).ok).toBe(true);
    const { text } = foldToSource(fixtureText, exec.log(), exec.state());
    expect(text).toContain('id="c2"\n          src="asset:city"\n          duration={3.5}\n          speed={[');
    expect(text).toContain('label={"we\\"ird"}');
  });

  it("bakes multicam cuts into literal clips after the generator", () => {
    const exec = fixtureExecutor();
    const edits = bake(fixtureText, "mc1.cu1", exec.state());
    expect(edits).toHaveLength(1);
    const text = applyEdits(fixtureText, edits);
    expect(text).toContain('<Clip id="mc1.cu1" src="asset:interview" in={0} />');
    expect(text.indexOf('<Clip id="mc1.cu1"')).toBeGreaterThan(text.indexOf("</Multicam>"));
  });

  it("reports what it cannot write instead of guessing", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "composition/setProps", params: { defaults: { title: "x", accent: "y" } } });
    const noDefaults = fixtureText.replace(
      'export const defaults = { title: "Why we built it", accent: "#ff5a1f" };',
      "export const defaults = make();",
    );
    const { skipped } = foldToSource(noDefaults, exec.log(), exec.state());
    expect(skipped).toEqual([{ id: "composition", reason: "no `export const defaults` literal to rewrite" }]);
  });
});
