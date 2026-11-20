// Time in ticks: every frame and sample boundary is an exact integer, NTSC included, so nothing needs a nudge.
import { describe, expect, it } from "vitest";

import {
  frameAt,
  frameAtSeconds,
  frameStart,
  frameStartSeconds,
  framesUntil,
  MAX_SECONDS,
  nearestFrame,
  parseRate,
  type Rate,
  rateProblem,
  sampleAtSeconds,
  sampleRateProblem,
  samplesUntil,
  TICKS_PER_SECOND,
  ticksPerFrame,
  timecode,
} from "@uberscene/kit/schema";

const RATES: Record<string, Rate> = {
  "1": { num: 1, den: 1 },
  "10": { num: 10, den: 1 },
  "12": { num: 12, den: 1 },
  "23.976": { num: 24000, den: 1001 },
  "24": { num: 24, den: 1 },
  "25": { num: 25, den: 1 },
  "29.97": { num: 30000, den: 1001 },
  "30": { num: 30, den: 1 },
  "50": { num: 50, den: 1 },
  "59.94": { num: 60000, den: 1001 },
  "60": { num: 60, den: 1 },
  "119.88": { num: 120000, den: 1001 },
  "120": { num: 120, den: 1 },
};
const ntsc = RATES["29.97"] as Rate;
const ntsc60 = RATES["59.94"] as Rate;

describe("ticks", () => {
  it("divide into every frame rate in use, and every common sample rate", () => {
    for (const rate of Object.values(RATES)) expect(Number.isInteger(ticksPerFrame(rate))).toBe(true);
    for (const sr of [8000, 11025, 16000, 22050, 32000, 44100, 48000, 88200, 96000, 176400, 192000])
      expect(sampleRateProblem(sr)).toBeNull();
    expect(sampleRateProblem(44101)).toMatch(/does not divide/);
  });

  it("put every frame's start in that frame, and a tick before it in the frame before, over ten hours", () => {
    for (const [name, rate] of Object.entries(RATES)) {
      const last = Math.floor((MAX_SECONDS * rate.num) / rate.den) - 1;
      for (let n = 0; n <= last; n += Math.max(1, Math.floor(last / 2000))) {
        const start = frameStartSeconds(n, rate);
        expect(frameAtSeconds(start, rate), `${name} frame ${n}`).toBe(n);
        expect(framesUntil(start, rate), `${name} until ${n}`).toBe(n);
        if (n > 0) {
          expect(frameAt(frameStart(n, rate) - 1, rate), `${name} a tick before ${n}`).toBe(n - 1);
          expect(frameAtSeconds(start - 1e-6, rate), `${name} a microsecond before ${n}`).toBe(n - 1);
        }
      }
    }
  });

  it("count 107892 frames in an NTSC hour, where 29.97 as a decimal counts 107892.108", () => {
    expect(framesUntil(3600 * 1.001, ntsc)).toBe(108000);
    expect(frameAtSeconds(3600, ntsc)).toBe(107892);
    expect(nearestFrame(2.5, RATES["30"] as Rate)).toBe(75);
  });

  it("start each NTSC frame on the exact sample at 48 kHz: 1601.6 a frame, 8008 every five, 48,048,000 in 1001 s", () => {
    let total = 0;
    for (let n = 0; n < 30000; n++) {
      const first = sampleAtSeconds(frameStartSeconds(n, ntsc), 48000);
      expect(first).toBe(Math.floor((n * 8008) / 5));
      total += sampleAtSeconds(frameStartSeconds(n + 1, ntsc), 48000) - first;
    }
    expect(total).toBe(48_048_000);
    expect(samplesUntil(frameStartSeconds(1001, ntsc), 48000)).toBe(1_603_202);
  });
});

describe("parseRate", () => {
  it("reads numbers, NTSC names and fractions", () => {
    expect(parseRate(30)).toEqual({ num: 30, den: 1 });
    expect(parseRate(12.5)).toEqual({ num: 25, den: 2 });
    expect(parseRate("29.97")).toEqual(ntsc);
    expect(parseRate("23.976")).toEqual({ num: 24000, den: 1001 });
    expect(parseRate({ num: 60000, den: 1001 })).toEqual(ntsc60);
    expect(parseRate({ num: 60, den: 2 })).toEqual({ num: 30, den: 1 });
  });

  it("refuses 29.97 as a number, and says to write the string", () => {
    expect(() => parseRate(29.97)).toThrow('fps 29.97 is 2997/100, not NTSC; write "29.97" for 30000/1001');
    expect(() => parseRate(23.976)).toThrow(/write "23.976"/);
    expect(rateProblem({ num: 11, den: 1 })).toMatch(/does not divide into whole ticks/);
    expect(() => parseRate(0)).toThrow(/positive/);
  });

  it("holds about 9.85 hours exactly", () => {
    expect(MAX_SECONDS).toBe(35459);
    expect(MAX_SECONDS / 3600).toBeCloseTo(9.85, 2);
    expect(MAX_SECONDS * TICKS_PER_SECOND).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
  });
});

describe("timecode", () => {
  it("is non-drop at whole rates", () => {
    expect(timecode(0, RATES["30"] as Rate)).toBe("00:00:00:00");
    expect(timecode(30 * 3661 + 7, RATES["30"] as Rate)).toBe("01:01:01:07");
    expect(timecode(25 * 60, RATES["25"] as Rate)).toBe("00:01:00:00");
  });

  it("drops frame numbers 0 and 1 each minute but every tenth at 29.97", () => {
    expect(timecode(1799, ntsc)).toBe("00:00:59;29");
    expect(timecode(1800, ntsc)).toBe("00:01:00;02");
    expect(timecode(17981, ntsc)).toBe("00:09:59;29");
    expect(timecode(17982, ntsc)).toBe("00:10:00;00");
    expect(timecode(107892, ntsc)).toBe("01:00:00;00");
  });

  it("drops four at 59.94", () => {
    expect(timecode(3600, ntsc60)).toBe("00:01:00;04");
    expect(timecode(35964, ntsc60)).toBe("00:10:00;00");
  });

  it("can be asked for non-drop at NTSC", () => {
    expect(timecode(1800, ntsc, { dropFrame: false })).toBe("00:01:00:00");
  });
});
