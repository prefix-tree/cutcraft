import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  cssOf,
  EFFECT_FAMILIES,
  EFFECTS,
  effectEntry,
  effectParamProblem,
  TRANSITION_FAMILIES,
  TRANSITIONS,
} from "@uberscene/kit/schema";
import { collectModule, loadModule, resolve } from "@uberscene/sdk";

const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const errorsOf = (effects: string) =>
  resolve(
    collectModule(
      loadModule(`import { Clip, Composition, Track } from "@uberscene/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:city" effects={[${effects}]} /></Track></Composition>; }`) as never,
    ),
    manifest,
  ).errors.map((e) => `${e.id}.${e.prop}: ${e.message}`);

describe("the effect registry", () => {
  it("puts every effect and transition in exactly one family", () => {
    expect(Object.values(EFFECT_FAMILIES).flat().sort()).toEqual(Object.keys(EFFECTS).sort());
    expect(Object.values(TRANSITION_FAMILIES).flat().sort()).toEqual(Object.keys(TRANSITIONS).sort());
  });

  it("draws every CSS effect the same from its schema's defaults as from no params", () => {
    for (const [type, entry] of Object.entries(EFFECTS)) {
      const css = cssOf(type);
      if (!css) continue;
      expect([type, css(entry.params.parse({}))]).toEqual([type, css({})]);
    }
  });

  it("checks and fills a CSS effect's params, which it did not before", () => {
    expect(errorsOf(`{ type: "brightness", amount: 3 }`)).toEqual([
      "c.effects.0.amount: Too big: expected number to be <=1",
    ]);
    expect(errorsOf(`{ type: "brightness", value: 10 }`)).toEqual(['c.effects.0: Unrecognized key: "value"']);
    const state = resolve(
      collectModule(
        loadModule(`import { Clip, Composition, Track } from "@uberscene/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:city" effects={[{ type: "shadow" }]} /></Track></Composition>; }`) as never,
      ),
      manifest,
    );
    expect(state.items.get("c.effects.0")?.props.params).toEqual({
      x: 0,
      y: 4,
      radius: 8,
      color: "#000000",
      opacity: 0.5,
    });
  });

  it("takes each kind of value on one scale, and refuses the old ones", () => {
    expect(
      errorsOf(`{ type: "brightness", amount: 10 },
          { type: "sepia", amount: 70 },
          { type: "vignette", amount: 50 },
          { type: "whiteBalance", temperature: 35 },
          { type: "zoomBlur", amount: 60 },
          { type: "shadow", blur: 4, color: "rgba(0,0,0,0.5)" }`),
    ).toEqual([
      "c.effects.0.amount: Too big: expected number to be <=1",
      "c.effects.1.amount: Too big: expected number to be <=1",
      "c.effects.2.amount: Too big: expected number to be <=1",
      "c.effects.3.temperature: Too big: expected number to be <=1",
      'c.effects.4: Unrecognized key: "amount"',
      expect.stringContaining("c.effects.5"),
      expect.stringContaining("c.effects.5"),
    ]);
    // `amount` is a strength or share everywhere: never past -1..1.
    for (const [type, entry] of Object.entries(EFFECTS)) {
      const amount = (entry.params.shape as Record<string, z.ZodType | undefined>).amount;
      if (!amount) continue;
      expect([type, amount.safeParse(1).success, amount.safeParse(1.01).success]).toEqual([type, true, false]);
    }
  });

  it("refuses an unknown param on a shader effect too, where it was dropped before", () => {
    expect(errorsOf(`{ type: "exposure", stop: 1 }`)).toEqual(['c.effects.0: Unrecognized key: "stop"']);
  });

  it("checks a CSS effect's keyframed param by its schema", () => {
    expect(effectParamProblem("brightness", [], "amount", 5)).toMatchObject({ prop: "value" });
    expect(effectParamProblem("brightness", [], "amount", 0.5)).toBeNull();
    expect(effectEntry("brightness")?.draw.kind).toBe("css");
    expect(effectEntry("nope")).toBeUndefined();
  });

  it("blurs as CSS blur(), radius the Gaussian's standard deviation, as every other blur reads it", () => {
    expect(effectEntry("blur")?.draw.kind).toBe("css");
    expect(cssOf("blur")?.({ radius: 6 })).toBe("blur(6px)");
    expect(effectParamProblem("blur", [], "radius", 500)).toMatchObject({ prop: "value" });
  });

  it("warms only with whiteBalance: no <ColorGrade>, no temperature or tint types, and a CSS fallback", () => {
    expect(effectEntry("temperature")).toBeUndefined();
    expect(effectEntry("tint")).toBeUndefined();
    expect(cssOf("whiteBalance")?.({ temperature: 0.4, tint: 0 })).toBe("sepia(0.2)");
    const errors = (clip: string) =>
      resolve(
        collectModule(
          loadModule(`import { Clip, ColorGrade, Composition, Keyframe, Track } from "@uberscene/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t">${clip}</Track></Composition>; }`) as never,
        ),
        manifest,
      ).errors.map((e) => e.message);
    expect(errors(`<Clip id="c" src="asset:city"><ColorGrade id="g" temperature={0.2} /></Clip>`)).toEqual([
      expect.stringContaining('effects={[{ type: "whiteBalance"'),
    ]);
    expect(errors(`<Clip id="c" src="asset:city" effects={[{ type: "temperature", amount: 0.2 }]} />`)).toEqual([
      expect.stringContaining('effects={[{ type: "whiteBalance", temperature: … }]}'),
    ]);
    expect(
      errors(
        `<Clip id="c" src="asset:city"><Keyframe id="k" property="colorGrade.temperature" at={0} value={0} /></Clip>`,
      ),
    ).toEqual([expect.stringContaining("<Keyframe> is gone")]);
  });
});
