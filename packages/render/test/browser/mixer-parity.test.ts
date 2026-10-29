// Mixes the same synthetic occurrences with Web Audio's OfflineAudioContext (built as the player's WebAudioOutput builds
// its graph) and with the Node mixer, and compares the two.
import { chromium, type Browser } from "@playwright/test";
import type { AudioOccurrence } from "@cutcut/player/engine";
import { mixBlock, type PcmBuffer } from "../../src";

const RATE = 48000;
const SECONDS = 2;

interface Source { readonly rate: number; readonly freqs: readonly number[]; readonly seconds: number }
/**
 * `levelsOnly`: Web Audio steps `playbackRate` once per 128-frame quantum, so on a ramp it trails the exact
 * integral by about a millisecond; the phases drift apart, so compare levels up to `compEnd`, not samples.
 */
interface Case { readonly name: string; readonly source: Source; readonly occurrence: AudioOccurrence; readonly levelsOnly?: true }

const occ = (o: Partial<AudioOccurrence> & Pick<AudioOccurrence, "compStart" | "compEnd" | "bufferFrom" | "bufferTo" | "speed" | "gain">): AudioOccurrence => ({ id: "o", asset: "a", chunk: 0, ...o });

const cases: Case[] = [
  {
    name: "a mono source with a gain envelope and a pan sweep",
    source: { rate: 48000, freqs: [440], seconds: 1.65 },
    occurrence: occ({ compStart: 0.25, compEnd: 1.9, bufferFrom: 0, bufferTo: 1.65, speed: 1, gain: [[0.25, 0], [0.75, 1], [1.5, 1], [1.9, 0.2]], pan: [[0.25, -1], [1.9, 1]] }),
  },
  {
    name: "a stereo 44.1 kHz source sped up 1.5x and panned right",
    source: { rate: 44100, freqs: [440, 660], seconds: 2.25 },
    occurrence: occ({ compStart: 0.1, compEnd: 1.6, bufferFrom: 0, bufferTo: 2.25, speed: 1.5, gain: [[0.1, 1], [1.6, 1]], pan: [[0.1, 0.5], [1.6, 0.5]] }),
  },
  {
    name: "a mono 22.05 kHz source slowed to 0.8x, panned left",
    source: { rate: 22050, freqs: [330], seconds: 1.2 },
    occurrence: occ({ compStart: 0, compEnd: 1.5, bufferFrom: 0, bufferTo: 1.2, speed: 0.8, gain: [[0, 0.5], [1.5, 0.5]], pan: [[0, -0.6], [1.5, -0.6]] }),
  },
  {
    name: "a stereo source with no pan, faded out",
    source: { rate: 48000, freqs: [500, 700], seconds: 1 },
    occurrence: occ({ compStart: 0.5, compEnd: 1.5, bufferFrom: 0, bufferTo: 1, speed: 1, gain: [[0.5, 1], [1.0, 1], [1.5, 0]] }),
  },
  {
    name: "a mono source on a speed-key ramp from 1x to 2x",
    source: { rate: 48000, freqs: [220], seconds: 2.4 },
    occurrence: occ({ compStart: 0.2, compEnd: 1.8, bufferFrom: 0, bufferTo: 2.4, speed: 1, rate: [[0.2, 1], [0.6, 1.25], [1, 1.5], [1.4, 1.75], [1.8, 2]], gain: [[0.2, 1], [1.8, 1]] }),
    levelsOnly: true,
  },
];

function synth(source: Source): PcmBuffer {
  const length = Math.round(source.rate * source.seconds);
  return { sampleRate: source.rate, channels: source.freqs.map((f) => Float32Array.from({ length }, (_, i) => 0.5 * Math.sin((2 * Math.PI * f * i) / source.rate))) };
}

