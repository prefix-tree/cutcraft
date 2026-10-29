import type { AudioOccurrence } from "@cutcut/player/engine";
import { envelopeAt, mixBlock, mixPlan, type MixSource, type PcmBuffer, type PcmProvider } from "../src/mixer";

const SR = 48000;

function sine(freq: number, seconds: number, sampleRate = SR, amp = 1, channels = 1): PcmBuffer {
  const data = new Float32Array(Math.round(seconds * sampleRate));
  for (let i = 0; i < data.length; i++) data[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return { sampleRate, channels: Array.from({ length: channels }, () => data) };
}

function occ(over: Partial<AudioOccurrence> = {}): AudioOccurrence {
  return { id: "a", asset: "a", chunk: 0, compStart: 0, compEnd: 1, bufferFrom: 0, bufferTo: 1, speed: 1, gain: [[0, 1], [1, 1]], ...over };
}

const source = (o: AudioOccurrence, pcm: PcmBuffer): MixSource => ({ occurrence: o, pcm });
const rms = (a: Float32Array, from = 0, to = a.length): number => { let s = 0; for (let i = from; i < to; i++) s += (a[i] as number) ** 2; return Math.sqrt(s / (to - from)); };
const crossings = (a: Float32Array): number => { let n = 0; for (let i = 1; i < a.length; i++) if ((a[i - 1] as number) < 0 && (a[i] as number) >= 0) n++; return n; };

async function mixAll(plan: AudioOccurrence[], pcm: PcmProvider, blockFrames: number, to = 1): Promise<[Float32Array, Float32Array]> {
  const total = Math.ceil(to * SR);
  const l = new Float32Array(total), r = new Float32Array(total);
  for await (const b of mixPlan(plan, pcm, { sampleRate: SR, to, blockFrames })) {
    const at = Math.round(b.timestamp * SR);
    l.set(b.left, at);
    r.set(b.right, at);
  }
  return [l, r];
}

describe("envelopeAt", () => {
  it("is linear between points and flat outside", () => {
    const pts: [number, number][] = [[1, 0], [2, 1], [4, 0]];
    expect(envelopeAt(pts, 0, 9)).toBe(0);
    expect(envelopeAt(pts, 1.5, 9)).toBeCloseTo(0.5);
    expect(envelopeAt(pts, 3, 9)).toBeCloseTo(0.5);
    expect(envelopeAt(pts, 5, 9)).toBe(0);
    expect(envelopeAt([], 1, 7)).toBe(7);
  });
});

describe("mixBlock", () => {
  it("plays a source at unit gain, mono to both channels", () => {
    const [l, r] = mixBlock([source(occ(), sine(440, 1))], 0, 4800, SR);
    expect(rms(l)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(Array.from(l)).toEqual(Array.from(r));
  });

  it("follows a gain ramp and the fade ends at silence", () => {
    const o = occ({ gain: [[0, 0], [1, 1]] });
    const [l] = mixBlock([source(o, sine(440, 1))], 0, SR, SR);
    expect(rms(l, 0, 4800)).toBeLessThan(0.07);
    expect(rms(l, 24000 - 2400, 24000 + 2400)).toBeCloseTo(0.5 * Math.SQRT1_2, 1);
    expect(rms(l, SR - 4800, SR)).toBeGreaterThan(0.6);
    const out = occ({ gain: [[0, 1], [0.9, 1], [1, 0]] });
    const [l2] = mixBlock([source(out, sine(440, 1))], 0, SR, SR);
    expect(Math.abs(l2[SR - 1] as number)).toBeLessThan(0.01);
  });

  it("starts and stops at the occurrence's composition range", () => {
    const o = occ({ compStart: 0.25, compEnd: 0.5, bufferTo: 0.25 });
    const [l] = mixBlock([source(o, sine(440, 0.25))], 0, SR, SR);
    expect(rms(l, 0, 11000)).toBe(0);
    expect(rms(l, 12100, 23900)).toBeGreaterThan(0.6);
    expect(rms(l, 24100, SR)).toBe(0);
  });

  it("raises pitch with speed and shortens the clip", () => {
    const o = occ({ compEnd: 0.5, speed: 2 });
    const [l] = mixBlock([source(o, sine(440, 1))], 0, SR, SR);
    expect(crossings(l.subarray(0, 24000))).toBeGreaterThan(430);
    expect(crossings(l.subarray(0, 24000))).toBeLessThan(450);
    expect(rms(l, 24100, SR)).toBe(0);
  });

  it("converts sample rates without changing pitch", () => {
    const [l] = mixBlock([source(occ(), sine(440, 1, 44100))], 0, SR, SR);
    expect(crossings(l)).toBeGreaterThan(438);
    expect(crossings(l)).toBeLessThan(442);
  });

  it("sums sources and clamps at full scale", () => {
    const a = source(occ({ id: "a" }), sine(440, 1, SR, 0.8));
    const b = source(occ({ id: "b" }), sine(440, 1, SR, 0.8));
    const [l] = mixBlock([a, b], 0, 4800, SR);
    expect(Math.max(...l)).toBe(1);
    expect(Math.min(...l)).toBe(-1);
  });

  it("pans like a Web Audio StereoPannerNode", () => {
    const mono = sine(440, 1);
    const hard = mixBlock([source(occ({ pan: [[0, 1], [1, 1]] }), mono)], 0, 4800, SR);
    expect(rms(hard[0])).toBeLessThan(1e-6);
    expect(rms(hard[1])).toBeCloseTo(Math.SQRT1_2, 2);
    const centre = mixBlock([source(occ({ pan: [[0, 0], [1, 0]] }), mono)], 0, 4800, SR);
    expect(rms(centre[0])).toBeCloseTo(Math.SQRT1_2 * Math.SQRT1_2, 2);
    expect(rms(centre[1])).toBeCloseTo(Math.SQRT1_2 * Math.SQRT1_2, 2);
    // A stereo source panned right keeps its right channel and folds the left into it.
    const left = new Float32Array(4800).fill(0.5), right = new Float32Array(4800);
    const st = mixBlock([source(occ({ pan: [[0, 1], [1, 1]] }), { sampleRate: SR, channels: [left, right] })], 0, 4800, SR);
    expect(st[0][100]).toBeCloseTo(0, 5);
    expect(st[1][100]).toBeCloseTo(0.5, 5);
  });
});

describe("mixPlan", () => {
  const plan: AudioOccurrence[] = [
    occ({ id: "a", asset: "a", compEnd: 1.5, bufferTo: 1.5, gain: [[0, 0.2], [0.7, 1], [1.5, 0.4]] }),
    occ({ id: "b", asset: "b", compStart: 0.4, compEnd: 1.2, bufferTo: 0.8, speed: 1, pan: [[0.4, -1], [1.2, 1]], gain: [[0.4, 1], [1.2, 1]] }),
  ];
  const provider: PcmProvider = {
    range: async (asset, from, to) => sine(asset === "a" ? 440 : 660, to - from, asset === "a" ? SR : 44100, 0.5, asset === "a" ? 1 : 2),
  };

  it("gives the same samples whatever the block size", async () => {
    const small = await mixAll(plan, provider, 1000, 1.5);
    const large = await mixAll(plan, provider, 4096, 1.5);
    expect(Buffer.from(small[0].buffer).equals(Buffer.from(large[0].buffer))).toBe(true);
    expect(Buffer.from(small[1].buffer).equals(Buffer.from(large[1].buffer))).toBe(true);
    expect(rms(small[0])).toBeGreaterThan(0.1);
  });

  it("decodes a chunk only when it is reached", async () => {
    const calls: string[] = [];
    const counting: PcmProvider = { range: async (asset, from, to) => { calls.push(asset); return provider.range(asset, from, to); } };
    const gen = mixPlan(plan, counting, { sampleRate: SR, to: 1.5, blockFrames: 4096 });
    await gen.next();
    expect(calls).toEqual(["a"]);
    for await (const _ of gen) { void _; }
    expect(calls).toEqual(["a", "b"]);
  });

  it("plays a reversed chunk's PCM backwards and leaves the provider's copy alone", async () => {
    const ramp = new Float32Array(SR).map((_, i) => i / SR);
    const [left] = await mixAll([occ({ reverse: true })], { range: async () => ({ sampleRate: SR, channels: [ramp] }) }, 4096);
    expect(left[0]).toBeCloseTo(1, 3);
    expect(left[SR / 2]).toBeCloseTo(0.5, 3);
    expect(left[SR - 1]).toBeCloseTo(0, 3);
    expect(ramp[0]).toBe(0);
  });
});
