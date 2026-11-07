import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  collectModule,
  cssOf,
  EFFECT_FAMILIES,
  EFFECTS,
  effectEntry,
  effectParamProblem,
  resolve,
  TRANSITION_FAMILIES,
  TRANSITIONS,
} from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const errorsOf = (effects: string) =>
  resolve(
    collectModule(
      loadModule(`import { Clip, Composition, Effect, Track } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:city">${effects}</Clip></Track></Composition>; }`) as never,
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
    expect(errorsOf(`<Effect id="b" type="brightness" params={{ amount: 3 }} />`)).toEqual([
      "b.params.amount: Too big: expected number to be <=1",
    ]);
    expect(errorsOf(`<Effect id="b" type="brightness" params={{ value: 10 }} />`)).toEqual([
      'b.params: Unrecognized key: "value"',
    ]);
    const state = resolve(
      collectModule(
        loadModule(`import { Clip, Composition, Effect, Track } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:city"><Effect id="s" type="shadow" /></Clip></Track></Composition>; }`) as never,
      ),
      manifest,
    );
    expect(state.items.get("s")?.props.params).toEqual({ x: 0, y: 4, radius: 8, color: "#000000", opacity: 0.5 });
  });

  it("takes each kind of value on one scale, and refuses the old ones", () => {
    expect(
      errorsOf(`<Effect id="b" type="brightness" params={{ amount: 10 }} />
          <Effect id="s" type="sepia" params={{ amount: 70 }} />
          <Effect id="v" type="vignette" params={{ amount: 50 }} />
          <Effect id="w" type="whiteBalance" params={{ temperature: 35 }} />
          <Effect id="z" type="zoomBlur" params={{ amount: 60 }} />
          <Effect id="d" type="shadow" params={{ blur: 4, color: "rgba(0,0,0,0.5)" }} />`),
    ).toEqual([
      "b.params.amount: Too big: expected number to be <=1",
      "s.params.amount: Too big: expected number to be <=1",
      "v.params.amount: Too big: expected number to be <=1",
      "w.params.temperature: Too big: expected number to be <=1",
      'z.params: Unrecognized key: "amount"',
      expect.stringContaining("d.params"),
      expect.stringContaining("d.params"),
    ]);
    // `amount` is a strength or share everywhere: never past -1..1.
    for (const [type, entry] of Object.entries(EFFECTS)) {
      const amount = (entry.params.shape as Record<string, z.ZodType | undefined>).amount;
      if (!amount) continue;
      expect([type, amount.safeParse(1).success, amount.safeParse(1.01).success]).toEqual([type, true, false]);
    }
  });

  it("refuses an unknown param on a shader effect too, where it was dropped before", () => {
    expect(errorsOf(`<Effect id="e" type="exposure" params={{ stop: 1 }} />`)).toEqual([
      'e.params: Unrecognized key: "stop"',
    ]);
  });

  it("checks a CSS effect's keyframed param by its schema", () => {
    expect(effectParamProblem("brightness", [], "amount", 5)).toMatchObject({ prop: "value" });
    expect(effectParamProblem("brightness", [], "amount", 0.5)).toBeNull();
    expect(effectEntry("brightness")?.draw.kind).toBe("css");
    expect(effectEntry("nope")).toBeUndefined();
  });

  it("blurs with the shared Gaussian, radius its standard deviation, and CSS blur() of the same length as the fallback", () => {
    const draw = effectEntry("blur")?.draw;
    expect(draw?.kind).toBe("shader");
    expect(cssOf("blur")?.({ radius: 6 })).toBe("blur(6px)");
    expect(effectParamProblem("blur", [], "radius", 500)).toMatchObject({ prop: "value" });
  });

  it("warms only with whiteBalance: no <ColorGrade>, no temperature or tint types, and a CSS fallback", () => {
    expect(effectEntry("temperature")).toBeUndefined();
    expect(effectEntry("tint")).toBeUndefined();
    expect(cssOf("whiteBalance")?.({ temperature: 0.4, tint: 0 })).toBe("sepia(0.2)");
    const errors = (body: string) =>
      resolve(
        collectModule(
          loadModule(`import { Clip, ColorGrade, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:city">${body}</Clip></Track></Composition>; }`) as never,
        ),
        manifest,
      ).errors.map((e) => e.message);
    expect(errors(`<ColorGrade id="g" temperature={0.2} />`)).toEqual([expect.stringContaining('type="whiteBalance"')]);
    expect(errors(`<Effect id="tp" type="temperature" params={{ amount: 0.2 }} />`)).toEqual([
      expect.stringContaining('type="whiteBalance" params={{ temperature: … }}'),
    ]);
    expect(errors(`<Keyframe id="k" property="colorGrade.temperature" at={0} value={0} />`)).toEqual([
      expect.stringContaining('<Effect type="whiteBalance" …><Keyframe param="temperature"'),
    ]);
  });
});
