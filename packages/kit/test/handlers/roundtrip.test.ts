import { describe, expect, it } from "vitest";
import { listHandlers, type ActionType } from "@cut/kit";
import { CASES, NO_STATE_CHANGE, SETUP, STUBS } from "./cases";
import { fixtureExecutor, serialize } from "../helpers";

const registered = listHandlers();

describe("every registered action", () => {
  it("has a sample case, and every case is registered", () => {
    const cased = Object.keys(CASES).sort();
    expect(registered.filter((t) => !cased.includes(t))).toEqual([]);
    expect(cased.filter((t) => !registered.includes(t as ActionType))).toEqual([]);
  });

  for (const type of registered) {
    const input = CASES[type]!;
    if (STUBS.includes(type)) {
      it(`${type} is a validated stub`, () => {
        const exec = fixtureExecutor();
        const r = exec.execute(input);
        expect(r.ok).toBe(false);
        expect(r.errors?.[0]?.message).toContain("not implemented");
      });
      continue;
    }
    it(`${type} applies, undoes and redoes`, () => {
      const exec = fixtureExecutor();
      for (const s of SETUP[type] ?? []) expect(exec.execute(s).ok).toBe(true);
      const before = serialize(exec.state());
      const r = exec.execute(input);
      expect(r.errors ?? []).toEqual([]);
      expect(r.ok).toBe(true);
      const after = serialize(exec.state());
      if (!NO_STATE_CHANGE.includes(type)) expect(after).not.toEqual(before);
      expect(exec.undo()?.ok).toBe(true);
      expect(serialize(exec.state())).toEqual(before);
      expect(exec.redo()?.ok).toBe(true);
      expect(serialize(exec.state())).toEqual(after);
    });
  }
});
