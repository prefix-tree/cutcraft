// The `box-placement` rule: files written with transform.position, centre-relative component x and y, or the
// captions' flat x, y, width and style.position are moved to `box`, measured from the frame's top left.
import { describe, expect, it } from "vitest";

import { fixSource, lint } from "@uberscene/sdk";

const only = { rules: ["box-placement"] };
const wrap = (
  body: string,
  size = "width={1920} height={1080}",
) => `import { Captions, Composition, Keyframe, LowerThird, Shape, Title, Track } from "@uberscene/kit";

export default function V() {
  return (
    <Composition fps={30} ${size}>
      <Track id="t" layout="free">
        ${body}
      </Track>
    </Composition>
  );
}
`;
const fixed = (body: string, size?: string) => fixSource(wrap(body, size), only);

describe("box-placement", () => {
  it("is silent on a file in the new spelling", () => {
    const text = wrap(
      '<Title id="a" box={{ x: 100, y: 200 }} transform={{ scale: 2 }} duration={2}>Hi</Title><Captions id="c" box={{ y: 500, origin: "center" }} style={{ size: 40 }} />',
    );
    expect(lint(text, only)).toEqual([]);
  });

  it("moves transform.position to box, from the centre to the same point from the top left", () => {
    const out = fixed(
      '<Title id="a" transform={{ position: { x: -240, y: 170 }, scale: 1.2 }} duration={2}>Hi</Title>',
    );
    expect(out.text).toBe(
      wrap(
        '<Title id="a" box={{ x: 720, y: 710, origin: "center" }} transform={{ scale: 1.2 }} duration={2}>Hi</Title>',
      ),
    );
    expect(out.remaining).toEqual([]);
    // An expression keeps its words, with the half frame added.
    expect(fixed('<Title id="a" transform={{ position: { x: dx, y: 0 } }} duration={2}>Hi</Title>').text).toContain(
      'box={{ x: 960 + dx, y: 540, origin: "center" }}',
    );
  });

  it("moves a keyframe of transform.position to box, and keeps its parent's centre on the keyed point", () => {
    const out = fixed(
      '<Shape id="s" shape="circle" width={40} height={40} duration={2}><Keyframe id="k" property="transform.position.x" at={0} value={-100} /></Shape>',
    );
    expect(out.text).toContain('<Shape box={{ origin: "center" }} id="s"');
    expect(out.text).toContain('<Keyframe id="k" property="box.x" at={0} value={860} />');
  });

  it("moves a component's x and y, and fills an axis left out from its old default", () => {
    expect(fixed('<LowerThird id="l" name="Ada" y={300} />').text).toContain(
      '<LowerThird id="l" name="Ada" box={{ x: 400, y: 840 }} />',
    );
  });

  it("leaves a component of the file's own alone, and gives a kit component a box on a frame of another size", () => {
    const own =
      `function LowerThird() { return null; }\n${wrap('<LowerThird id="l" />', "width={1080} height={1920}")}`.replace(
        "LowerThird, ",
        "",
      );
    expect(lint(own, only)).toEqual([]);
    const out = fixed('<LowerThird id="l" name="Ada" />', "width={1080} height={1920}");
    expect(out.text).toContain('<LowerThird box={{ x: -20, y: 1290 }} id="l" name="Ada" />');
    expect(out.applied[0]?.severity).toBe("warning");
    // On the frame its default is measured on, a component with no box is the new spelling.
    expect(lint(wrap('<LowerThird id="l" name="Ada" />'), only)).toEqual([]);
  });

  it("moves the captions' style.position to the box their default lower area becomes", () => {
    expect(fixed('<Captions id="c" style={{ position: "top", size: 40 }} />').text).toContain(
      '<Captions box={{ y: 86.4, origin: "top" }} id="c" style={{ size: 40 }} />',
    );
    expect(fixed('<Captions id="c" style={{ position: 0.6 }} />', "width={1080} height={1920}").text).toContain(
      '<Captions box={{ y: 1152, origin: "center" }} id="c" />',
    );
    expect(fixed('<Captions id="c" style={{ position: "center" }} />').text).toContain(
      '<Captions box={{ y: 540, origin: "center" }} id="c" />',
    );
    // The bottom is the default: the position just goes.
    expect(fixed('<Captions id="c" style={{ position: "bottom", size: 30 }} />').text).toContain(
      '<Captions id="c" style={{ size: 30 }} />',
    );
  });

  it("moves the captions' flat x, y and width, y taking the place of the position as before", () => {
    expect(fixed('<Captions id="c" x={40} y={192} width={300} style={{ position: "top" }} />').text).toContain(
      '<Captions id="c" box={{ x: 1000, y: 732, width: 300, origin: "center" }} />',
    );
    // x alone keeps the default bottom origin, which centres it across as before.
    expect(fixed('<Captions id="c" x={-80} />').text).toContain('<Captions id="c" box={{ x: 880 }} />');
  });

  it("reads a size the file names with top-level constants", () => {
    const text = `const W = 1280;\nconst H = 720;\n${wrap('<Title id="a" transform={{ position: { x: 290, y: -22 } }}>Hi</Title>', "width={W} height={H}")}`;
    expect(fixSource(text, only).text).toContain('box={{ x: 930, y: 338, origin: "center" }}');
  });

  it("reports without a fix when the composition's size is not written as numbers", () => {
    const [d] = lint(
      wrap('<Title id="a" transform={{ position: { x: 1, y: 2 } }}>Hi</Title>', "width={W} height={H}"),
      only,
    );
    expect(d?.fix).toBeUndefined();
    expect(d?.message).toMatch(/not numbers/);
  });
});
