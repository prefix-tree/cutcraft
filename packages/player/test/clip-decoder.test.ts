import { ClipDecoder, QUEUE_MAX, QUEUE_TARGET } from "@cutcut/player";
import { FakeFrameSource, flush } from "./helpers/fakes";
import { childrenOf, makeState } from "./helpers/state";

const state = makeState({ tracks: [{ id: "main", items: [
  { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
  { id: "c2", kind: "clip", source: { in: 0, out: 4, speed: 2, asset: "a" } },
  { id: "c3", kind: "clip", source: { in: 0, out: 4, asset: "a" }, props: { reverse: true } },
  { id: "c4", kind: "clip", source: { in: 0, out: 4, asset: "a" }, children: [{ id: "fr", kind: "freeze", props: { at: 1.5, start: 1, duration: 0.5 } }] },
] }] });

function decoder(id: string, speed = 1) {
  const source = new FakeFrameSource("a");
  const p = state.items.get(id)!;
  return { source, d: new ClipDecoder(source, p, childrenOf(state, id), () => speed), p };
}

describe("ClipDecoder", () => {
  it("streams ahead into a bounded queue and closes consumed frames", async () => {
    const { source, d, p } = decoder("c1");
    await d.prime(p.start);
    await flush();
    expect(d.queued).toBeGreaterThan(0);
    expect(d.queued).toBeLessThanOrEqual(QUEUE_MAX);
    const f = await d.frameFor(p.start + 0.5, true);
    expect(f!.timestamp).toBeCloseTo(0.5);
    d.advance(p.start + 0.5);
    await flush();
    expect(source.closedCount).toBeGreaterThanOrEqual(14);
    expect(source.live.size).toBeLessThanOrEqual(QUEUE_MAX + 1);
    d.dispose();
    expect(source.live.size).toBe(0);
  });

  it("drops frames at double speed", async () => {
    const { source, d, p } = decoder("c2", 2);
    await d.prime(p.start);
    await flush();
    const f = await d.frameFor(p.start + 0.25, true);
    expect(f!.timestamp).toBeCloseTo(0.5);
    expect(source.closedCount).toBeGreaterThanOrEqual(14);
    expect(d.mode).toBe("forward");
  });

  it("switches to seek mode above the speed threshold", async () => {
    const { source, d, p } = decoder("c1", 8);
    expect(d.mode).toBe("seek");
    await d.prime(p.start);
    const f = await d.frameFor(p.start + 1, true);
    expect(f!.timestamp).toBeCloseTo(1);
    expect(source.streamsStarted).toBe(0);
  });

  it("serves descending frames in reverse", async () => {
    const { d, p } = decoder("c3");
    await d.prime(p.start);
    const a = await d.frameFor(p.start + 0.1, true);
    const b = await d.frameFor(p.start + 0.2, true);
    const c = await d.frameFor(p.start + 1.5, true);
    expect(a!.timestamp).toBeCloseTo(3.9);
    expect(b!.timestamp).toBeCloseTo(3.8);
    expect(c!.timestamp).toBeCloseTo(2.5);
    expect(d.mode).toBe("reverse");
  });

  it("retains exactly one frame per freeze", async () => {
    const { source, d, p } = decoder("c4");
    await d.prime(p.start);
    const a = await d.frameFor(p.start + 1.2, true);
    const b = await d.frameFor(p.start + 1.4, true);
    expect(a).toBe(b);
    expect(a!.timestamp).toBe(1.5);
    expect(source.retains).toBe(1);
    expect(source.frameAtCalls.filter((t) => t === 1.5)).toHaveLength(1);
    const after = await d.frameFor(p.start + 1.6, true);
    expect(after!.timestamp).toBeCloseTo(1.6);
  });

  it("returns the stale frame while a slow stream catches up", async () => {
    const { source, d, p } = decoder("c1");
    source.slow = true;
    await d.prime(p.start);
    const stale = await d.frameFor(p.start + 0.5, false);
    expect(stale!.timestamp).toBe(0);
    source.release(30);
    await flush();
    let fresh = await d.frameFor(p.start + 0.5, false);
    for (let i = 0; i < 10 && fresh!.timestamp < 0.5; i++) { d.advance(p.start + 0.5); await flush(2); fresh = await d.frameFor(p.start + 0.5, false); }
    expect(fresh!.timestamp).toBeCloseTo(0.5);
  });

  it("fetches the exact frame when waiting after a jump back", async () => {
    const { d, p } = decoder("c1");
    await d.prime(p.start + 2);
    const f = await d.frameFor(p.start + 1, true);
    expect(f!.timestamp).toBeCloseTo(1);
  });

  it("picks the frame for an exact n/fps time when container timestamps are rounded to the millisecond", async () => {
    class RoundedSource extends FakeFrameSource {
      override async *stream(from: number, to: number) {
        for await (const f of super.stream(from, to)) {
          const ms = Math.round(f.timestamp * 1000) / 1000;
          yield Object.assign(f, { timestamp: ms });
        }
      }
      override async frameAt(t: number) {
        const f = await super.frameAt(t);
        return f ? Object.assign(f, { timestamp: Math.round(f.timestamp * 1000) / 1000 }) : f;
      }
    }
    const source = new RoundedSource("a");
    const p = state.items.get("c1")!;
    const d = new ClipDecoder(source, p, childrenOf(state, "c1"), () => 1);
    await d.prime(p.start);
    await flush();
    // 2/30 = 0.0666…, the frame is stamped 0.067: without a tolerance the previous frame (0.033) is drawn.
    const f = await d.frameFor(p.start + 2 / 30, true);
    expect(f!.timestamp).toBe(0.067);
    const g = await d.frameFor(p.start + 5 / 30, true);
    expect(g!.timestamp).toBe(0.167);
    d.dispose();
  });

  it("with exact, waits for a slow frame instead of drawing a stale one", async () => {
    const { source, d, p } = decoder("c1");
    await d.prime(p.start);
    await flush();
    source.slow = true;
    const slow = d.frameFor(p.start + 1, true, true);
    let settled = false;
    void slow.then(() => { settled = true; });
    await flush(3);
    expect(settled).toBe(false);
    source.release(40);
    const f = await slow;
    expect(f!.timestamp).toBeCloseTo(1);
    d.dispose();
  });

  it("with wait, does not settle for the previous frame when the time lands a hair before the next one", async () => {
    // At 1.5x a source time lands exactly on a frame boundary, and float error puts it just below (0.2666… minus a
    // hair for the frame at 8/30). That frame is the one to pick (it is within PICK_EPS), but the frame before it
    // still "covers" the time by its duration. When the queue is full and ends with that earlier frame, the next one
    // is not decoded yet, and the wait must not end with the earlier frame.
    const { d, p } = decoder("c1");
    await d.prime(p.start);
    await flush();
    expect(d.queued).toBe(QUEUE_TARGET); // frames 0 to 7
    const f = await d.frameFor(p.start + 8 / 30 - 1e-9, true, true);
    expect(f!.timestamp).toBeCloseTo(8 / 30, 9);
    d.dispose();
  });
});
