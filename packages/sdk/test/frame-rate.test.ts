// A composition's frame rate: a number, an NTSC name or a fraction, resolved to an exact `rate`; 29.97 as a number is
// refused, and the lint moves it to the string.
import { describe, expect, it } from "vitest";

import { collectModule, fixSource, lint, loadModule, resolve } from "@uberscene/sdk";

const file = (props: string, length = 2) => `import { Composition, Track, Title } from "@uberscene/kit";
export default function V() {
  return (
    <Composition ${props} width={640} height={360}>
      <Track id="t">
        <Title id="a" duration={${length}}>Hi</Title>
      </Track>
    </Composition>
  );
}
`;
const stateOf = (props: string, length?: number) =>
  resolve(collectModule(loadModule(file(props, length)) as never), { assets: {} });

describe("composition fps", () => {
  it("resolves an NTSC name to its exact rate and keeps fps as a number", () => {
    const state = stateOf('fps="29.97"');
    expect(state.errors).toEqual([]);
    expect(state.composition.rate).toEqual({ num: 30000, den: 1001 });
    expect(state.composition.fps).toBeCloseTo(29.97003, 5);
  });

  it("takes a whole number and a fraction", () => {
    expect(stateOf("fps={25}").composition.rate).toEqual({ num: 25, den: 1 });
    expect(stateOf("fps={{ num: 24000, den: 1001 }}").composition.rate).toEqual({ num: 24000, den: 1001 });
  });

  it("refuses 29.97 as a number and says to write the string", () => {
    const errors = stateOf("fps={29.97}").errors.map((e) => `${e.prop}: ${e.message}`);
    expect(errors).toContain('fps: fps 29.97 is 2997/100, not NTSC; write "29.97" for 30000/1001');
  });

  it("refuses a video longer than ticks hold exactly", () => {
    const errors = stateOf("fps={30}", 36_000).errors.map((e) => e.message);
    expect(errors.some((m) => /times are exact up to 35459 s/.test(m))).toBe(true);
  });

  it("refuses a sample rate that does not divide into ticks", () => {
    const errors = stateOf("fps={30} sampleRate={44101}").errors.map((e) => `${e.prop}: ${e.message}`);
    expect(errors.some((m) => m.startsWith("sampleRate: sample rate 44101"))).toBe(true);
  });
});

describe("ntsc-frame-rate lint", () => {
  const only = { rules: ["ntsc-frame-rate"] };

  it("flags the NTSC look-alike numbers, and fixes each to its string", () => {
    for (const fps of ["29.97", "23.976", "59.94", "47.952", "119.88"]) {
      const text = file(`fps={${fps}}`);
      const [found] = lint(text, only);
      expect(found?.message).toContain(`write fps="${fps}"`);
      expect(fixSource(text, only).text).toBe(file(`fps="${fps}"`));
    }
  });

  it("leaves whole rates and the strings alone", () => {
    expect(lint(file("fps={30}"), only)).toEqual([]);
    expect(lint(file('fps="29.97"'), only)).toEqual([]);
  });
});
