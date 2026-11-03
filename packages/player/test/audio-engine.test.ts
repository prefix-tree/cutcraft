import { AudioEngine, ManualClock, Transport } from "@cutcraft/player";

import { FakeAudioOutput, FakeAudioSource, flush } from "./helpers/fakes";
import { makeState } from "./helpers/state";

const state = makeState({
  tracks: [
    {
      id: "main",
      items: [
        { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
        { id: "g", kind: "gap", duration: 2 },
        { id: "c2", kind: "clip", source: { in: 0, out: 6, speed: 1.2, asset: "b" } },
      ],
    },
    {
      id: "music",
      layout: "free",
      items: [
        { id: "bed", kind: "audio", start: 0, source: { in: 0, out: 90, asset: "tone" }, props: { volume: 0.5 } },
      ],
    },
  ],
});

function setup(s = state) {
  const clock = new ManualClock();
  const transport = new Transport(clock, s.composition.duration);
  const output = new FakeAudioOutput();
  const sources = new Map<string, FakeAudioSource>();
  const timers: (() => void)[] = [];
  const engine = new AudioEngine({
    output,
    transport,
    toContextTime: (t) => t,
    state: () => s,
    audioSource: (id) => {
      let s = sources.get(id);
      if (!s) {
        s = new FakeAudioSource(id, 90);
        sources.set(id, s);
      }
      return Promise.resolve(s);
    },
    setInterval: (fn) => {
      timers.push(fn);
      return timers.length;
    },
    clearInterval: () => {
      timers.length = 0;
    },
  });
  const keys = () => output.scheduled.map((s) => s.key).sort();
  return { clock, transport, output, engine, sources, timers, keys };
}

describe("AudioEngine", () => {
  it("schedules what plays within the lookahead when playback starts", async () => {
    const { transport, engine, output, keys } = setup();
    transport.play();
    engine.start();
    await flush();
    expect(keys()).toEqual(["bed#0#1", "c1#0#1"]);
    const c1 = output.scheduled.find((s) => s.key.startsWith("c1"))!;
    expect(c1).toMatchObject({ when: 0, offset: 0, duration: 4, playbackRate: 1 });
    const bed = output.scheduled.find((s) => s.key.startsWith("bed"))!;
    expect(bed).toMatchObject({ when: 0, offset: 0, duration: 30 });
    expect(bed.envelope[0]).toEqual({ at: 0, value: 0.5 });
    expect(output.resumed).toBe(1);
  });

  it("schedules a later clip exactly once as the window reaches it", async () => {
    const { clock, transport, engine, output, keys, timers } = setup();
    transport.play();
    engine.start();
    await flush();
    clock.advance(5.9);
    timers[0]!();
    await flush();
    expect(keys()).toEqual(["bed#0#1", "c1#0#1", "c2#0#1"]);
    const c2 = output.scheduled.find((s) => s.key.startsWith("c2"))!;
    expect(c2.when).toBeCloseTo(6);
    expect(c2.offset).toBe(0);
    expect(c2.duration).toBeCloseTo(6);
    expect(c2.playbackRate).toBeCloseTo(1.2);
    timers[0]!();
    await flush();
    expect(output.scheduled).toHaveLength(3);
  });

  it("starts late with a matching offset when the buffer arrives after the clip began", async () => {
    const { clock, transport, engine, output } = setup();
    transport.play();
    engine.start();
    clock.advance(1);
    await flush();
    const c1 = output.scheduled.find((s) => s.key.startsWith("c1"))!;
    expect(c1).toMatchObject({ when: 1, offset: 1, duration: 3 });
  });

  it("cancels everything on stop and reschedules with new offsets after a seek", async () => {
    const { clock, transport, engine, output, keys } = setup();
    transport.play();
    engine.start();
    await flush();
    engine.stop();
    expect(output.cancelAllCount).toBe(1);
    expect(output.scheduled).toEqual([]);
    engine.start();
    clock.advance(0.5);
    transport.seek(2);
    engine.reseek();
    await flush();
    expect(keys().map((k) => k.replace(/#\d+$/, ""))).toEqual(["bed#0", "c1#0"]);
    expect(new Set(keys().map((k) => k.split("#")[2])).size).toBe(1);
    const c1 = output.scheduled.find((s) => s.key.startsWith("c1"))!;
    expect(c1).toMatchObject({ when: 0.5, offset: 2, duration: 2 });
  });

  it("applies the transport rate to playback rate and timing", async () => {
    const { clock, transport, engine, output, timers } = setup();
    transport.play();
    transport.setRate(2);
    engine.start();
    await flush();
    const c1 = output.scheduled.find((s) => s.key.startsWith("c1"))!;
    expect(c1.playbackRate).toBe(2);
    clock.advance(2.95);
    timers[0]!();
    await flush();
    const c2 = output.scheduled.find((s) => s.key.startsWith("c2"))!;
    expect(c2.when).toBeCloseTo(3);
    expect(c2.playbackRate).toBeCloseTo(2.4);
  });

  it("offsets into a speed-key ramp by the integral of its rate and automates the rate", async () => {
    // Speed 1 → 2 over 2 s: u + u²/4 source seconds by clip time u.
    const ramp = makeState({
      tracks: [
        {
          id: "a",
          items: [
            {
              id: "r",
              kind: "clip",
              duration: 2,
              source: { in: 0, out: 3, asset: "a" },
              children: [
                { id: "k1", kind: "speedKey", props: { at: 0, speed: 1 } },
                { id: "k2", kind: "speedKey", props: { at: 2, speed: 2 } },
              ],
            },
          ],
        },
      ],
    });
    const { transport, engine, output } = setup(ramp);
    transport.seek(1);
    transport.setRate(2);
    transport.play();
    engine.start();
    await flush();
    const r = output.scheduled.find((x) => x.key.startsWith("r"))!;
    expect(r.offset).toBeCloseTo(1.25, 6);
    expect(r.duration).toBeCloseTo(1.75, 6);
    expect(r.playbackRate).toBeCloseTo(3, 6);
    expect(r.rate![r.rate!.length - 1]!.value).toBeCloseTo(4, 6);
  });

  it("caches decoded ranges and drives the master gain", async () => {
    const { transport, engine, output, sources } = setup();
    transport.play();
    engine.start();
    await flush();
    engine.reseek();
    await flush();
    expect(sources.get("a")!.rangeCalls).toEqual([[0, 4]]);
    engine.setMaster(0.7, false);
    engine.setMaster(0.7, true);
    expect(output.master).toEqual([0.7, 0]);
  });
});
