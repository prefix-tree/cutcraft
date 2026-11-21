// Keys on an effect's params: a param written as a list of keys in place of its value, inside `effects`.
import { describe, expect, it } from "vitest";

import {
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  loadModule,
  resolve,
  withoutEffects,
} from "@uberscene/sdk";

const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const file = (effects: string) => `import { z } from "zod";
import { Clip, Composition, effect, Track } from "@uberscene/kit";
const own = effect({ name: "own", params: z.object({ amount: z.number().min(0).max(1).default(0.5) }), shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });
export default function V() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t">
        <Clip id="c" src="asset:city" in={2} out={6} effects={[${effects}]} />
      </Track>
    </Composition>
  );
}
`;
const stateOf = (effects: string) => resolve(collectModule(loadModule(file(effects)) as never), manifest);
const errorsOf = (effects: string) => stateOf(effects).errors.map((e) => `${e.id}.${e.prop}: ${e.message}`);

describe("keys on an effect's params", () => {
  it("are placed at the element's start plus their time, under the effect", () => {
    const state = stateOf(`{ type: "regionBlur", box: [{ at: 0.5, value: [0, 0, 0.2, 0.2] }] }`);
    expect(state.errors).toEqual([]);
    const clip = state.items.get("c")!;
    expect(state.items.get("c.effects.0.box.0")).toMatchObject({
      parent: "c.effects.0",
      start: clip.start + 0.5,
      props: { param: "box", at: 0.5, value: [0, 0, 0.2, 0.2] },
    });
    expect(state.items.get("c.effects.0")?.children).toEqual(["c.effects.0.box.0"]);
  });

  it("check the param against the effect: a built-in, a file's own, and a CSS one", () => {
    expect(
      errorsOf(`{ type: "regionBlur", boxx: [{ at: 0, value: 1 }] },
          { type: own, amount: [{ at: 0, value: 2 }] },
          { type: "brightness", radius: [{ at: 0, value: 10 }] },
          { type: "brightness", amount: [{ at: 0, value: 0.1 }] }`),
    ).toEqual([
      'c.effects.0.boxx: effect "regionBlur" has no param "boxx": it has box, radius, feather, roundness, inverted',
      'c.effects.1.amount.0.value: param "amount" of "own": Too big: expected number to be <=1',
      'c.effects.2.radius: effect "brightness" has no param "radius": it has amount',
    ]);
  });

  it("are added by key/add on the param's path, undone, and folded into the effect in the file", () => {
    const text = file(`{ type: "regionBlur", radius: 20 }`);
    const exec = new Executor({
      tree: collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }),
      manifest,
      now: () => 0,
    });
    expect(exec.execute({ type: "key/add", params: { id: "c", path: "effects.0.size", at: 0, value: 1 } }).ok).toBe(
      false,
    );
    const ok = exec.execute({ type: "key/add", params: { id: "c", path: "effects.0.radius", at: 1, value: 40 } });
    expect(ok.errors ?? []).toEqual([]);
    // The constant 20 becomes the first key, at 0, so the effect looks as it did until the new key.
    expect(exec.state().items.get("c.effects.0.radius.0")).toMatchObject({ props: { at: 0, value: 20 } });
    expect(exec.execute({ type: "key/add", params: { id: "c", path: "effects.0.radius", at: 3, value: 0 } }).ok).toBe(
      true,
    );
    expect(exec.state().items.get("c.effects.0.radius.2")).toMatchObject({ props: { at: 3, value: 0 } });
    const { text: folded, skipped } = foldToSource(text, exec.log(), exec.state());
    expect(skipped).toEqual([]);
    // The file holds the keys in the effect, one per line once the list is longer than a line.
    const reread = resolve(collectModule(loadModule(folded) as never), manifest);
    expect(reread.errors).toEqual([]);
    expect(
      [0, 1, 2].map((i) => reread.items.get(`c.effects.0.radius.${i}`)?.props).map((p) => [p?.at, p?.value]),
    ).toEqual([
      [0, 20],
      [1, 40],
      [3, 0],
    ]);
    expect(folded).toContain("radius: [");
    exec.undo();
    exec.undo();
    expect(exec.state().items.has("c.effects.0.radius.0")).toBe(false);
    expect(exec.state().items.get("c.effects.0")?.props.params).toMatchObject({ radius: 20 });
  });
});

describe("withoutEffects", () => {
  it("turns an effect off by the id the resolver gave it, and leaves the others on", () => {
    const tree = collectModule(
      loadModule(file(`{ type: "blur", radius: 4 }, { type: "brightness", amount: 0.2 }`)) as never,
    );
    const state = resolve(tree, manifest, withoutEffects(tree, ["c.effects.1"]));
    expect(state.errors).toEqual([]);
    expect(state.items.get("c.effects.0")?.props.enabled).toBe(true);
    expect(state.items.get("c.effects.1")?.props.enabled).toBe(false);
    expect(state.items.get("c.effects.1")?.props.params).toMatchObject({ amount: 0.2 });
  });
});
