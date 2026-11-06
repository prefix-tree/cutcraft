import { describe, expect, it } from "vitest";

import { collectModule, Executor, resolve } from "@cutcraft/kit";
import { buildSourceIndex, foldToSource, loadModule } from "@cutcraft/kit/source";

const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const file = (children: string) => `import { z } from "zod";
import { Clip, Composition, defineEffect, Effect, Keyframe, Track } from "@cutcraft/kit";
const own = defineEffect({ name: "own", params: z.object({ amount: z.number().min(0).max(1).default(0.5) }), shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });
export default function V() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t">
        <Clip id="c" src="asset:city" in={2} out={6}>
          ${children}
        </Clip>
      </Track>
    </Composition>
  );
}
`;
const stateOf = (children: string) => resolve(collectModule(loadModule(file(children)) as never), manifest);
const errorsOf = (children: string) => stateOf(children).errors.map((e) => `${e.id}.${e.prop}: ${e.message}`);

describe("keyframes inside an effect", () => {
  it("are placed at the element's start plus their time", () => {
    const state = stateOf(`<Effect id="b" type="regionBlur">
            <Keyframe id="k1" param="box" at={0.5} value={[0, 0, 0.2, 0.2]} />
          </Effect>`);
    expect(state.errors).toEqual([]);
    const clip = state.items.get("c")!;
    expect(state.items.get("k1")).toMatchObject({ parent: "b", start: clip.start + 0.5 });
    expect(state.items.get("b")?.children).toEqual(["k1"]);
  });

  it("check the param against the effect: a built-in, a file's own, and a CSS one", () => {
    expect(
      errorsOf(`<Effect id="b" type="regionBlur"><Keyframe id="k1" param="boxx" at={0} value={1} /></Effect>
          <Effect id="o" type={own}><Keyframe id="k2" param="amount" at={0} value={2} /></Effect>
          <Effect id="r" type="brightness"><Keyframe id="k3" param="radius" at={0} value={10} /></Effect>
          <Effect id="s" type="brightness"><Keyframe id="k4" param="amount" at={0} value={10} /></Effect>`),
    ).toEqual([
      'k1.param: effect "regionBlur" has no param "boxx": it has box, radius, feather, roundness, inverted',
      'k2.value: param "amount" of "own": Too big: expected number to be <=1',
      'k3.param: effect "brightness" has no param "radius": it has amount, value',
    ]);
  });

  it("say where each form goes", () => {
    expect(
      errorsOf(`<Effect id="b" type="blur"><Keyframe id="k1" property="transform.opacity" at={0} value={1} /></Effect>
          <Keyframe id="k2" param="radius" at={0} value={1} />`),
    ).toEqual([
      'k1.property: a keyframe inside an <Effect> animates one of its params: param="…", not property',
      "k2.param: a keyframe with param goes inside the <Effect> it animates; on <clip> it takes property",
    ]);
    const old = errorsOf(`<Effect id="b" type="blur" />
          <Keyframe id="k3" property="effect.b.radius" at={0} value={1} />`);
    expect(old.join("\n")).toContain(`<Effect id="b" …><Keyframe param="radius" at={…} value={…} /></Effect>`);
    expect(errorsOf(`<Effect id="b" type="blur"><Keyframe id="k4" at={0} value={1} /></Effect>`)[0]).toContain(
      "give one",
    );
  });

  it("are added by keyframe/add with param, undone, and folded into the file inside the effect", () => {
    const text = file(`<Effect id="b" type="regionBlur" params={{ radius: 20 }} />`);
    const exec = new Executor({
      tree: collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }),
      manifest,
      now: () => 0,
    });
    const bad = exec.execute({
      type: "keyframe/add",
      params: { id: "b", keyId: "kz", param: "size", at: 0, value: 1 },
    });
    expect(bad.ok).toBe(false);
    const ok = exec.execute({
      type: "keyframe/add",
      params: { id: "b", keyId: "kz", param: "radius", at: 1, value: 40 },
    });
    expect(ok.ok).toBe(true);
    expect(exec.state().items.get("kz")).toMatchObject({ parent: "b" });
    const { text: folded, skipped } = foldToSource(text, exec.log(), exec.state());
    expect(skipped).toEqual([]);
    expect(folded).toMatch(
      /<Effect id="b" type="regionBlur" params=\{\{ radius: 20 \}\}>\s*<Keyframe id="kz" param="radius" at=\{1\} value=\{40\} \/>\s*<\/Effect>/,
    );
    exec.undo();
    expect(exec.state().items.has("kz")).toBe(false);
  });
});
