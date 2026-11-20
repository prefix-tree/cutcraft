// Time in ticks. A file says seconds (`start={2.5}`, `in={4}`) and the resolver keeps seconds, but every turn of a
// time into a frame, back into seconds, or into an audio sample goes through ticks: whole numbers of 1/254,016,000,000
// of a second. That count divides evenly into every frame rate in use, NTSC's 30000/1001 and 24000/1001 included, and
// into every audio sample rate, so a frame's start is an exact integer and no boundary needs a nudge.
//
// The rule for callers: never `Math.floor(t * fps)` or `frame / fps`; call `frameAtSeconds`, `frameStartSeconds`,
// `sampleAtSeconds`. Ticks are plain numbers, exact up to Number.MAX_SAFE_INTEGER, about 9.85 hours (`MAX_SECONDS`).

/** Ticks in one second: 2^12 · 3^4 · 5^6 · 7^2. Every frame and sample rate below divides it. */
export const TICKS_PER_SECOND = 254_016_000_000;

/** The longest time ticks hold exactly as a JavaScript number: about 9.85 hours. */
export const MAX_SECONDS = Math.floor(Number.MAX_SAFE_INTEGER / TICKS_PER_SECOND);

/** A frame rate as an exact fraction: `num` frames every `den` seconds. */
export interface Rate {
  readonly num: number;
  readonly den: number;
}

/** The NTSC rates, written as the strings people say them as. */
export const NTSC_RATES: Readonly<Record<string, Rate>> = {
  "23.976": { num: 24000, den: 1001 },
  "29.97": { num: 30000, den: 1001 },
  "47.952": { num: 48000, den: 1001 },
  "59.94": { num: 60000, den: 1001 },
  "119.88": { num: 120000, den: 1001 },
};

/** What `fps` may be: a number of frames per second, an NTSC name, or an exact fraction. */
export type FrameRate = number | string | Rate;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