/** Runs in the page: the player's graph for one chunk, rendered offline. */
async function webAudio(args: { source: Source; occurrence: AudioOccurrence; rate: number; seconds: number }): Promise<[number[], number[]]> {
  const { source, occurrence: o } = args;
  const ctx = new OfflineAudioContext(2, Math.round(args.rate * args.seconds), args.rate);
  const length = Math.round(source.rate * source.seconds);
  const buffer = ctx.createBuffer(source.freqs.length, length, source.rate);
  source.freqs.forEach((f, ch) => {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = 0.5 * Math.sin((2 * Math.PI * f * i) / source.rate);
  });
  const valueAt = (pts: readonly (readonly [number, number])[], t: number, fallback: number): number => {
    const first = pts[0], last = pts[pts.length - 1];
    if (!first || !last) return fallback;
    if (t <= first[0]) return first[1];
    if (t >= last[0]) return last[1];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!, b = pts[i + 1]!;
      if (t >= a[0] && t < b[0]) return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
    }
    return last[1];
  };
  const automate = (param: AudioParam, pts: readonly (readonly [number, number])[], when: number, fallback: number): void => {
    if (pts.length === 0) { param.value = fallback; return; }
    param.setValueAtTime(valueAt(pts, when, fallback), Math.max(0, when));
    for (const [at, v] of pts) if (at > when) param.linearRampToValueAtTime(v, at);
  };
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  automate(src.playbackRate, o.rate ?? [], o.compStart, o.speed);
  const gain = ctx.createGain();
  automate(gain.gain, o.gain, o.compStart, 1);
  src.connect(gain);
  let tail: AudioNode = gain;
  if (o.pan && o.pan.length > 0) {
    const panner = ctx.createStereoPanner();
    automate(panner.pan, o.pan, o.compStart, 0);
    tail.connect(panner);
    tail = panner;
  }
  tail.connect(ctx.destination);
  src.start(o.compStart, 0, o.bufferTo - o.bufferFrom);
  const out = await ctx.startRendering();
  return [Array.from(out.getChannelData(0)), Array.from(out.getChannelData(1))];
}

function rms(a: ArrayLike<number>, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += (a[i] as number) ** 2;
  return Math.sqrt(sum / Math.max(1, to - from));
}

function crossings(a: ArrayLike<number>, from: number, to: number): number {
  let n = 0;
  for (let i = from + 1; i < to; i++) if ((a[i - 1] as number) < 0 && (a[i] as number) >= 0) n++;
  return n;
}

let browser: Browser;
beforeAll(async () => { browser = await chromium.launch(); }, 60_000);
afterAll(async () => { await browser.close(); });

describe("offline mixer against Web Audio's OfflineAudioContext", () => {
  it.each(cases)("$name", async ({ source, occurrence, levelsOnly }) => {
    const page = await browser.newPage();
    const expected = await page.evaluate(webAudio, { source, occurrence, rate: RATE, seconds: SECONDS });
    await page.close();
    const frames = RATE * SECONDS;
    const mine = mixBlock([{ occurrence, pcm: synth(source) }], 0, frames, RATE);

    for (const ch of [0, 1] as const) {
      const want = expected[ch], got = mine[ch];
      let worst = 0, peakWant = 0, peakGot = 0;
      for (let i = 0; i < frames; i++) {
        worst = Math.max(worst, Math.abs((want[i] as number) - (got[i] as number)));
        peakWant = Math.max(peakWant, Math.abs(want[i] as number));
        peakGot = Math.max(peakGot, Math.abs(got[i] as number));
      }
      expect(Math.abs(peakWant - peakGot), `channel ${ch} peak: web audio ${peakWant.toFixed(3)}, mixer ${peakGot.toFixed(3)}`).toBeLessThan(0.05);
      // Per 100 ms window, the levels agree to 1 dB wherever there is sound to compare.
      const win = RATE / 10;
      const until = levelsOnly ? Math.floor(occurrence.compEnd * RATE) : frames;
      for (let from = 0; from + win <= until; from += win) {
        const a = rms(want, from, from + win), b = rms(got, from, from + win);
        if (a < 0.01 && b < 0.01) continue;
        const db = Math.abs(20 * Math.log10((b + 1e-9) / (a + 1e-9)));
        expect(db, `channel ${ch}, window at ${(from / RATE).toFixed(1)} s: web audio ${a.toFixed(4)}, mixer ${b.toFixed(4)}`).toBeLessThan(1);
        // On a ramp the pitch is the rate: the same zero crossings per window, give or take the drift.
        if (levelsOnly) expect(Math.abs(crossings(want, from, from + win) - crossings(got, from, from + win)), `channel ${ch}, crossings at ${(from / RATE).toFixed(1)} s`).toBeLessThanOrEqual(1);
      }
      if (!levelsOnly) expect(worst, `channel ${ch} worst sample difference`).toBeLessThan(0.03);
    }
  }, 60_000);
});
