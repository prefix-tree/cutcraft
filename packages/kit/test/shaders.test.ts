import { describe, expect, it } from "vitest";
import { z } from "zod";

import { collectModule, Executor, effect, resolve, transition } from "@cutcraft/kit";
import { lint, loadModule } from "@cutcraft/kit/source";

const INVERT = "vec4 effect(vec2 uv) { vec4 c = texture(image, uv); return vec4(1.0 - c.rgb, c.a); }";

const file = (body: string, declarations = "") => `import { z } from "zod";
import { Clip, Composition, effect, transition, Effect, Track, Transition } from "@cutcraft/kit";
${declarations}
export default function V() {
  return <Composition fps={30} width={640} height={360}><Track id="t">${body}</Track></Composition>;
}`;
const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const stateOf = (source: string) => resolve(collectModule(loadModule(source) as never), manifest);

describe("effect() and transition()", () => {
  it("return the name, and refuse a name or shader no renderer could use", () => {
    expect(effect({ name: "my-invert", shader: INVERT })).toBe("my-invert");
    expect(transition({ name: "my-cut", shader: "vec4 transition(vec2 uv) { return texture(to, uv); }" })).toBe(
      "my-cut",
    );
    expect(() => effect({ name: "blur", shader: INVERT })).toThrow("is built in");
    expect(() => effect({ name: "Bad Name", shader: INVERT })).toThrow("lowercase letters");
    expect(() => effect({ name: "x", shader: "void main() {}" })).toThrow("defines vec4 effect(vec2 uv)");
    expect(() =>
      effect({
        name: "x",
        params: z.object({ amount: z.number() }),
        shader: "vec4 effect(vec2 uv) { return vec4(params.amont); }",
      }),
    ).toThrow("reads params.amont, which its params do not declare");
    expect(() => effect({ name: "x", params: z.object({ a__b: z.number() }), shader: INVERT })).toThrow(
      'param "a__b" is not a name',
    );
  });

  it("take an effect of several passes, each checked, and refuse passes on a transition or with a shader", () => {
    expect(effect({ name: "two-pass", passes: [INVERT, INVERT] })).toBe("two-pass");
    expect(() => effect({ name: "x", passes: [] })).toThrow("passes is empty");
    expect(() => effect({ name: "x", passes: [INVERT, "void main() {}"] })).toThrow(
      "pass 2 defines vec4 effect(vec2 uv)",
    );
    expect(() => effect({ name: "x", shader: INVERT, passes: [INVERT] })).toThrow("a shader or passes, not both");
    expect(() => effect({ name: "x" })).toThrow("a shader or passes, not both");
    expect(() =>
      transition({ name: "x", passes: ["vec4 transition(vec2 uv) { return texture(to, uv); }", "x"] }),
    ).toThrow("a transition is one shader");
    // Params are read as params.NAME, so any name is free: a GLSL function's or an input's.
    const free = z.object({ length: z.number(), image: z.number(), mix: z.number() });
    const reads = "vec4 effect(vec2 uv) { return texture(image, uv) * params.length * params.image * params.mix; }";
    expect(effect({ name: "free-names", params: free, shader: reads })).toBe("free-names");
  });

  it("check a built-in shader effect's params and fill its defaults", () => {
    const ok = stateOf(
      file(`<Clip id="c" src="asset:city"><Effect id="l" type="levels" params={{ gamma: 1.5 }} /></Clip>`),
    );
    expect(ok.errors).toEqual([]);
    expect(ok.items.get("l")?.props.params).toEqual({ black: 0, white: 1, gamma: 1.5 });
    const bad = stateOf(
      file(`<Clip id="c" src="asset:city"><Effect id="l" type="levels" params={{ white: 2 }} /></Clip>`),
    );
    expect(bad.errors.map((e) => e.prop)).toEqual(["params.white"]);
  });

  it("put a file's effects on its state, with params checked and filled by their schema", () => {
    const state = stateOf(
      file(
        `<Clip id="c" src="asset:city"><Effect id="g" type={glitch} params={{ amount: 0.5 }} /><Effect id="h" type={glitch} /></Clip>`,
        `const glitch = effect({ name: "glitch", params: z.object({ amount: z.number().min(0).max(1).default(0.3) }), shader: \`${INVERT}\` });`,
      ),
    );
    expect(state.errors).toEqual([]);
    expect(state.shaders.map((s) => `${s.kind}:${s.name}`)).toEqual(["effect:glitch"]);
    expect(state.items.get("g")?.props.params).toEqual({ amount: 0.5 });
    expect(state.items.get("h")?.props.params).toEqual({ amount: 0.3 });

    const bad = stateOf(
      file(
        `<Clip id="c" src="asset:city"><Effect id="g" type="glitch" params={{ amount: 4 }} /></Clip>`,
        `const glitch = effect({ name: "glitch", params: z.object({ amount: z.number().max(1) }), shader: \`${INVERT}\` });`,
      ),
    );
    expect(bad.errors.map((e) => `${e.id}.${e.prop}`)).toEqual(["g.params.amount"]);
  });

  it("let a transition of the file's own sit between two clips, and keep each file's shaders apart", () => {
    const state = stateOf(
      file(
        `<Clip id="a" src="asset:city" in={0} out={2} /><Transition id="x" type={sweep} duration={0.5} /><Clip id="b" src="asset:city" in={0} out={2} />`,
        `const sweep = transition({ name: "sweep", shader: "vec4 transition(vec2 uv) { return uv.x < progress ? texture(to, uv) : texture(from, uv); }" });`,
      ),
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("x")?.between).toEqual(["a", "b"]);
    expect(stateOf(file(`<Clip id="a" src="asset:city" />`)).shaders).toEqual([]);
  });

  it("are accepted by the editor's actions", () => {
    const source = file(
      `<Clip id="a" src="asset:city" in={0} out={2} /><Transition id="x" type="crossfade" duration={0.5} /><Clip id="b" src="asset:city" in={0} out={2} />`,
      `const inv = effect({ name: "inv", shader: \`${INVERT}\` });
const sweep = transition({ name: "sweep", shader: "vec4 transition(vec2 uv) { return texture(to, uv); }" });`,
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
        `const ok = effect({ name: "ok", params: z.object({}), shader: \`${INVERT}\` });
const multi = effect({ name: "multi", passes: [\`${INVERT}\`, \`${INVERT}\`] });
const name = "late";
const computed = effect({ name, shader: \`${INVERT}\` });
function make() { return transition({ name: "inner", shader: "" }); }`,
      ),
    ).filter((x) => x.rule === "declaration");
    expect(d.map((x) => x.message)).toEqual([
      expect.stringContaining("effect() takes a literal name and shader (or passes)"),
      expect.stringContaining("transition() inside a function or expression"),
    ]);
  });
});

describe("timeline children inside overlays", () => {
  it("keep a title's text, and collect a Layer's effects apart from its free code", () => {
    const state = stateOf(`import { z } from "zod";
import { Composition, effect, Effect, Keyframe, Layer, Title, Track } from "@cutcraft/kit";
const swap = effect({ name: "swap", shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });
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
