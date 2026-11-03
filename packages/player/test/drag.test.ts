import { ManualClock, PlayerCore } from "@cutcraft/player";
import {
  FakeAudioOutput,
  FakeAudioSource,
  FakeFrameSource,
  fakeResolver,
  flush,
  recorderCanvas,
  recorderContext,
} from "./helpers/fakes";
import { makeState } from "./helpers/state";

/** A trim drag as the editor produces it: one resolved state per pointer move. */
function trimmed(out: number, inSec = 0) {
  return makeState({
    tracks: [
      {
        id: "main",
        items: [
          { id: "c1", kind: "clip", source: { in: inSec, out, asset: "a" } },
          { id: "c2", kind: "clip", source: { in: 0, out: 4, asset: "b" } },
        ],
      },
    ],
  });
}

function setup() {
  const frames = new Map<string, FakeFrameSource>();
  const timers: { fn: () => void; ms: number }[] = [];
  const core = new PlayerCore({
    state: trimmed(4),
    media: fakeResolver(["a", "b"]),
    clock: new ManualClock(),
    audioOutput: new FakeAudioOutput(),
    toContextTime: (t) => t,
    frameSourceFactory: (id) => {
      const f = new FakeFrameSource(id);
      frames.set(id, f);
      return f;
    },
    audioSourceFactory: (id) => new FakeAudioSource(id),
    createCanvas: recorderCanvas,
    raf: () => 0,
    cancelRaf: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: (fn, ms) => {
      const t = { fn, ms };
      timers.push(t);
      return t;
    },
    clearTimeout: (id) => {
      const i = timers.indexOf(id as { fn: () => void; ms: number });
      if (i >= 0) timers.splice(i, 1);
    },
  });
  const rec = recorderContext();
  core.attachCanvas(rec.canvas as unknown as HTMLCanvasElement);
  const lastDraw = () =>
    rec.calls
      .filter((c) => c.name === "drawImage")
      .map((c) => c.args[0] as { fake: string; timestamp: number })
      .pop();
  return { core, frames, timers, rec, lastDraw };
}

describe("drag loop", () => {
  it("keeps the decoder and its frames across 60 trim steps and paints without waiting", async () => {
    const { core, frames, timers, lastDraw } = setup();
    await core.seekTo(1);
    const a = frames.get("a")!;
    const decoder = core.compositor.pool.decoderFor("c1")!;
    const fetches = a.frameAtCalls.length;
    const streams = a.streamsStarted;
    for (let i = 0; i < 60; i++) {
      core.setState(trimmed(4 + i / 100));
      expect(core.compositor.pool.decoderFor("c1")).toBe(decoder);
    }
    expect(a.frameAtCalls.length).toBe(fetches);
    expect(a.streamsStarted).toBe(streams);
    expect(timers).toHaveLength(1);
    await flush();
    expect(decoder.placement.source!.out).toBeCloseTo(4.59);
    expect(a.frameAtCalls.length).toBe(fetches);
    expect(lastDraw()).toEqual({ fake: "a", timestamp: 1 });
    expect(core.duration).toBeCloseTo(8.59);
  });

  it("settles to the exact frame once the gesture is quiet", async () => {
    const { core, frames, timers, lastDraw } = setup();
    await core.seekTo(1);
    const a = frames.get("a")!;
    core.setState(trimmed(4, 2));
    await flush();
    expect(lastDraw()!.timestamp).toBeLessThan(3);
    expect(timers).toHaveLength(1);
    timers[0]!.fn();
    await flush();
    expect(lastDraw()).toEqual({ fake: "a", timestamp: 3 });
    expect(a.frameAtCalls[a.frameAtCalls.length - 1]).toBe(3);
  });

  it("does not arm a settle while playing", async () => {
    const { core, timers } = setup();
    await core.play();
    core.setState(trimmed(4.2));
    expect(timers).toHaveLength(0);
    core.pause();
  });
});
