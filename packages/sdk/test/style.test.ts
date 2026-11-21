// One way to style text (0.6): a title's and the captions' look is one `style`, a preset name or an object. A file
// still written with the flat props is refused with an error that names each prop's new place.
import { describe, expect, it } from "vitest";

import { collectModule, loadModule, resolve } from "@uberscene/sdk";

const wrap = (body: string) => `import { Captions, Composition, Title, Track } from "@uberscene/kit";
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
const errors = (body: string) =>
  resolve(collectModule(loadModule(wrap(body)) as never), { assets: {} }).errors.map((e) => [
    e.code,
    e.id,
    "prop" in e ? e.prop : undefined,
    e.message,
  ]);

const LOOK: [string, string][] = [
  ["font", 'font="Inter"'],
  ["size", "size={64}"],
  ["weight", "weight={700}"],
  ["italic", "italic"],
  ["color", 'color="#ffffff"'],
  ["background", 'background="#000000"'],
  ["stroke", 'stroke={{ color: "#000", width: 2 }}'],
  ["shadow", 'shadow={{ color: "#000", blur: 4 }}'],
  ["align", 'align="left"'],
  ["valign", 'valign="top"'],
  ["lineHeight", "lineHeight={1.1}"],
  ["letterSpacing", "letterSpacing={2}"],
  ["decoration", 'decoration="underline"'],
];

describe("one style for text", () => {
  it.each(LOOK)("refuses a title's flat %s, naming style.%s", (prop, written) => {
    expect(errors(`<Title id="a" start={0} duration={1} ${written}>Hi</Title>`)).toEqual([
      ["SCHEMA", "a", undefined, `\`${prop}\` is now \`style.${prop}\`; uberscene lint --fix moves the file`],
    ]);
  });

  it("refuses a title's flat width and height, naming box, and says every moved prop at once", () => {
    expect(errors('<Title id="a" start={0} duration={1} width={800} size={64}>Hi</Title>')).toEqual([
      [
        "SCHEMA",
        "a",
        undefined,
        "`size` is now `style.size`, `width` is now `box.width`; uberscene lint --fix moves the file",
      ],
    ]);
    expect(errors('<Title id="a" start={0} duration={1} style={{ height: 80 }}>Hi</Title>')).toEqual([
      ["SCHEMA", "a", "style", "`height` is now `box.height`; uberscene lint --fix moves the file"],
    ]);
  });

  it("refuses the captions' flat align, naming style.align", () => {
    expect(errors('<Captions id="c" align="left" />')).toEqual([
      ["SCHEMA", "c", undefined, "`align` is now `style.align`; uberscene lint --fix moves the file"],
    ]);
  });

  it("takes the new spelling: a preset name, or an object with a preset and the fields that win", () => {
    const state = resolve(
      collectModule(
        loadModule(
          wrap(`<Title id="a" start={0} duration={1} style="h1">A</Title>
        <Title id="b" start={0} duration={1} style={{ preset: "h1", size: 64, align: "left" }} box={{ width: 800 }}>B</Title>
        <Captions id="c" style={{ preset: "boxed", size: 40, align: "left" }} />`),
        ) as never,
      ),
      { assets: {} },
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("a")?.props.style).toMatchObject({ preset: "h1", size: 96, weight: 700 });
    expect(state.items.get("b")?.props.style).toMatchObject({ preset: "h1", size: 64, weight: 700, align: "left" });
    expect(state.items.get("c")?.props.style).toMatchObject({ preset: "boxed", size: 40, align: "left" });
  });
});
