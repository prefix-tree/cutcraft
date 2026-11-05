import { describe, expect, it } from "vitest";
import { z } from "zod";

import { collectModule, defineEffect, defineTransition, Executor, resolve } from "@cutcraft/kit";
import { lint, loadModule } from "@cutcraft/kit/source";

const INVERT = "vec4 effect(vec2 uv) { vec4 c = texture(image, uv); return vec4(1.0 - c.rgb, c.a); }";

const file = (body: string, declarations = "") => `import { z } from "zod";
import { Clip, Composition, defineEffect, defineTransition, Effect, Track, Transition } from "@cutcraft/kit";
${declarations}
export default function V() {
  return <Composition fps={30} width={640} height={360}><Track id="t">${body}</Track></Composition>;
}`;
const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const stateOf = (source: string) => resolve(collectModule(loadModule(source) as never), manifest);

describe("defineEffect and defineTransition", () => {
  it("return the name, and refuse a name or shader no renderer could use", () => {
    expect(defineEffect({ name: "my-invert", shader: INVERT })).toBe("my-invert");
    expect(defineTransition({ name: "my-cut", shader: "vec4 transition(vec2 uv) { return texture(to, uv); }" })).toBe(
      "my-cut",
    );
    expect(() => defineEffect({ name: "blur", shader: INVERT })).toThrow("is built in");
    expect(() => defineEffect({ name: "Bad Name", shader: INVERT })).toThrow("lowercase letters");
    expect(() => defineEffect({ name: "x", shader: "void main() {}" })).toThrow("defines vec4 effect(vec2 uv)");
    expect(() => defineEffect({ name: "tone", params: z.object({ mix: z.number() }), shader: INVERT })).toThrow(
      'param "mix" is a name every shader already uses',
    );
  });

  it("put a file's effects on its state, with params checked and filled by their schema", () => {
    const state = stateOf(
      file(
        `<Clip id="c" src="asset:city"><Effect id="g" type={glitch} params={{ amount: 0.5 }} /><Effect id="h" type={glitch} /></Clip>`,
        `const glitch = defineEffect({ name: "glitch", params: z.object({ amount: z.number().min(0).max(1).default(0.3) }), shader: \`${INVERT}\` });`,
      ),
    );
    expect(state.errors).toEqual([]);
    expect(state.shaders.map((s) => `${s.kind}:${s.name}`)).toEqual(["effect:glitch"]);
    expect(state.items.get("g")?.props.params).toEqual({ amount: 0.5 });
    expect(state.items.get("h")?.props.params).toEqual({ amount: 0.3 });

    const bad = stateOf(
      file(
        `<Clip id="c" src="asset:city"><Effect id="g" type="glitch" params={{ amount: 4 }} /></Clip>`,
        `const glitch = defineEffect({ name: "glitch", params: z.object({ amount: z.number().max(1) }), shader: \`${INVERT}\` });`,
      ),
    );
    expect(bad.errors.map((e) => `${e.id}.${e.prop}`)).toEqual(["g.params.amount"]);
  });

  it("let a transition of the file's own sit between two clips, and keep each file's shaders apart", () => {
    const state = stateOf(
      file(
        `<Clip id="a" src="asset:city" in={0} out={2} /><Transition id="x" type={sweep} duration={0.5} /><Clip id="b" src="asset:city" in={0} out={2} />`,
        `const sweep = defineTransition({ name: "sweep", shader: "vec4 transition(vec2 uv) { return uv.x < progress ? texture(to, uv) : texture(from, uv); }" });`,
      ),
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("x")?.between).toEqual(["a", "b"]);
    expect(stateOf(file(`<Clip id="a" src="asset:city" />`)).shaders).toEqual([]);
  });

  it("are accepted by the editor's actions", () => {
    const source = file(
      `<Clip id="a" src="asset:city" in={0} out={2} /><Transition id="x" type="crossfade" duration={0.5} /><Clip id="b" src="asset:city" in={0} out={2} />`,
      `const inv = defineEffect({ name: "inv", shader: \`${INVERT}\` });
const sweep = defineTransition({ name: "sweep", shader: "vec4 transition(vec2 uv) { return texture(to, uv); }" });`,
    );
    const exec = new Executor({ tree: collectModule(loadModule(source) as never), manifest });
    expect(exec.execute({ type: "effect/add", params: { id: "a", childId: "e1", type: "inv" } }).ok).toBe(true);
    expect(exec.execute({ type: "transition/update", params: { transitionId: "x", type: "sweep" } }).ok).toBe(true);
    expect(exec.state().items.get("x")?.props.type).toBe("sweep");
    expect(exec.execute({ type: "effect/add", params: { id: "a", childId: "e2", type: "nope" } }).ok).toBe(false);
  });

  it("want declarations at the top of the file, with a literal name and shader", () => {
    const d = lint(
      file(
        `<Clip id="a" src="asset:city" />`,
        `const ok = defineEffect({ name: "ok", params: z.object({}), shader: \`${INVERT}\` });
const name = "late";
const computed = defineEffect({ name, shader: \`${INVERT}\` });
function make() { return defineTransition({ name: "inner", shader: "" }); }`,
      ),
    ).filter((x) => x.rule === "declaration");
    expect(d.map((x) => x.message)).toEqual([
      expect.stringContaining("defineEffect() takes a literal name and shader"),
      expect.stringContaining("defineTransition() inside a function or expression"),
    ]);
  });
});

describe("timeline children inside overlays", () => {
  it("keep a title's text, and collect a Layer's effects apart from its free code", () => {
    const state = stateOf(`import { z } from "zod";
import { Composition, defineEffect, Effect, Keyframe, Layer, Title, Track } from "@cutcraft/kit";
const swap = defineEffect({ name: "swap", shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });
function Box() { return null; }
export default function V() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t" layout="free">
        <Title id="h" start={0} duration={2}>
          <Effect id="e1" type={swap} />
          Hello
        </Title>
        <Layer id="l" start={0} duration={2}>
          <Effect id="e2" type={swap} />
          <Keyframe id="k" property="transform.opacity" at={0} value={1} />
          <Box />
        </Layer>
      </Track>
    </Composition>
  );
}`);
    expect(state.errors).toEqual([]);
    expect(state.tree.byId.get("h")?.text).toBe("Hello");
    expect(state.items.get("l")?.children).toEqual(["e2", "k"]);
    expect(state.tree.byId.get("l")?.interior?.component).toBe("Box");
  });
});
