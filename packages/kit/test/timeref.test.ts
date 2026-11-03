import { describe, expect, it } from "vitest";
import { parseTimeRef, resolveTimeRef } from "@cutcraft/kit";
import { manifest } from "./helpers";

const interview = manifest.assets.interview!;

describe("parseTimeRef", () => {
  it("parses seconds and references", () => {
    expect(parseTimeRef(1.5)).toEqual({ kind: "seconds", value: 1.5 });
    expect(parseTimeRef("word:12")).toEqual({ kind: "word", index: 12, edge: "start" });
    expect(parseTimeRef("shot:4.end")).toEqual({ kind: "shot", index: 4, edge: "end" });
    expect(parseTimeRef("marker:m1")).toEqual({ kind: "marker", id: "m1" });
  });

  it("rejects malformed input", () => {
    expect(parseTimeRef(-1).kind).toBe("invalid");
    expect(parseTimeRef("word:x").kind).toBe("invalid");
    expect(parseTimeRef({}).kind).toBe("invalid");
  });
});

describe("resolveTimeRef", () => {
  const ctx = { id: "c1", prop: "in" };
  it("looks up words, shots, silences and markers", () => {
    expect(resolveTimeRef("word:3", interview, new Map(), ctx)).toBe(2);
    expect(resolveTimeRef("word:3.end", interview, new Map(), ctx)).toBe(2.4);
    expect(resolveTimeRef("shot:2", interview, new Map(), ctx)).toBe(21);
    expect(resolveTimeRef("silence:1.end", interview, new Map(), ctx)).toBe(8);
    expect(resolveTimeRef("marker:m", interview, new Map([["m", 7]]), ctx)).toBe(7);
  });

  it("returns a typed error for unknown references", () => {
    expect(resolveTimeRef("word:999", interview, new Map(), ctx)).toMatchObject({
      code: "UNKNOWN_REF",
      id: "c1",
      prop: "in",
    });
    expect(resolveTimeRef("word:1", null, new Map(), ctx)).toMatchObject({ code: "UNKNOWN_REF" });
  });
});
