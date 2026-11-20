// One naming rule (0.6): a kind is `type`, a line's thickness is `thickness`, a time a thing starts at is `start`, and
// enum values are camelCase. A file still written the old way is refused with an error that names the new spelling.
import { describe, expect, it } from "vitest";

import { collectModule, loadModule, resolve } from "@uberscene/sdk";

const wrap = (body: string, composition = "", top = "") => `import {
  Captions, Clip, Composition, Effect, Keyframe, Marker, Shape, Svg, Title, Track, Transition,
} from "@uberscene/kit";
export default function V() {
  return (
    <Composition fps={30} width={1920} height={1080}${composition}>
      ${top}
      <Track id="t" layout="free">
        ${body}
      </Track>
    </Composition>
  );
}
`;
const messages = (body: string, composition = "", top = "") =>
  resolve(collectModule(loadModule(wrap(body, composition, top)) as never), { assets: {} }).errors.map(
    (e) => `${e.id ?? ""} ${"prop" in e ? (e.prop ?? "") : ""}: ${e.message}`,
  );

describe("an old key is an error naming the new one", () => {
  it.each([
    ["a shape's kind", '<Shape id="s" start={0} duration={1} shape="circle" />', "`shape` is now `type`"],
    [
      "a shape's stroke width",
      '<Shape id="s" start={0} duration={1} type="circle" stroke={{ color: "#fff", width: 4 }} />',
      "`stroke.width` is now `stroke.thickness`",
    ],
    [
      "a title's animation preset",
      '<Title id="h" start={0} duration={1} animation={{ preset: "fade" }}>Hi</Title>',
      "`animation.preset` is now `animation.type`",
    ],
    [
      "a title's stroke width",
      '<Title id="h" start={0} duration={1} style={{ stroke: { color: "#000", width: 2 } }}>Hi</Title>',
      "`style.stroke.width` is now `style.stroke.thickness`",
    ],
    [
      "the captions' stroke width",
      '<Captions id="c" style={{ stroke: { color: "#000", width: 2 } }} />',
      "`style.stroke.width` is now `style.stroke.thickness`",
    ],
    [
      "an svg's colour mode",
      '<Svg id="v" start={0} duration={1} content="<svg/>" color={{ mode: "tint", tint: "#f00" }} />',
      "`color.mode` is now `color.type`",
    ],
  ])("%s", (_, body, said) => {
    expect(messages(body).join("\n")).toContain(said);
  });

  it("a composition's background mode and a marker's at", () => {
    expect(messages("", ' background={{ mode: "color", color: "#000" }}').join("\n")).toContain(
      "`background.mode` is now `background.type`",
    );
    expect(messages("", "", '<Marker id="m" at={2} />').join("\n")).toContain("`at` is now `start`");
  });

  it.each([
    ["shadow", "radius", "blur", "{ radius: 3 }"],
    ["outline", "width", "thickness", "{ width: 3 }"],
    ["halftone", "mode", "type", '{ mode: "cmyk" }'],
  ])("the %s effect's %s param, and a keyframe of it", (type, from, to, params) => {
    const effect = (inner: string) =>
      `<Title id="h" start={0} duration={1}><Effect id="e" type="${type}" params={${params}}>${inner}</Effect>Hi</Title>`;
    expect(messages(effect("")).join("\n")).toContain(`param \`${from}\` of "${type}" is now \`${to}\``);
    const keyed = `<Title id="h" start={0} duration={1}><Effect id="e" type="${type}"><Keyframe id="k" param="${from}" at={0} value={1} /></Effect>Hi</Title>`;
    expect(messages(keyed).join("\n")).toContain(`param "${from}" of "${type}" is now "${to}"`);
  });
});

describe("a component's old prop", () => {
  it("is an error naming the new one: a lower third's variant is its type", () => {
    const text = `import { Composition, LowerThird, Track } from "@uberscene/kit";
export default function V() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="t" layout="free">
        <LowerThird id="l" name="Ada" variant="bar" start={0} duration={2} />
      </Track>
    </Composition>
  );
}
`;
    const said = () => {
      const state = resolve(collectModule(loadModule(text) as never), { assets: {} });
      return state.errors.map((e) => e.message).join("\n");
    };
    expect(said()).toContain("LowerThird: `variant` is now `type`; uberscene lint --fix moves the file");
  });
});

describe("an old value is an error naming the new one", () => {
  it.each([
    ['enter={{ type: "slide-up" }}', '"slide-up" is now "slideUp"'],
    ['enter={{ type: "fade", easing: "ease-in-out" }}', '"ease-in-out" is now "easeInOut"'],
    ['blend="soft-light"', '"soft-light" is now "softLight"'],
    ['animation={{ type: "word-by-word" }}', '"word-by-word" is now "wordByWord"'],
    ['style={{ decoration: "line-through" }}', '"line-through" is now "lineThrough"'],
  ])("%s", (prop, said) => {
    expect(messages(`<Title id="h" start={0} duration={1} ${prop}>Hi</Title>`).join("\n")).toContain(said);
  });

  it("on a keyframe, the captions and a crossfade's curve", () => {
    const key =
      '<Shape id="s" start={0} duration={1} type="circle"><Keyframe id="k" property="transform.opacity" at={0} value={1} easing="ease-in" /></Shape>';
    expect(messages(key).join("\n")).toContain('"ease-in" is now "easeIn"');
    expect(messages('<Captions id="c" animation="word-highlight" />').join("\n")).toContain(
      '"word-highlight" is now "wordHighlight"',
    );
  });

  it("in a crossfade's curve, and in a theme's own motion", () => {
    const sequence = (params: string) => `import { Clip, Composition, Track, Transition } from "@uberscene/kit";
export default function V() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="t">
        <Clip id="a" src="asset:a" duration={2} />
        <Transition id="x" type="crossfade" duration={0.5} params={${params}} />
        <Clip id="b" src="asset:a" duration={2} />
      </Track>
    </Composition>
  );
}
`;
    const said = (text: string) =>
      resolve(collectModule(loadModule(text) as never), { assets: {} })
        .errors.map((e) => e.message)
        .join("\n");
    expect(said(sequence('{ curve: "ease-in-out" }'))).toContain('params.curve "ease-in-out" is now "easeInOut"');
    expect(messages("", ' theme={{ motion: { enter: { type: "wipe-left", duration: 0.4 } } }}').join("\n")).toContain(
      '"wipe-left" is now "wipeLeft"',
    );
  });
});
