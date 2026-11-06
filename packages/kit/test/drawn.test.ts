import { describe, expect, it } from "vitest";

import {
  collectModule,
  EFFECTS,
  MASK_TYPES,
  resolve,
  TEXT_ANIMATION_PRESETS,
  TRANSITION_PARAMS,
  TRANSITION_TYPES,
  TRANSITIONS,
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
    expect(TRANSITION_TYPES).toEqual([
      "crossfade",
      "dipToBlack",
      "dipToWhite",
      "wipe",
      "slide",
      "push",
      "iris",
      "clockWipe",
      "blinds",
      "filmBurn",
      "pixelDissolve",
      "zoom",
    ]);
    expect(Object.keys(TRANSITION_PARAMS).sort()).toEqual([...TRANSITION_TYPES].sort());
    // The effect types are the registry's, each drawn one way (a CSS filter, a shader or the painter).
    expect(VIDEO_EFFECT_TYPES).toEqual(Object.keys(EFFECTS));
    for (const type of VIDEO_EFFECT_TYPES) expect(["css", "shader", "post"]).toContain(EFFECTS[type].draw.kind);
    for (const type of TRANSITION_TYPES) expect(["look", "shader"]).toContain(TRANSITIONS[type].draw.kind);
    expect(TEXT_ANIMATION_PRESETS).toHaveLength(9);
    expect(MASK_TYPES).toEqual(["shape", "drawn"]);
  });

  it("refuses a type or prop no renderer draws, naming it", () => {
    expect(
      errorsOf(
        `<Clip id="a" src="asset:city" chromaKey={{ color: "#0f0" }} /><Transition id="x" type="glitch" /><Clip id="b" src="asset:city"><Effect id="g" type="sparkle-dust" /></Clip>`,
      ),
    ).toEqual([
      'a: Unrecognized key: "chromaKey"',
      'x.type: unknown transition "glitch": use one of crossfade, dipToBlack, dipToWhite, wipe, slide, push, iris, clockWipe, blinds, filmBurn, pixelDissolve, zoom, or declare it with defineTransition()',
      expect.stringMatching(
        /^g\.type: unknown effect "sparkle-dust": use one of .*, or declare it with defineEffect\(\)$/,
      ),
    ]);
    expect(errorsOf(`<Title id="h" emphasis="pulse" animation={{ preset: "bounce" }}>Hi</Title>`)).toEqual([
      expect.stringMatching(/^h\.animation\.preset: Invalid option/),
      'h: Unrecognized key: "emphasis"',
    ]);
  });
});
