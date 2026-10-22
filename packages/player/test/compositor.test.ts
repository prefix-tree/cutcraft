import { AssetSources, Compositor, ManualClock } from "@cut/player";
import { FakeFrameSource, fakeResolver, flush, recorderCanvas, recorderContext } from "./helpers/fakes";
import { DEFAULT_MANIFEST, makeState } from "./helpers/state";

const state = makeState({ tracks: [{ id: "main", items: [
  { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
  { id: "x1", kind: "transition", duration: 1, props: { type: "crossfade", params: { curve: "linear" } } },
  { id: "c2", kind: "clip", source: { in: 0, out: 4, asset: "b" } },
] }] });

function setup() {
  const frames: [number, number][] = [];
  const sources = new AssetSources({ media: fakeResolver(["a", "b"]), manifest: DEFAULT_MANIFEST, clock: new ManualClock(), onError: () => {}, frameSourceFactory: (id) => new FakeFrameSource(id) });
  const comp = new Compositor(state, { sources, createCanvas: recorderCanvas, onFrame: (t, f) => frames.push([t, f]) });
  const rec = recorderContext();
  comp.attach(rec.ctx);
  return { comp, rec, frames };
}

const draws = (calls: { name: string; args: unknown[] }[]) => calls.filter((c) => c.name === "drawImage").map((c) => (c.args[0] as { fake: string }).fake);

describe("Compositor", () => {
  it("paints background then ops in plan order", async () => {
    const { comp, rec, frames } = setup();
    await comp.tick(3.5, { wait: true });
    const names = rec.calls.map((c) => c.name);
    expect(names.indexOf("fillRect")).toBeLessThan(names.indexOf("drawImage"));
    expect(draws(rec.calls)).toEqual(["a", "b"]);
    expect(frames).toEqual([[3.5, 105]]);
    const alphas = rec.calls.filter((c) => c.name === "set:globalAlpha").map((c) => c.args[0]);
    expect(alphas).toContain(0.5);
  });

  it("coalesces ticks that arrive while one is in flight", async () => {
    const { comp, frames } = setup();
    const first = comp.tick(1, { wait: true });
    void comp.tick(1.1, { wait: false });
    void comp.tick(1.2, { wait: false });
    await first;
    await flush();
    expect(frames.map(([, f]) => f)).toEqual([30, 36]);
  });

  it("skips repainting the same frame index", async () => {
    const { comp, frames, rec } = setup();
    await comp.tick(1, { wait: true });
    const before = rec.calls.length;
    await comp.tick(1.001, { wait: false });
    expect(rec.calls.length).toBe(before);
    expect(frames).toHaveLength(1);
    await comp.tick(1.04, { wait: false });
    expect(frames).toHaveLength(2);
  });

  it("draws nothing for a decoder that has no frame yet while playing", async () => {
    const { comp, rec } = setup();
    await comp.tick(0, { wait: false });
    expect(draws(rec.calls)).toEqual([]);
    await flush();
    await comp.tick(0.5, { wait: false });
    expect(draws(rec.calls)).toEqual(["a"]);
  });
});
