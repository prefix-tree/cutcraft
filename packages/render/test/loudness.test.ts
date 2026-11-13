import { describe, expect, it } from "vitest";

import { clippingWarning, createLoudnessMeter } from "../src/loudness";

const SR = 48000;

function sine(freq: number, seconds: number, amp: number, phase = 0): Float32Array {
  const data = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < data.length; i++) data[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR + phase);
  return data;
}

function measure(signal: Float32Array, block = signal.length) {
  const meter = createLoudnessMeter(SR);
  for (let i = 0; i < signal.length; i += block)
    meter.add(signal.subarray(i, i + block), signal.subarray(i, i + block));
  return meter.result();
}

describe("createLoudnessMeter", () => {
  // EBU Tech 3341: a 997 Hz stereo sine peaking at -23 dBFS is -23 LUFS.
  const reference = sine(997, 5, 10 ** (-23 / 20));

  it("measures the EBU reference tone as -23 LUFS", () => {
    const { lufs, truePeakDb, clipped, clippedAt } = measure(reference);
    expect(Math.abs((lufs as number) + 23)).toBeLessThan(0.5);
    expect(truePeakDb).toBeCloseTo(-23, 0);
    expect([clipped, clippedAt]).toEqual([0, null]);
  });

  it("measures the same in blocks as in one piece", () => {
    expect(measure(reference, 4096)).toEqual(measure(reference));
  });

  it("finds a peak that falls between the samples", () => {
    // A quarter of the sample rate, sampled 45° off its crests: every sample is 0.707, the wave reaches 1.
    const { truePeakDb } = measure(sine(SR / 4, 1, 1, Math.PI / 4));
    expect(truePeakDb).toBeGreaterThan(-0.5);
    expect(truePeakDb).toBeLessThan(0.5);
  });

  it("counts the samples above full scale and says when the first is", () => {
    const signal = sine(440, 1, 0.5);
    signal[24000] = 1.5;
    signal[24001] = -1.2;
    const loudness = measure(signal, 4096);
    expect(loudness).toMatchObject({ clipped: 2, clippedAt: 0.5 });
    expect(clippingWarning(loudness, 10)).toMatch(
      /^the soundtrack clips: 2 samples above full scale, the first at 10\.50 s/,
    );
  });

  it("reports silence, and a sound shorter than one block", () => {
    expect(measure(new Float32Array(SR))).toEqual({ lufs: null, truePeakDb: null, clipped: 0, clippedAt: null });
    expect(clippingWarning(measure(new Float32Array(SR)))).toBeNull();
    expect(Math.abs((measure(reference.subarray(0, 4800)).lufs as number) + 23)).toBeLessThan(1);
  });
});
