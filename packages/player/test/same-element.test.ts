import { collectModule, createPatchLog, resolve } from "@cutcraft/kit";
import { type ElementCellProps, sameElement, visiblePlacements } from "@cutcraft/player";

import * as sample from "../../kit/fixtures/sample";
import { fixtureManifest } from "./helpers/state";

function cell(state: ReturnType<typeof resolve>, id: string, time: number): ElementCellProps {
  const item = visiblePlacements(state, time).find((v) => v.placement.id === id)!;
  return { item, state, time, interior: null };
}

describe("sameElement", () => {
  const tree = collectModule(sample);
  const before = resolve(tree, fixtureManifest);
  const log = createPatchLog({ isSource: (id: string) => tree.byId.has(id) });
  log.append({ op: "set", id: "s1", prop: "width", value: 500 });
  const after = resolve(tree, fixtureManifest, log);

  it("is true for an untouched overlay after another element was patched", () => {
    expect(sameElement(cell(before, "t1", 1.5), cell(after, "t1", 1.5))).toBe(true);
  });

  it("is false for the patched element", () => {
    expect(sameElement(cell(before, "s1", 5.5), cell(after, "s1", 5.5))).toBe(false);
  });

  it("tracks the element-relative frame, not wall time", () => {
    expect(sameElement(cell(before, "t1", 1.5), cell(before, "t1", 1.5 + 0.01))).toBe(true);
    expect(sameElement(cell(before, "t1", 1.5), cell(before, "t1", 1.6))).toBe(false);
  });

  it("follows every change of time with exactTime, for the moments inside a frame that motion blur averages", () => {
    const exact = (time: number) => ({ ...cell(before, "t1", time), exact: true });
    expect(sameElement(exact(1.5), exact(1.5))).toBe(true);
    expect(sameElement(exact(1.5), exact(1.5 + 0.01))).toBe(false);
  });

  it("keeps identity for untouched placements across resolves", () => {
    expect(cell(before, "t1", 1.5).item.placement).toBe(cell(after, "t1", 1.5).item.placement);
    expect(cell(before, "s1", 5.5).item.placement).not.toBe(cell(after, "s1", 5.5).item.placement);
  });

  it("is false when the text changes", () => {
    const textLog = createPatchLog({ isSource: (id: string) => tree.byId.has(id) });
    textLog.append({ op: "text", id: "t1", text: "Other" });
    const retitled = resolve(tree, fixtureManifest, textLog);
    expect(sameElement(cell(before, "t1", 1.5), cell(retitled, "t1", 1.5))).toBe(false);
  });
});
