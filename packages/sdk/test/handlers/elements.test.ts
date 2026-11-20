import { describe, expect, it } from "vitest";

import type { ActionInput } from "@uberscene/sdk";

import { fixtureExecutor, serialize } from "../helpers";

// One create, update and remove for every kind that sits on a track and is not media: what used to be a copy of each
// per kind (text/, shape/, svg/, sticker/, adjustment/, nested/). Each undoes to the state it started from.
const KINDS: readonly { kind: string; id: string; create: ActionInput; update: ActionInput }[] = [
  {
    kind: "shape",
    id: "s1",
    create: {
      type: "element/create",
      params: {
        id: "s9",
        kind: "shape",
        trackId: "overlays",
        place: { anchor: "start" },
        props: { duration: 1, type: "circle", width: 50, height: 50 },
      },
    },
    update: { type: "element/update", params: { id: "s1", props: { cornerRadius: 0 } } },
  },
  {
    kind: "svg",
    id: "v1",
    create: {
      type: "element/create",
      params: {
        id: "v9",
        kind: "svg",
        trackId: "overlays",
        place: { anchor: "start" },
        props: { duration: 1, content: "<svg/>" },
      },
    },
    update: { type: "element/update", params: { id: "v1", props: { duration: 3 } } },
  },
  {
    kind: "sticker",
    id: "st1",
    create: {
      type: "element/create",
      params: {
        id: "st9",
        kind: "sticker",
        trackId: "overlays",
        place: { anchor: "c1" },
        props: { duration: 1, src: "asset:logo" },
      },
    },
    update: { type: "element/update", params: { id: "st1", props: { blend: "screen" } } },
  },
  {
    kind: "adjustment",
    id: "adj1",
    create: {
      type: "element/create",
      params: {
        id: "adj9",
        kind: "adjustment",
        trackId: "overlays",
        place: { anchor: "start" },
        props: { duration: 2 },
      },
    },
    update: { type: "element/update", params: { id: "adj1", props: { opacity: 0.5 } } },
  },
  {
    kind: "nested",
    id: "n1",
    create: {
      type: "element/create",
      params: {
        id: "n9",
        kind: "nested",
        trackId: "main",
        place: { after: "c3" },
        props: { of: "file:outro.tsx", duration: 2 },
      },
    },
    update: { type: "element/update", params: { id: "n1", props: { volume: 0.5 } } },
  },
];

describe.each(KINDS)("element actions on a $kind", ({ kind, id, create, update }) => {
  for (const [name, input] of [
    ["create", create],
    ["update", update],
    ["remove", { type: "element/remove", params: { id } } as ActionInput],
  ] as const) {
    it(`${name} applies and undoes`, () => {
      const exec = fixtureExecutor();
      const before = serialize(exec.state());
      const r = exec.execute(input);
      expect(r.errors).toBeUndefined();
      expect(r.ok).toBe(true);
      if (name === "create") expect(exec.state().items.get((input.params as { id: string }).id)?.kind).toBe(kind);
      if (name === "remove") expect(exec.state().items.has(id)).toBe(false);
      exec.undo();
      expect(serialize(exec.state())).toEqual(before);
    });
  }
});

describe("element/create", () => {
  it("does not make media, which clip/add and audio/add make", () => {
    const r = fixtureExecutor().execute({
      type: "element/create",
      params: { id: "x9", kind: "clip", trackId: "main", place: { after: "c3" }, props: { src: "asset:broll" } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors?.[0]?.message).toContain("clip/add");
  });
});
