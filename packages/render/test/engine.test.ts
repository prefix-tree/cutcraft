import { describe, expect, it } from "vitest";

import { collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

import { needsBrowser, pickEngine } from "../src/renderer";

const stateOf = (props: string) =>
  resolve(
    collectModule(
      loadModule(`import { Composition, Track } from "@cutcraft/kit";
export default function Video() {
  return <Composition fps={30} width={640} height={360} ${props}><Track id="t" /></Composition>;
}`) as never,
    ),
    { assets: {} },
  );
const source = { text: "", manifest: { assets: {} } };

describe("pickEngine", () => {
  it("draws motion blur with the browser engine, and says so when asked for Node", () => {
    const blurred = stateOf("motionBlur={{}}");
    expect(needsBrowser(blurred)).toBe(true);
    expect(needsBrowser(stateOf(""))).toBe(false);
    expect(pickEngine(blurred, "auto", source)).toEqual({ engine: "browser" });
    expect(pickEngine(blurred, "node", source)).toEqual({
      engine: "node",
      note: "motion blur is drawn by the browser engine; this export leaves it out",
    });
    expect(pickEngine(blurred, undefined, undefined).note).toContain("motion blur");
  });

  it("draws the effects and transitions a file declares with the browser engine", () => {
    const state = resolve(
      collectModule(
        loadModule(`import { Clip, Composition, defineEffect, Effect, Track } from "@cutcraft/kit";
const inv = defineEffect({ name: "inv", shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });
export default function Video() {
  return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:a"><Effect id="e" type={inv} /></Clip></Track></Composition>;
}`) as never,
      ),
      { assets: { a: { id: "a", kind: "video", duration: 5 } } },
    );
    expect(needsBrowser(state)).toBe(true);
    expect(pickEngine(state, "node", source).note).toContain("defineEffect, defineTransition");
  });
});
