// <Effect> and <Transition> check their type and params at compile time: a built-in's against the registry, a file's
// own against the schema it declared. The @ts-expect-error lines are the test (`pnpm typecheck` fails if one of them
// compiles); the runtime test checks the resolver agrees with the types on the lines that do compile.
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  Clip,
  Composition,
  collectModule,
  Effect,
  effect,
  resolve,
  Track,
  Transition,
  transition,
} from "@cutcraft/kit";

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
  <Effect key="1" id="a" type="blur" params={{ radius: 4 }} />,
  <Effect key="2" id="b" type="levels" params={{ gamma: 1.2 }} />,
  <Effect key="3" id="c" type={glitch} params={{ amount: 0.5 }} />,
  <Effect key="4" id="d" type={bare} />,
  <Transition key="5" id="e" />,
  <Transition key="6" id="f" type="iris" params={{ sides: 5 }} />,
  <Transition key="7" id="g" type={sweep} params={{ softness: 0.2 }} />,
  // @ts-expect-error an unknown built-in type
  <Effect key="8" id="h" type="bluur" />,
  // @ts-expect-error a param of the wrong type on a built-in
  <Effect key="9" id="i" type="blur" params={{ radius: "4px" }} />,
  // @ts-expect-error a param a built-in does not take
  <Effect key="10" id="j" type="blur" params={{ amount: 4 }} />,
  // @ts-expect-error a param of the wrong type on the file's own effect
  <Effect key="11" id="k" type={glitch} params={{ amount: "lots" }} />,
  // @ts-expect-error a param the file's own effect does not declare
  <Effect key="12" id="l" type={glitch} params={{ radius: 4 }} />,
  // @ts-expect-error an effect has no params when it declares none
  <Effect key="13" id="m" type={bare} params={{ amount: 1 }} />,
  // @ts-expect-error a transition is not an effect
  <Effect key="14" id="n" type={sweep} />,
  // @ts-expect-error an effect is not a transition
  <Transition key="15" id="o" type={glitch} />,
  // @ts-expect-error a param a built-in transition does not take
  <Transition key="16" id="p" type="wipe" params={{ sides: 5 }} />,
  // @ts-expect-error a plain string is not a declared effect: pass what effect() returned
  <Effect key="17" id="q" type={"typed-glitch" as string} />,
];

describe("typed effect props", () => {
  it("resolve as the types say", () => {
    const state = resolve(
      collectModule({
        default: () => (
          <Composition fps={30} width={640} height={360}>
            <Track id="t">
              <Clip id="a" src="asset:city" in={0} out={2}>
                <Effect id="g" type={glitch} params={{ amount: 0.5 }} />
                <Effect id="b" type="blur" params={{ radius: 2 }} />
              </Clip>
              <Transition id="x" type={sweep} duration={0.5} params={{ softness: 0.1 }} />
              <Clip id="c" src="asset:city" in={0} out={2} />
            </Track>
          </Composition>
        ),
      } as never),
      manifest,
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("g")?.props.params).toEqual({ amount: 0.5, tint: "#ffffff" });
    expect(state.items.get("b")?.props.params).toEqual({ radius: 2 });
    expect(state.items.get("x")?.props.params).toEqual({ softness: 0.1 });
  });
});
