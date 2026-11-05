import { describe, expect, it } from "vitest";

import {
  collectModule,
  MASK_TYPES,
  resolve,
  TEXT_ANIMATION_PRESETS,
  TRANSITION_PARAMS,
  TRANSITION_TYPES,
  VIDEO_EFFECT_TYPES,
} from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const errorsOf = (body: string) =>
  resolve(
    collectModule(
      loadModule(`import { Clip, Composition, Effect, Title, Track, Transition } from "@cutcraft/kit";
export default function V() {
  return <Composition fps={30} width={640} height={360}><Track id="t">${body}</Track></Composition>;
}`) as never,
    ),
    { assets: { city: { id: "city", kind: "video", duration: 10 } } },
  )
    .errors.filter((e) => !e.message.includes("longer than"))
    .map((e) => `${e.id}${e.prop ? `.${e.prop}` : ""}: ${e.message.split("\n")[0]}`);

describe("what a file can say is what renders", () => {
  it("offers only the types the renderers draw", () => {
    expect(TRANSITION_TYPES).toEqual(["crossfade", "dipToBlack", "dipToWhite", "wipe", "slide", "push"]);
    expect(Object.keys(TRANSITION_PARAMS).sort()).toEqual([...TRANSITION_TYPES].sort());
    expect(VIDEO_EFFECT_TYPES).toHaveLength(21);
    expect(TEXT_ANIMATION_PRESETS).toHaveLength(9);
    expect(MASK_TYPES).toEqual(["shape", "drawn"]);
  });

  it("refuses a type or prop no renderer draws, naming it", () => {
    expect(
      errorsOf(
        `<Clip id="a" src="asset:city" chromaKey={{ color: "#0f0" }} /><Transition id="x" type="glitch" /><Clip id="b" src="asset:city"><Effect id="g" type="glow" /></Clip>`,
      ),
    ).toEqual([
      'a: Unrecognized key: "chromaKey"',
      'x.type: unknown transition "glitch": use one of crossfade, dipToBlack, dipToWhite, wipe, slide, push, or declare it with defineTransition()',
      expect.stringMatching(/^g\.type: unknown effect "glow": use one of .*, or declare it with defineEffect\(\)$/),
    ]);
    expect(errorsOf(`<Title id="h" emphasis="pulse" animation={{ preset: "bounce" }}>Hi</Title>`)).toEqual([
      expect.stringMatching(/^h\.animation\.preset: Invalid option/),
      'h: Unrecognized key: "emphasis"',
    ]);
  });
});
