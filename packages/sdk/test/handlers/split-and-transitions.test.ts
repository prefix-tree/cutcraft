// Splitting a clip that animates, and removing a clip whose transition has a sound on its cut. Each case runs on the
// text of a file, as the editor does, and checks the edit leaves no errors, writes back a file that reads the same,
// and undoes to the start.
import { describe, expect, it } from "vitest";

import { type ActionInput, Executor, foldToSource } from "@uberscene/sdk";

import { resolveText, treeOf } from "../editing/corpus";
import { manifest, serialize } from "../helpers";

const FILE = `import { Audio, Clip, Composition, Effect, Keyframe, SpeedKey, Track, Transition } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="a" src="asset:city" in={0} out={6}>
          <Keyframe id="a-s0" property="transform.scale.x" at={0} value={1} />
          <Keyframe id="a-s1" property="transform.scale.x" at={6} value={1.3} />
          <Effect id="a-blur" type="blur" params={{ radius: 0 }}>
            <Keyframe id="a-b0" param="radius" at={1} value={0} easing="easeInOut" />
            <Keyframe id="a-b1" param="radius" at={5} value={8} />
          </Effect>
        </Clip>
        <Transition id="x1" type="crossfade" duration={0.5} />
        <Clip id="b" src="asset:interview" in={0} out={4}>
          <SpeedKey id="b-v0" at={0} speed={1} />
          <SpeedKey id="b-v1" at={2} speed={0.5} />
        </Clip>
        <Transition id="x2" type="wipe" duration={0.5} />
        <Clip id="c" src="asset:city" in={6} out={10} />
      </Track>
      <Track id="sounds" role="effects" layout="free">
        <Audio id="cue-x1" src="asset:bed" anchor="x1" offset={-0.2} duration={0.5} />
        <Audio id="cue-x2" src="asset:bed" anchor="x2" duration={0.5} />
      </Track>
    </Composition>
  );
}
`;

function executor(): Executor {
  return new Executor({ tree: treeOf(FILE), manifest, now: () => 0 });
}

const props = (exec: Executor, id: string) => exec.state().tree.byId.get(id)?.props as Record<string, unknown>;
const childIds = (exec: Executor, id: string) =>
  exec
    .state()
    .tree.byId.get(id)
    ?.children.map((c) => c.id);

/** Runs `input`: no errors, the folded file reads back as the editor holds it, `check` passes, undo restores. */
function edited(input: ActionInput, check: (exec: Executor) => void): void {
  const exec = executor();
  const before = serialize(exec.state());
  expect(exec.state().errors).toEqual([]);
  const result = exec.execute(input);
  expect(result.errors ?? []).toEqual([]);
  expect(result.ok).toBe(true);
  expect(exec.state().errors).toEqual([]);
  check(exec);
  const folded = foldToSource(FILE, exec.log(), exec.state());
  expect(folded.skipped).toEqual([]);
  expect(serialize(resolveText(folded.text, manifest))).toEqual(serialize(exec.state()));
  expect(exec.undo()?.ok).toBe(true);
  expect(serialize(exec.state())).toEqual(before);
}

describe("splitting a clip that animates", () => {
  it("gives each half a key at the cut with the value the clip had there", () => {
    edited({ type: "clip/split", params: { id: "a", at: 3, newId: "a2" } }, (exec) => {
      // The scale ramps 1 to 1.3 over six seconds: 1.15 at the cut, where the first half now ends and the second starts.
      expect(childIds(exec, "a")).toEqual(["a-s0", "a-s1_cut", "a-blur"]);
      expect(props(exec, "a-s1_cut")).toMatchObject({ at: 3, value: 1.15, property: "transform.scale.x" });
      expect(childIds(exec, "a2")).toEqual(["a-s1_cut_b", "a-s1_b", "a-blur_b"]);
      expect(props(exec, "a-s1_cut_b")).toMatchObject({ at: 0, value: 1.15 });
      expect(props(exec, "a-s1_b")).toMatchObject({ at: 3, value: 1.3 });
    });
  });

  it("splits the keys inside an effect the same way, eased as the curve was where it was cut", () => {
    edited({ type: "clip/split", params: { id: "a", at: 3, newId: "a2" } }, (exec) => {
      // The blur eases in-out from 0 at 1 s to 8 at 5 s: halfway in time is halfway in value, 4.
      expect(childIds(exec, "a-blur")).toEqual(["a-b0", "a-b1_cut"]);
      expect(props(exec, "a-b1_cut")).toMatchObject({ at: 3, value: 4, param: "radius" });
      expect(childIds(exec, "a-blur_b")).toEqual(["a-b1_cut_b", "a-b1_b"]);
      expect(props(exec, "a-b1_cut_b")).toMatchObject({ at: 0, value: 4, easing: "easeInOut" });
      expect(props(exec, "a-b1_b")).toMatchObject({ at: 2, value: 8 });
    });
  });

  it("cuts a speed ramp, the second half starting at the speed the clip had", () => {
    edited({ type: "clip/split", params: { id: "b", at: 6.5, newId: "b2" } }, (exec) => {
      const cut = exec.state().items.get("b")!.start;
      expect(cut).toBeLessThan(6.5);
      const speeds = (id: string) =>
        exec
          .state()
          .tree.byId.get(id)!
          .children.map((k) => [k.props.at, k.props.speed] as const);
      expect(speeds("b").at(-1)?.[0]).toBeCloseTo(6.5 - cut, 6);
      expect(speeds("b2")[0]?.[0]).toBe(0);
      expect(speeds("b").at(-1)?.[1]).toBe(speeds("b2")[0]?.[1]);
    });
  });
});

describe("removing a clip whose transition has a sound on its cut", () => {
  it("moves the sound to the clip the transition led into, keeping its place on the cut", () => {
    edited({ type: "element/remove", params: { id: "a" } }, (exec) => {
      expect(exec.state().tree.byId.has("x1")).toBe(false);
      expect(props(exec, "cue-x1")).toMatchObject({ anchor: "b", offset: -0.2 });
    });
  });

  it("keeps a transition that still joins two clips, and its sound with it", () => {
    edited({ type: "element/remove", params: { id: "b" } }, (exec) => {
      // x1 now joins a and c; x2 is left with one side and goes, its sound to c, the clip it led into.
      expect(exec.state().tree.byId.has("x1")).toBe(true);
      expect(props(exec, "cue-x1")).toMatchObject({ anchor: "x1" });
      expect(exec.state().tree.byId.has("x2")).toBe(false);
      expect(props(exec, "cue-x2")).toMatchObject({ anchor: "c", offset: 0 });
    });
  });

  it("carries the sound when the transition itself is removed", () => {
    edited({ type: "transition/remove", params: { transitionId: "x2" } }, (exec) => {
      expect(props(exec, "cue-x2")).toMatchObject({ anchor: "c" });
    });
  });
});
