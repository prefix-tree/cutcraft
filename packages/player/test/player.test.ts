import { ManualClock, PlayerCore, type PlayerEvents } from "@cutcraft/player";

import {
  FakeAudioOutput,
  FakeAudioSource,
  FakeFrameSource,
  fakeResolver,
  flush,
  recorderContext,
} from "./helpers/fakes";
import { makeState } from "./helpers/state";

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

function setup(opts: { loop?: boolean } = {}) {
  const clock = new ManualClock();
  const output = new FakeAudioOutput();
  const frames = new Map<string, FakeFrameSource>();
  const audio = new Map<string, FakeAudioSource>();
  const rafQueue: (() => void)[] = [];
  const events: { type: string; e: unknown }[] = [];
  const canvases: ReturnType<typeof recorderContext>[] = [];
  const core = new PlayerCore({
    state,
    media: fakeResolver(["a", "b"]),
    clock,
    audioOutput: output,
    toContextTime: (t) => t,
    frameSourceFactory: (id) => {
      const f = new FakeFrameSource(id);
      frames.set(id, f);
      return f;
    },
    audioSourceFactory: (id) => {
      const a = new FakeAudioSource(id);
      audio.set(id, a);
      return a;
    },
    createCanvas: (w, h) => {
      const r = recorderContext();
      (r.canvas as { width: number; height: number }).width = w;
      (r.canvas as { width: number; height: number }).height = h;
      canvases.push(r);
      return r.canvas as unknown as OffscreenCanvas;
    },
    raf: (cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    cancelRaf: () => {
      rafQueue.length = 0;
    },
    setInterval: () => 1,
    clearInterval: () => {},
    ...(opts.loop ? { loop: true } : {}),
  });
  const rec = recorderContext();
  core.attachCanvas(rec.canvas as unknown as HTMLCanvasElement);
  for (const type of [
    "play",
    "pause",
    "seeked",
    "ended",
    "frameupdate",
    "ratechange",
    "volumechange",
    "error",
  ] as const) {
    core.addEventListener(type, (e: PlayerEvents[typeof type]) => events.push({ type, e }));
  }
  const step = async (dt: number, n = 1): Promise<void> => {
    for (let i = 0; i < n; i++) {
      clock.advance(dt);
      const cbs = rafQueue.splice(0);
      cbs.forEach((cb) => cb());
      await flush(2);
    }
  };
  return { core, clock, output, frames, audio, rec, canvases, events, step, types: () => events.map((x) => x.type) };
}

describe("PlayerCore", () => {
  it("plays through to the end and emits play, frame updates and ended", async () => {
    const { core, step, types, events } = setup();
    await flush();
    await core.play();
    expect(core.isPlaying()).toBe(true);
    await step(0.1, 75);
    expect(core.isPlaying()).toBe(false);
    expect(core.getCurrentTime()).toBe(7);
    const t = types();
    expect(t[0]).toBe("play");
    expect(t[t.length - 1]).toBe("ended");
    expect(t.filter((x) => x === "frameupdate").length).toBeGreaterThan(50);
    const last = events.filter((x) => x.type === "frameupdate").pop()!.e as { frame: number };
    expect(last.frame).toBe(210);
  });

  it("loops without ending", async () => {
    const { core, step, types } = setup({ loop: true });
    await core.play();
    await step(0.1, 75);
    expect(core.isPlaying()).toBe(true);
    expect(core.getCurrentTime()).toBeLessThan(1);
    expect(types()).not.toContain("ended");
  });

  it("seeks to the exact frame while paused and emits seeked after the paint", async () => {
    const { core, rec, events } = setup();
    await core.seekTo(2);
    const draws = rec.calls
      .filter((c) => c.name === "drawImage")
      .map((c) => c.args[0] as { fake: string; timestamp: number });
    expect(draws[draws.length - 1]).toEqual({ fake: "a", timestamp: 2 });
    expect(events.find((x) => x.type === "seeked")?.e).toEqual({ time: 2 });
    expect(core.getTime()).toEqual({ time: 2, frame: 60 });
    expect(core.getCurrentFrame()).toBe(60);
  });

  it("re-anchors audio and video on seek while playing", async () => {
    const { core, step, output } = setup();
    await core.play();
    await step(0.1, 5);
    await core.seekTo(3.5);
    expect(core.getCurrentTime()).toBeCloseTo(3.5);
    expect(output.cancelAllCount).toBeGreaterThanOrEqual(1);
    await step(0.1, 2);
    expect(output.scheduled.some((s) => s.key.startsWith("c2"))).toBe(true);
  });

  it("keeps the newest seek when an older decode finishes after it", async () => {
    const { core, events } = setup();
    await core.seekTo(0.5);
    const seek = core.compositor.seek.bind(core.compositor);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    core.compositor.seek = async (t) => {
      await seek(t);
      if (t === 1) await blocked;
    };
    const older = core.seekTo(1);
    await core.seekTo(2);
    release();
    await older;
    expect(core.getCurrentTime()).toBe(2);
    expect(core.getTime()).toEqual({ time: 2, frame: 60 });
    expect(core.compositor.renderedFrame).toBe(60);
    expect(events.filter((event) => event.type === "seeked").map((event) => event.e)).toEqual([
      { time: 0.5 },
      { time: 2 },
    ]);
    core.dispose();
  });

  it("changes rate, volume and mute with events", async () => {
    const { core, output, types } = setup();
    core.playbackRate = 2;
    core.playbackRate = 9;
    expect(core.playbackRate).toBe(4);
    core.muted = true;
    core.volume = 0.5;
    expect(output.master.slice(-2)).toEqual([0, 0]);
    core.muted = false;
    expect(output.master[output.master.length - 1]).toBe(0.5);
    expect(types()).toEqual(["ratechange", "ratechange", "volumechange", "volumechange", "volumechange"]);
  });

  it("keeps decoders across setState when their source is unchanged", async () => {
    const { core } = setup();
    await core.seekTo(0.5);
    const before = core.compositor.pool.decoderFor("c1");
    expect(before).toBeDefined();
    core.setState(
      makeState({
        tracks: [
          {
            id: "main",
            items: [
              { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" }, props: { transform: { scale: 1.2 } } },
              { id: "c2", kind: "clip", source: { in: 1, out: 4, asset: "b" } },
            ],
          },
        ],
      }),
    );
    await flush();
    expect(core.compositor.pool.decoderFor("c1")).toBe(before);
    expect(core.duration).toBe(7);
  });

  it("renders a frame without moving the transport", async () => {
    const { core, rec } = setup();
    await core.seekTo(1);
    await core.renderFrame(2.5);
    const draws = rec.calls.filter((c) => c.name === "drawImage").map((c) => c.args[0] as { timestamp: number });
    expect(draws[draws.length - 1]!.timestamp).toBe(2.5);
    expect(core.getCurrentTime()).toBe(1);
  });

  it("disposes everything", async () => {
    const { core, frames, step } = setup();
    await core.play();
    await step(0.1, 10);
    core.dispose();
    await flush();
    for (const f of frames.values()) {
      expect(f.live.size).toBe(0);
      expect(f.closed).toBe(true);
    }
    expect(core.isPlaying()).toBe(false);
  });

  it("captures a labelled contact sheet without moving the transport or losing the attached canvas", async () => {
    const { core, rec, canvases, frames } = setup();
    await flush();
    await core.seekTo(1);
    const before = rec.calls.length;
    const sheet = await core.captureSheet([0.5, 5, 6.5], { columns: 2 });
    await flush();
    expect(core.getCurrentTime()).toBe(1);
    expect(sheet.width).toBe(640);
    expect(sheet.height).toBe(360);
    const sheetRec = canvases.find((c) => c.canvas === sheet)!;
    const draws = sheetRec.calls.filter((c) => c.name === "drawImage").map((c) => c.args.slice(1));
    expect(draws).toEqual([
      [0, 0, 320, 180],
      [320, 0, 320, 180],
      [0, 180, 320, 180],
    ]);
    expect(sheetRec.calls.filter((c) => c.name === "fillText").map((c) => c.args[0])).toEqual([
      "00:00.15",
      "00:05.00",
      "00:06.15",
    ]);
    expect(frames.get("a")!.frameAtCalls).toContain(0.5);
    expect(frames.get("b")!.frameAtCalls).toEqual(expect.arrayContaining([2, 3.5]));
    const after = rec.calls.slice(before);
    expect(after.filter((c) => c.name === "drawImage").length).toBeGreaterThan(0);
    expect(after.some((c) => c.name === "drawImage" && (c.args[0] as { timestamp?: number }).timestamp === 150)).toBe(
      false,
    );
  });

  it("captures without labels when asked and clamps columns to the cell count", async () => {
    const { core, canvases } = setup();
    await flush();
    const sheet = await core.captureSheet([2], { columns: 4, cellWidth: 160, labels: false });
    expect([sheet.width, sheet.height]).toEqual([160, 90]);
    const sheetRec = canvases.find((c) => c.canvas === sheet)!;
    expect(sheetRec.calls.filter((c) => c.name === "fillText")).toEqual([]);
    expect(sheetRec.calls.filter((c) => c.name === "drawImage")).toHaveLength(1);
  });
});
