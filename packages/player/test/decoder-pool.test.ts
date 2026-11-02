import { AssetSources, DecoderPool, ErrorFrame, INPUT_IDLE_CLOSE_S, ManualClock, type PlayerErrorEvent } from "@cutcraft/player";
import { FakeFrameSource, fakeResolver, flush } from "./helpers/fakes";
import { DEFAULT_MANIFEST, makeState } from "./helpers/state";

function setup(ids = ["a", "b", "silent"]) {
  const clock = new ManualClock();
  const fakes = new Map<string, FakeFrameSource>();
  const errors: PlayerErrorEvent[] = [];
  const sources = new AssetSources({
    media: fakeResolver(ids),
    manifest: DEFAULT_MANIFEST,
    clock,
    onError: (e) => errors.push(e),
    frameSourceFactory: (id) => {
      const f = new FakeFrameSource(id);
      if (id === "silent") f.decodable = false;
      fakes.set(id, f);
      return f;
    },
  });
  return { clock, fakes, errors, sources, pool: new DecoderPool(sources) };
}

const state = makeState({ tracks: [{ id: "main", items: [
  { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
  { id: "c2", kind: "clip", source: { in: 0, out: 4, asset: "b" } },
  { id: "c3", kind: "clip", source: { in: 2, out: 6, asset: "a" } },
] }] });

describe("DecoderPool", () => {
  it("mounts only placements inside the lookahead window", async () => {
    const { pool } = setup();
    pool.sync(state, 0);
    expect(pool.mounted).toEqual(["c1"]);
    pool.sync(state, 2.5);
    expect(pool.mounted).toEqual(["c1", "c2"]);
    pool.sync(state, 4.6);
    expect(pool.mounted).toEqual(["c2"]);
    pool.sync(state, 7);
    expect(pool.mounted).toEqual(["c2", "c3"]);
    await flush();
  });

  it("shares one source per asset, keeps it idle for a while, then closes it", async () => {
    const { pool, clock, fakes, sources } = setup();
    pool.sync(state, 7);
    await flush();
    expect(fakes.get("a")!.opened).toBe(1);
    pool.sync(state, 9);
    pool.sync(state, 9);
    await flush();
    expect(sources.isOpen("b")).toBe(true);
    clock.advance(INPUT_IDLE_CLOSE_S + 1);
    pool.sync(state, 9);
    expect(sources.isOpen("b")).toBe(false);
    await flush();
    expect(fakes.get("b")!.closed).toBe(true);
    expect(sources.isOpen("a")).toBe(true);
  });

  it("evicts idle sources beyond the cap", async () => {
    const ids = ["q0", "q1", "q2", "q3", "q4", "q5", "q6"];
    const manifest = { assets: Object.fromEntries(ids.map((id) => [id, { id, kind: "video" as const, duration: 10, width: 64, height: 64 }])) };
    const many = makeState({ manifest, tracks: [{ id: "free", layout: "free", items: ids.map((id, i) => ({ id: `k${i}`, kind: "clip", start: 0, source: { in: 0, out: 1, asset: id } })) }] });
    const { pool, sources } = setup(ids);
    pool.sync(many, 0);
    await flush();
    expect(sources.openCount).toBe(7);
    pool.sync(many, 50);
    expect(pool.mounted).toEqual([]);
    expect(sources.openCount).toBe(6);
  });

  it("primes every decoder on seek, aborting streams", async () => {
    const { pool, fakes } = setup();
    pool.sync(state, 2.5);
    await flush();
    const a = fakes.get("a")!;
    expect(a.streamsStarted).toBe(1);
    await pool.seekAll(1);
    await flush();
    expect(a.streamsAborted).toBe(1);
    expect(a.frameAtCalls).toEqual([2.5, 1]);
    expect(fakes.get("b")!.frameAtCalls).toEqual([0, 0]);
  });

  it("substitutes an error source for undecodable assets and reports once", async () => {
    const { pool, errors } = setup();
    const s = makeState({ tracks: [{ id: "main", items: [{ id: "s1", kind: "clip", source: { in: 0, out: 2, asset: "silent" } }] }] });
    pool.sync(s, 0);
    await flush();
    pool.sync(s, 1);
    await flush();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ asset: "silent", fatal: false });
    const frame = await pool.decoderFor("s1")!.frameFor(1, true);
    expect(frame).toBeInstanceOf(ErrorFrame);
  });

  it("reports missing media once", async () => {
    const { pool, errors } = setup(["a"]);
    pool.sync(state, 2.5);
    await flush();
    pool.sync(state, 2.5);
    await flush();
    expect(errors.map((e) => e.asset)).toEqual(["b"]);
  });

  it("keeps a decoder across a trim and recreates it when the asset changes", async () => {
    const { pool } = setup();
    pool.sync(state, 0);
    const first = pool.decoderFor("c1")!;
    const trimmed = makeState({ tracks: [{ id: "main", items: [{ id: "c1", kind: "clip", source: { in: 1, out: 4, asset: "a" } }] }] });
    pool.sync(trimmed, 0);
    expect(pool.decoderFor("c1")).toBe(first);
    expect(first.placement.source!.in).toBe(1);
    const swapped = makeState({ tracks: [{ id: "main", items: [{ id: "c1", kind: "clip", source: { in: 1, out: 4, asset: "b" } }] }] });
    pool.sync(swapped, 0);
    expect(pool.decoderFor("c1")).not.toBe(first);
    await flush();
    pool.dispose();
    expect(pool.mounted).toEqual([]);
  });
});
