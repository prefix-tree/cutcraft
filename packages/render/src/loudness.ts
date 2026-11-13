// How loud a stereo mix is, measured block by block as it is mixed: integrated loudness (ITU-R BS.1770 with
// gating), the true peak (4× oversampled) and the samples above full scale. It is fed the mix before the mixer's
// clamp, so it sees what the clamp cuts off.
//
// The K-weighting filter, the gating and the true-peak kernels are ported from HyperFrames
// (packages/core/src/audioAnalysis.ts), Copyright 2026 HeyGen, Inc., licensed under the Apache License, Version 2.0
// (http://www.apache.org/licenses/LICENSE-2.0). Changed here: it measures a stream instead of a whole signal.

export interface Loudness {
  /** Integrated loudness in LUFS; null when nothing is above the -70 LUFS gate. */
  readonly lufs: number | null;
  /** The peak between samples as well as on them, in dB relative to full scale; null for silence. */
  readonly truePeakDb: number | null;
  /** How many samples are above full scale, in either channel, and the seconds of the first from the start. */
  readonly clipped: number;
  readonly clippedAt: number | null;
}

export interface LoudnessMeter {
  add(left: Float32Array, right: Float32Array): void;
  result(): Loudness;
}

type Biquad = readonly [number, number, number, number, number];

/** BS.1770 K-weighting at any sample rate: a high-shelf pre-filter, then the RLB high-pass. */
function kWeighting(sampleRate: number): [Biquad, Biquad] {
  let k = Math.tan((Math.PI * 1681.974450955533) / sampleRate);
  const q = 0.7071752369554196;
  const vh = 10 ** (3.999843853973347 / 20);
  const vb = vh ** 0.4996667741545416;
  let a0 = 1 + k / q + k * k;
  const shelf: Biquad = [
    (vh + (vb * k) / q + k * k) / a0,
    (2 * (k * k - vh)) / a0,
    (vh - (vb * k) / q + k * k) / a0,
    (2 * (k * k - 1)) / a0,
    (1 - k / q + k * k) / a0,
  ];
  k = Math.tan((Math.PI * 38.13547087602444) / sampleRate);
  const q2 = 0.5003270373238773;
  a0 = 1 + k / q2 + k * k;
  return [shelf, [1, -2, 1, (2 * (k * k - 1)) / a0, (1 - k / q2 + k * k) / a0]];
}

const OVERSAMPLE = 4;
const TAPS = 12;
/** A windowed sinc for each of the three points between two samples. */
const KERNELS = Array.from({ length: OVERSAMPLE - 1 }, (_, phase) => {
  const offset = (phase + 1) / OVERSAMPLE;
  return Float64Array.from({ length: 2 * TAPS }, (_, tap) => {
    const x = tap - TAPS + 1 - offset;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    return sinc * (0.5 + 0.5 * Math.cos((Math.PI * x) / TAPS));
  });
});

const HOP_S = 0.1;
/** A loudness block is 400 ms, stepped by one hop. */
const BLOCK_HOPS = 4;
const lufsOf = (power: number): number => (power > 0 ? -0.691 + 10 * Math.log10(power) : Number.NEGATIVE_INFINITY);
const mean = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
const tenth = (x: number): number => Math.round(x * 10) / 10;

