// An element's `effects` and a <Transition> check their type and params at compile time: a built-in's against the
// registry, a file's own against the schema it declared. The @ts-expect-error lines are the test (`pnpm typecheck`
// fails if one of them compiles); the runtime test checks the resolver agrees with the types on the lines that do
// compile.
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { Clip, Composition, effect, Track, Transition, transition } from "@uberscene/kit";
import { collectModule, resolve } from "@uberscene/sdk";

import { manifest } from "./helpers";

const glitch = effect({
  name: "typed-glitch",
  params: z.object({ amount: z.number().min(0).max(1).default(0.3), tint: z.string().default("#ffffff") }),
  shader: "vec4 effect(vec2 uv) { return texture(image, uv) * params.amount; }",
});
const bare = effect({ name: "typed-bare", shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });
const sweep = transition({
  name: "typed-sweep",
  params: z.object({ softness: z.number().default(0) }),
  shader: "vec4 transition(vec2 uv) { return uv.x < progress ? texture(to, uv) : texture(from, uv); }",
});

/** Elements that only need to type-check; never rendered. */
export const typeChecks = [
  <Clip key="1" id="a" src="asset:city" effects={[{ type: "blur", radius: 4 }]} />,
  <Clip key="2" id="b" src="asset:city" effects={[{ type: "levels", gamma: 1.2 }]} />,
  <Clip key="3" id="c" src="asset:city" effects={[{ type: glitch, amount: 0.5 }]} />,
  <Clip key="4" id="d" src="asset:city" effects={[{ type: bare }]} />,
  <Clip
    key="5"
    id="e"
    src="asset:city"
    effects={[
      {
        type: "blur",
        radius: [
          { at: 0, value: 0 },
          { at: 1, value: 8 },
        ],
      },
      { type: glitch, enabled: false, amount: [{ at: 0, value: 1 }] },
    ]}
  />,
  <Transition key="6" id="f" />,
  <Transition key="7" id="g" type="iris" params={{ sides: 5 }} />,
  <Transition key="8" id="h" type={sweep} params={{ softness: 0.2 }} />,
  // @ts-expect-error an unknown built-in type
  <Clip key="9" id="i" src="asset:city" effects={[{ type: "bluur" }]} />,
  // @ts-expect-error a param of the wrong type on a built-in
  <Clip key="10" id="j" src="asset:city" effects={[{ type: "blur", radius: "4px" }]} />,
  // @ts-expect-error a key of the wrong type on a built-in
  <Clip key="11" id="k" src="asset:city" effects={[{ type: "blur", radius: [{ at: 0, value: "4px" }] }]} />,
  // @ts-expect-error a param a built-in does not take
  <Clip key="12" id="l" src="asset:city" effects={[{ type: "blur", amount: 4 }]} />,
  // @ts-expect-error a param of the wrong type on the file's own effect
  <Clip key="13" id="m" src="asset:city" effects={[{ type: glitch, amount: "lots" }]} />,
  // @ts-expect-error a param the file's own effect does not declare
  <Clip key="14" id="n" src="asset:city" effects={[{ type: glitch, radius: 4 }]} />,
  // @ts-expect-error an effect has no params when it declares none
  <Clip key="15" id="o" src="asset:city" effects={[{ type: bare, amount: 1 }]} />,
  // @ts-expect-error a transition is not an effect
  <Clip key="16" id="p" src="asset:city" effects={[{ type: sweep }]} />,
  // @ts-expect-error an effect is not a transition
  <Transition key="17" id="q" type={glitch} />,
  // @ts-expect-error a param a built-in transition does not take
  <Transition key="18" id="r" type="wipe" params={{ sides: 5 }} />,
  // @ts-expect-error a plain string is not a declared effect: pass what effect() returned
  <Clip key="19" id="s" src="asset:city" effects={[{ type: "typed-glitch" as string }]} />,
];

describe("typed effect props", () => {
  it("resolve as the types say", () => {
    const state = resolve(
      collectModule({
        default: () => (
          <Composition fps={30} width={640} height={360}>
            <Track id="t">
              <Clip
                id="a"
                src="asset:city"
                in={0}
                out={2}
                effects={[
                  { type: glitch, amount: 0.5 },
                  { type: "blur", radius: 2 },
                ]}
              />
              <Transition id="x" type={sweep} duration={0.5} params={{ softness: 0.1 }} />
              <Clip id="c" src="asset:city" in={0} out={2} />
            </Track>
          </Composition>
        ),
      } as never),
      manifest,
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("a.effects.0")?.props.params).toEqual({ amount: 0.5, tint: "#ffffff" });
    expect(state.items.get("a.effects.1")?.props.params).toEqual({ radius: 2 });
    expect(state.items.get("x")?.props.params).toEqual({ softness: 0.1 });
  });
});
