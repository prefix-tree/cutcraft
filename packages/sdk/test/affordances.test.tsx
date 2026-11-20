import { describe, expect, it } from "vitest";
import { z } from "zod";

import { Clip, Composition, Track } from "@uberscene/kit";
import {
  type ActionInput,
  affordances,
  buildSourceIndex,
  collectModule,
  Executor,
  ok,
  type PatchLog,
} from "@uberscene/sdk";

import { registerHandler } from "../src/actions/registry";
import { fixtureExecutor, manifest, serialize } from "./helpers";

describe("Executor.can", () => {
  it("answers yes for an edit execute would take, and changes nothing", () => {
    const exec = fixtureExecutor();
    const before = exec.state();
    const shape = serialize(before);
    expect(exec.can({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4.2 } })).toEqual({ ok: true });
    expect(exec.log().entries).toHaveLength(0);
    expect(exec.history().canUndo()).toBe(false);
    // The state before is still the answer, the same object, not a fresh resolve of the same patches.
    expect(exec.state()).toBe(before);
    expect(serialize(exec.state())).toEqual(shape);
  });

  it("gives the errors validate gives", () => {
    const exec = fixtureExecutor();
    const r = exec.can({ type: "clip/trim", params: { id: "nope", edge: "out", value: 1 } });
    expect(r.ok).toBe(false);
    expect(r.errors?.map((e) => e.code)).toEqual(["ELEMENT_NOT_FOUND"]);
  });

  it("refuses an edit that would break the file, as execute does, and leaves nothing behind", () => {
    registerHandler({
      type: "test/canSetSrc",
      validate: () => ok,
      apply: (a: { params: { src: string } }, log: PatchLog) =>
        log.append({ op: "set", id: "c2", prop: "src", value: a.params.src }),
      invert: () => ({ type: "test/canSetSrc", params: { src: "asset:city" } }),
      fold: () => [],
    } as never);
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    const input = { type: "test/canSetSrc", params: { src: "asset:nope" } } as never as ActionInput;
    const asked = exec.can(input);
    expect(asked.ok).toBe(false);
    expect(asked.errors?.map((e) => e.code)).toEqual(["BREAKS_FILE"]);
    expect(exec.log().entries).toHaveLength(0);
    expect(serialize(exec.state())).toEqual(before);
    expect(exec.execute(input).errors).toEqual(asked.errors);
  });

  it("leaves the executor working: the next execute starts from the right state", () => {
    const exec = fixtureExecutor();
    exec.can({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4.2 } });
    exec.can({ type: "audio/setVolume", params: { id: "a1", volume: 0.9 } });
    const r = exec.execute({ type: "audio/setVolume", params: { id: "a1", volume: 0.5 } });
    expect(r.ok).toBe(true);
    expect(exec.state().items.get("a1")?.props.volume).toBe(0.5);
    // The trim asked about was never made.
    expect(exec.state().items.get("c2")?.end).toBe(9);
    expect(exec.undo()?.ok).toBe(true);
    expect(exec.state().items.get("a1")?.props.volume).toBe(0.2);
  });

  it("asked after an edit, it answers against that edit's state", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "audio/setVolume", params: { id: "a1", volume: 0.5 } });
    const after = exec.state();
    expect(exec.can({ type: "audio/setVolume", params: { id: "a1", volume: 9 } }).ok).toBe(false);
    expect(exec.state()).toBe(after);
    expect(exec.state().items.get("a1")?.props.volume).toBe(0.5);
  });
});

describe("affordances", () => {
  it("of a literal clip on a sequence: its props and the clip edits", () => {
    const exec = fixtureExecutor();
    const a = affordances(exec.state(), "c2");
    expect(a).toMatchObject({ id: "c2", kind: "clip", editable: "literal", track: { id: "main", locked: false } });
    expect(a?.capabilities.timed).toBe(true);
    expect(a?.props.fit).toBe("literal");
    for (const type of ["clip/trim", "clip/split", "element/remove", "clip/move", "transform/update", "mask/create"])
      expect(a?.actions).toContain(type);
    // Not a title, a mask or a transition.
    for (const type of ["text/setContent", "mask/update", "transition/update", "layer/setProps"])
      expect(a?.actions).not.toContain(type);
  });

  it("of an element on a locked track: none of the edits that check the lock", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "track/setFlag", params: { trackId: "main", flag: "locked", value: true } });
    const a = affordances(exec.state(), "c2");
    expect(a?.track).toEqual({ id: "main", locked: true });
    for (const type of ["clip/trim", "clip/split", "element/remove", "mask/create", "source/setProps"])
      expect(a?.actions).not.toContain(type);
  });

  it("of a generated element: it can be baked, not moved", () => {
    const exec = fixtureExecutor();
    const a = affordances(exec.state(), "b1");
    expect(a?.editable).toBe("generated");
    expect(a?.actions).toContain("source/bake");
    expect(a?.actions).not.toContain("clip/move");
    expect(affordances(exec.state(), "c2")?.actions).not.toContain("source/bake");
  });

  it("of a Layer with a component inside: its handles", () => {
    const exec = fixtureExecutor();
    const a = affordances(exec.state(), "l1");
    expect(a?.kind).toBe("layer");
    expect(a?.actions).toEqual(expect.arrayContaining(["layer/setProps", "layer/setTiming", "transform/update"]));
  });

  it("of an element with a prop bound to the schema, and one that is an expression", () => {
    const text = `
import { z } from "zod";
import { Clip, Composition, Track } from "@uberscene/kit";

export const schema = z.object({ closeOut: z.number() });
export const defaults = { closeOut: 6 };

export default function Video({ closeOut }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="close" src="asset:city" in={0} out={closeOut} />
        <Clip id="tail" src="asset:city" in={1} out={closeOut + 1} />
      </Track>
    </Composition>
  );
}
`;
    const mod = {
      schema: z.object({ closeOut: z.number() }),
      defaults: { closeOut: 6 },
      default: ({ closeOut }: { closeOut: number }) => (
        <Composition fps={30} width={1920} height={1080}>
          <Track id="main">
            <Clip id="close" src="asset:city" in={0} out={closeOut} />
            <Clip id="tail" src="asset:city" in={1} out={closeOut + 1} />
          </Track>
        </Composition>
      ),
    };
    const tree = collectModule(mod, mod.defaults, { index: buildSourceIndex(text) });
    const exec = new Executor({ tree, manifest, now: () => 0 });
    expect(affordances(exec.state(), "close")?.props.out).toBe("bound");
    expect(affordances(exec.state(), "tail")?.props.out).toBe("locked");
    expect(affordances(exec.state(), "close")?.props.in).toBe("literal");
  });

  it("of nothing: undefined", () => {
    expect(affordances(fixtureExecutor().state(), "nope")).toBeUndefined();
  });
});