export function createLoudnessMeter(sampleRate: number): LoudnessMeter {
  const stages = kWeighting(sampleRate);
  // x1, x2, y1, y2 of each filter stage, for each channel.
  const memory = [new Float64Array(8), new Float64Array(8)];
  const hopFrames = Math.max(1, Math.round(HOP_S * sampleRate));
  // The summed squares of both weighted channels, per finished hop and for the one being filled.
  const hops: number[] = [];
  let filling = 0;
  let seen = 0;
  let peak = 0;
  let clipped = 0;
  let clippedAt: number | null = null;
  // The end of each channel so far, so a peak between two blocks is found too.
  let tails = [new Float32Array(0), new Float32Array(0)];

  const weighted = (x: number, channel: number): number => {
    const m = memory[channel] as Float64Array;
    let v = x;
    for (let s = 0; s < 2; s++) {
      const [b0, b1, b2, a1, a2] = stages[s] as Biquad;
      const o = s * 4;
      const y =
        b0 * v +
        b1 * (m[o] as number) +
        b2 * (m[o + 1] as number) -
        a1 * (m[o + 2] as number) -
        a2 * (m[o + 3] as number);
      m[o + 1] = m[o] as number;
      m[o] = v;
      m[o + 3] = m[o + 2] as number;
      m[o + 2] = y;
      v = y;
    }
    return v;
  };

  return {
    add(left, right) {
      for (let i = 0; i < left.length; i++) {
        const l = left[i] as number,
          r = right[i] as number;
        const loud = Math.max(Math.abs(l), Math.abs(r));
        if (loud > peak) peak = loud;
        if (loud > 1) {
          clipped++;
          clippedAt ??= Math.round((seen / sampleRate) * 1000) / 1000;
        }
        const wl = weighted(l, 0),
          wr = weighted(r, 1);
        filling += wl * wl + wr * wr;
        if (++seen % hopFrames === 0) {
          hops.push(filling);
          filling = 0;
        }
      }
      // Only between samples at least half the peak so far: a higher peak between two quiet samples takes energy
      // near Nyquist that real sound does not carry.
      const floor = peak / 2;
      tails = [left, right].map((block, c) => {
        const tail = tails[c] as Float32Array;
        const joined = new Float32Array(tail.length + block.length);
        joined.set(tail);
        joined.set(block, tail.length);
        for (let n = 0; n + 2 * TAPS <= joined.length; n++) {
          if (Math.abs(joined[n + TAPS - 1] as number) < floor && Math.abs(joined[n + TAPS] as number) < floor)
            continue;
          for (const kernel of KERNELS) {
            let y = 0;
            for (let tap = 0; tap < 2 * TAPS; tap++) y += (joined[n + tap] as number) * (kernel[tap] as number);
            if (Math.abs(y) > peak) peak = Math.abs(y);
          }
        }
        return joined.slice(Math.max(0, joined.length - (2 * TAPS - 1)));
      });
    },
    result() {
      // The power of each 400 ms block; a sound shorter than one block is a single block.
      const blocks: number[] = [];
      for (let i = 0; i + BLOCK_HOPS <= hops.length; i++) {
        let sum = 0;
        for (let h = 0; h < BLOCK_HOPS; h++) sum += hops[i + h] as number;
        blocks.push(sum / (BLOCK_HOPS * hopFrames));
      }
      if (blocks.length === 0 && seen > 0) blocks.push((hops.reduce((a, b) => a + b, 0) + filling) / seen);
      // Two gates: blocks above -70 LUFS, then those within 10 LU of their mean.
      const audible = blocks.filter((p) => lufsOf(p) > -70);
      const gated = audible.length > 0 ? audible.filter((p) => lufsOf(p) > lufsOf(mean(audible)) - 10) : [];
      return {
        lufs: gated.length > 0 ? tenth(lufsOf(mean(gated))) : null,
        truePeakDb: peak > 0 ? tenth(20 * Math.log10(peak)) : null,
        clipped,
        clippedAt,
      };
    },
  };
}

/** What to tell the author about a mix that goes above full scale, or null when it does not. `from` is the mix's start. */
export function clippingWarning(loudness: Loudness, from = 0): string | null {
  if (!loudness.clipped) return null;
  const at = ((loudness.clippedAt ?? 0) + from).toFixed(2);
  const peak = loudness.truePeakDb ?? 0;
  return `the soundtrack clips: ${loudness.clipped} samples above full scale, the first at ${at} s (true peak ${peak > 0 ? "+" : ""}${peak.toFixed(1)} dBTP)`;
}
