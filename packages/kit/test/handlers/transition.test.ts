import { describe, expect, it } from "vitest";
import { fixtureExecutor } from "../helpers";

describe("transitions", () => {
  it("requires adjacent siblings on a sequence track", () => {
    const exec = fixtureExecutor();
    const r = exec.execute({
      type: "transition/add",
      params: { transitionId: "x9", between: ["c1", "c3"], type: "wipe", duration: 0.5 },
    });
    expect(r.errors?.[0]?.code).toBe("NOT_ADJACENT");
  });

  it("checks handles against both clips", () => {
    const exec = fixtureExecutor();
    const r = exec.execute({
      type: "transition/add",
      params: { transitionId: "x9", between: ["c3", "n1"], type: "wipe", duration: 3.5 },
    });
    expect(r.errors?.[0]?.code).toBe("INSUFFICIENT_HANDLES");
    expect(
      exec.execute({
        type: "transition/add",
        params: { transitionId: "x9", between: ["c2", "g1"], type: "wipe", duration: 0.5 },
      }).errors?.[0]?.code,
    ).toBe("NOT_ADJACENT");
  });

  it("validates params per type and fills defaults", () => {
    const exec = fixtureExecutor();
    const bad = exec.execute({
      type: "transition/add",
      params: {
        transitionId: "x9",
        between: ["c3", "n1"],
        type: "wipe",
        duration: 0.5,
        params: { direction: "sideways" },
      },
    });
    expect(bad.errors?.[0]?.code).toBe("INVALID_PARAMS");
    const good = exec.execute({
      type: "transition/add",
      params: { transitionId: "x9", between: ["c3", "n1"], type: "wipe", duration: 0.5 },
    });
    expect(good.ok).toBe(true);
    const x9 = exec.state().items.get("x9")!;
    expect(x9.props.params).toEqual({ direction: "left", softness: 0 });
    expect(x9.between).toEqual(["c3", "n1"]);
    expect(x9.start).toBeCloseTo(10 + 5 / 1.2 - 0.5);
    expect(exec.state().items.get("n1")?.start).toBeCloseTo(x9.start);
  });

  it("edge transitions anchor to one clip", () => {
    const exec = fixtureExecutor();
    expect(
      exec.execute({
        type: "transition/add",
        params: { transitionId: "xin", between: { on: "c3", edge: "in" }, type: "dipToBlack", duration: 0.5 },
      }).ok,
    ).toBe(true);
    expect(exec.state().items.get("xin")?.start).toBe(10);
  });
});
