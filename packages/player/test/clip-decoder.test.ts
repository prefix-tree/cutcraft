import { ClipDecoder, QUEUE_MAX } from "@cutcut/player";
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
});
