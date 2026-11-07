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
    expect(effectParamProblem("blur", [], "radius", 500)).toMatchObject({ prop: "value" });
    expect(effectParamProblem("blur", [], "radius", 12)).toBeNull();
    expect(effectEntry("blur")?.draw.kind).toBe("css");
    expect(effectEntry("nope")).toBeUndefined();
  });
});