function reduced(num: number, den: number): Rate {
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

/** A number as a fraction with a power-of-ten denominator, reduced: 12.5 is 25/2, 29.97 is 2997/100. */
function fromDecimal(value: number): Rate {
  let den = 1;
  while (!Number.isInteger(Math.round(value * den * 1e6) / 1e6) && den < 1e6) den *= 10;
  return reduced(Math.round(value * den), den);
}

/** Why a rate cannot be used, or null. A rate must be positive and divide the tick count exactly. */
export function rateProblem(rate: Rate): string | null {
  if (!(rate.num > 0 && rate.den > 0) || !Number.isInteger(rate.num) || !Number.isInteger(rate.den))
    return "a frame rate is a positive number, or { num, den } of whole numbers";
  if ((TICKS_PER_SECOND * rate.den) % rate.num === 0) return null;
  const value = rate.num / rate.den;
  const ntsc = Object.entries(NTSC_RATES).find(([name]) => Math.abs(Number(name) - value) < 1e-9);
  if (ntsc)
    return `fps ${value} is ${rate.num}/${rate.den}, not NTSC; write "${ntsc[0]}" for ${ntsc[1].num}/${ntsc[1].den}`;
  return `fps ${value} does not divide into whole ticks; use a rate such as 24, 25, 30, 50, 60 or "29.97"`;
}

/** A frame rate as an exact fraction. Throws with the reason for a rate that cannot be used. */
export function parseRate(fps: FrameRate): Rate {
  const rate =
    typeof fps === "number"
      ? Number.isInteger(fps)
        ? { num: fps, den: 1 }
        : fromDecimal(fps)
      : typeof fps === "string"
        ? (NTSC_RATES[fps.trim()] ?? fromDecimal(Number(fps)))
        : reduced(fps.num, fps.den);
  const problem = rateProblem(rate);
  if (problem) throw new Error(problem);
  return rate;
}

/** The rate as frames per second, for display and for code that only needs an approximate number. */
export const rateValue = (rate: Rate): number => rate.num / rate.den;

/** Ticks in one frame: an exact integer for every usable rate. */
export const ticksPerFrame = (rate: Rate): number => (TICKS_PER_SECOND * rate.den) / rate.num;

/** Seconds as the nearest tick. */
export const secondsToTicks = (seconds: number): number => Math.round(seconds * TICKS_PER_SECOND);

export const ticksToSeconds = (ticks: number): number => ticks / TICKS_PER_SECOND;

/** The frame a tick falls in: frame n holds [n, n+1) frames' worth of ticks. */
export const frameAt = (ticks: number, rate: Rate): number => Math.floor(ticks / ticksPerFrame(rate));

/** The first tick of a frame. */
export const frameStart = (frame: number, rate: Rate): number => frame * ticksPerFrame(rate);

/**
 * Seconds as ticks, put on a frame boundary when they are as close to one as a double can say. A time in seconds is
 * a double, which at t seconds is good to about t·2^-52: under one tick below about 2.5 hours, two at 9.85 hours. So
 * `frameStartSeconds(n)` read back may land a tick either side of frame n's start, and is put back on it. This is
 * not a nudge: no time a file can hold lies that close to a boundary without meaning it.
 */
function onBoundary(seconds: number, per: number): number {
  const ticks = secondsToTicks(seconds);
  const slack = Math.ceil(Math.abs(seconds) * Number.EPSILON * TICKS_PER_SECOND);
  const into = ((ticks % per) + per) % per;
  if (into !== 0 && into <= slack) return ticks - into;
  if (into !== 0 && per - into <= slack) return ticks + per - into;
  return ticks;
}

/** The frame a time in seconds falls in, never below 0. */
export const frameAtSeconds = (seconds: number, rate: Rate): number => {
  const per = ticksPerFrame(rate);
  return Math.max(0, Math.floor(onBoundary(seconds, per) / per));
};

/** The first frame that starts at or after a time: the frame count of a stretch that ends there. */
export const framesUntil = (seconds: number, rate: Rate): number => {
  const per = ticksPerFrame(rate);
  return Math.max(0, Math.ceil(onBoundary(seconds, per) / per));
};

/** The frame nearest a time, for times given by a person (`--at 2.5`) rather than computed. */
export const nearestFrame = (seconds: number, rate: Rate): number =>
  Math.max(0, Math.round(secondsToTicks(seconds) / ticksPerFrame(rate)));

/** When a frame starts, in seconds. */
export const frameStartSeconds = (frame: number, rate: Rate): number => ticksToSeconds(frameStart(frame, rate));

/** Why a sample rate cannot be used, or null. Every common rate (8, 11.025, 16, 22.05, 44.1, 48, 96, 192 kHz) divides the tick count. */
export function sampleRateProblem(sampleRate: number): string | null {
  return Number.isInteger(sampleRate) && sampleRate > 0 && TICKS_PER_SECOND % sampleRate === 0
    ? null
    : `sample rate ${sampleRate} does not divide into whole ticks; use 44100, 48000 or 96000`;
}

function ticksPerSample(sampleRate: number): number {
  const problem = sampleRateProblem(sampleRate);
  if (problem) throw new Error(problem);
  return TICKS_PER_SECOND / sampleRate;
}

/** The audio sample a tick falls in. */
export const sampleAt = (ticks: number, sampleRate: number): number => Math.floor(ticks / ticksPerSample(sampleRate));

/** The audio sample a time in seconds falls in. */
export const sampleAtSeconds = (seconds: number, sampleRate: number): number => {
  const per = ticksPerSample(sampleRate);
  return Math.floor(onBoundary(seconds, per) / per);
};

/** The first sample that starts at or after a time: the sample count of a stretch that ends there. */
export const samplesUntil = (seconds: number, sampleRate: number): number => {
  const per = ticksPerSample(sampleRate);
  return Math.max(0, Math.ceil(onBoundary(seconds, per) / per));
};

/** Whether a rate is shown in drop-frame timecode: 29.97 and 59.94. */
export const isDropFrame = (rate: Rate): boolean => rate.den === 1001 && (rate.num === 30000 || rate.num === 60000);

const pad = (n: number): string => String(n).padStart(2, "0");

/**
 * SMPTE timecode of a frame, `HH:MM:SS:FF`. At 29.97 and 59.94 it is drop-frame, `HH:MM:SS;FF`: frame numbers 0 and 1
 * (0 to 3 at 59.94) are skipped at the start of every minute except each tenth, so the clock keeps to real time.
 */
export function timecode(frame: number, rate: Rate, options: { readonly dropFrame?: boolean } = {}): string {
  const nominal = Math.round(rateValue(rate));
  let n = Math.max(0, Math.floor(frame));
  const drop = options.dropFrame ?? isDropFrame(rate);
  if (drop) {
    const dropped = nominal === 60 ? 4 : 2;
    const perTen = nominal * 600 - dropped * 9;
    const perMinute = nominal * 60 - dropped;
    const tens = Math.floor(n / perTen);
    const rest = n % perTen;
    n += dropped * 9 * tens + (rest > dropped ? dropped * Math.floor((rest - dropped) / perMinute) : 0);
  }
  const ff = n % nominal;
  const s = Math.floor(n / nominal);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}${drop ? ";" : ":"}${pad(ff)}`;
}
