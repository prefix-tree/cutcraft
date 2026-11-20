import { FakeFrameSource, fakeResolver, flush, recorderCanvas, recorderContext } from "./helpers/fakes";
import { DEFAULT_MANIFEST, makeState } from "./helpers/state";
import { AssetSources, Compositor, ManualClock, type PlayerErrorEvent } from "./internal";

const state = makeState({
  tracks: [
    {
      id: "main",
      items: [
        { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
        { id: "x1", kind: "transition", duration: 1, props: { type: "crossfade", params: { curve: "linear" } } },
        { id: "c2", kind: "clip", source: { in: 0, out: 4, asset: "b" } },
      ],
    },
  ],
});

function setup() {
  const frames: [number, number][] = [];
  const sources = new AssetSources({
    media: fakeResolver(["a", "b"]),
    manifest: DEFAULT_MANIFEST,
    clock: new ManualClock(),
    onError: () => {},
    frameSourceFactory: (id) => new FakeFrameSource(id),
  });
  const comp = new Compositor(state, { sources, createCanvas: recorderCanvas, onFrame: (t, f) => frames.push([t, f]) });
  const rec = recorderContext();
  comp.attach(rec.ctx);
  return { comp, rec, frames };
}

const draws = (calls: { name: string; args: unknown[] }[]) =>
  calls.filter((c) => c.name === "drawImage").map((c) => (c.args[0] as { fake: string }).fake);

describe("Compositor", () => {
  it("paints background then ops in plan order", async () => {
    const { comp, rec, frames } = setup();
    await comp.tick(3.5, { wait: true });
    const names = rec.calls.map((c) => c.name);
    expect(names.indexOf("fillRect")).toBeLessThan(names.indexOf("drawImage"));
    expect(draws(rec.calls)).toEqual(["a", "b"]);
    expect(frames).toEqual([[3.5, 105]]);
    const alphas = rec.calls.filter((c) => c.name === "set:globalAlpha").map((c) => c.args[0]);
    expect(alphas).toEqual(expect.arrayContaining([1, 0.5]));
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

  it("steps through consecutive frames without restarting any decoder stream", async () => {
    const sources = new Map<string, FakeFrameSource>();
    const make = () =>
      new AssetSources({
        media: fakeResolver(["a", "b"]),
        manifest: DEFAULT_MANIFEST,
        clock: new ManualClock(),
        onError: () => {},
        frameSourceFactory: (id) => {
          const f = new FakeFrameSource(id);
          sources.set(id, f);
          return f;
        },
      });
    const stepped = new Compositor(state, { sources: make(), createCanvas: recorderCanvas });
    stepped.attach(recorderContext().ctx);
    for (let n = 0; n < 60; n++) await stepped.step(n / 30);
    const started = sources.get("a")!.streamsStarted;
    expect(started).toBeLessThanOrEqual(2);
    expect(stepped.renderedFrame).toBe(59);
    stepped.dispose();

    const seeked = new Compositor(state, { sources: make(), createCanvas: recorderCanvas });
    seeked.attach(recorderContext().ctx);
    for (let n = 0; n < 60; n++) {
      await seeked.seek(n / 30);
      await seeked.tick(n / 30, { wait: true });
    }
    expect(sources.get("a")!.streamsStarted).toBeGreaterThan(started * 10);
    seeked.dispose();
  });
  describe("when a decoder's first frame fails", () => {
    function failing() {
      const corrupt = new Error("corrupt sample");
      const sources = new AssetSources({
        media: fakeResolver(["a", "b"]),
        manifest: DEFAULT_MANIFEST,
        clock: new ManualClock(),
        onError: () => {},
        frameSourceFactory: (id) => {
          const f = new FakeFrameSource(id);
          if (id === "a") f.frameAt = () => Promise.reject(corrupt);
          return f;
        },
      });
      const errors: PlayerErrorEvent[] = [];
      const comp = new Compositor(state, { sources, createCanvas: recorderCanvas, onError: (e) => errors.push(e) });
      comp.attach(recorderContext().ctx);
      return { comp, errors, corrupt };
    }

    it("reports the error once from a tick and does not throw", async () => {
      const { comp, errors, corrupt } = failing();
      await expect(comp.tick(1, { wait: true })).resolves.toBeUndefined();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ id: "c1", asset: "a", fatal: false });
      expect(errors[0]!.error.message).toContain("corrupt sample");
      expect(errors[0]!.error.cause).toBe(corrupt);
      comp.dispose();
    });

    it("fails the export's step with that error", async () => {
      const { comp, errors } = failing();
      await expect(comp.step(1)).rejects.toThrow(/clip c1: corrupt sample/);
      expect(errors).toHaveLength(1);
      expect(errors[0]!.fatal).toBe(true);
      // The compositor is not left in flight: the next step runs, and fails the same way.
      await expect(comp.step(1 + 1 / 30)).rejects.toThrow(/corrupt sample/);
      comp.dispose();
    });

    it("rejects only the exact callers coalesced behind a failing tick", async () => {
      const { comp } = failing();
      const first = comp.tick(1, { wait: true });
      const preview = comp.tick(1.1, { wait: true });
      const exported = comp.step(1.2);
      await expect(first).resolves.toBeUndefined();
      await expect(preview).resolves.toBeUndefined();
      await expect(exported).rejects.toThrow(/corrupt sample/);
      comp.dispose();
    });
  });
});
