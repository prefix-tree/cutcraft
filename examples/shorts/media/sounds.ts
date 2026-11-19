// Sound cues for the shorts, made here rather than downloaded, so they are ours to share under the repository's
// licence. Each is a small synth: sine partials and seeded noise through a band-pass filter, shaped by an envelope.
// The same code writes the same bytes on every machine, which the shorts test checks against the committed files.
//
//   pnpm --filter @uberscene/example-shorts sounds           writes the cues that are missing
//   pnpm --filter @uberscene/example-shorts sounds --force   writes them all again
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RATE = 48_000;
/** Every cue peaks here, -3 dBFS, so cues layered on a voice leave headroom. */
const PEAK = 10 ** (-3 / 20);

type Synth = () => Float32Array;

/** The cues, by the asset id each is added under. */
export const SOUNDS: Record<string, Synth> = {
  /** A clock's tick: 30 ms, bright. For a count, a step, a cell lighting up. */
  tick: () =>
    render(0.03, (t, n) => {
      const body = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t / 0.004);
      return body + 0.35 * n.white() * Math.exp(-t / 0.0015);
    }),
  /** A mouse click: 45 ms, a tap of noise with a little body. For a cursor, a button, a toggle. */
  click: () => {
    const n = noise(2);
    const band = bandPass(3200, 1.2);
    return render(0.045, (t) => {
      const tap = band(n.white()) * Math.exp(-t / 0.006);
      return tap + 0.4 * Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-t / 0.01);
    });
  },
  /** A pop: 130 ms, a pitch that drops. For something appearing: a dot, a badge, a word. */
  pop: () => {
    let phase = 0;
    return render(0.13, (t) => {
      const f = 300 + 700 * Math.exp(-t / 0.018);
      phase += (2 * Math.PI * f) / RATE;
      return Math.sin(phase) * Math.min(1, t / 0.002) * Math.exp(-t / 0.035);
    });
  },
  /** A whoosh: 700 ms of air that swells and passes. For a scene change or a big move. */
  whoosh: () => sweep(0.7, 300, 2200, 0.62, 3),
  /** A swish: 300 ms, quicker and higher than the whoosh. For a slide, a wipe, a card flicked in. */
  swish: () => sweep(0.3, 1200, 5200, 0.55, 4),
  /** A riser: 2 s that climbs to a stop. Ends on the moment it builds to, so place it to end there. */
  riser: () => {
    const n = noise(5);
    const len = 2;
    let phase = 0;
    const band = movingBandPass();
    return render(len, (t) => {
      const p = t / len;
      const f = 180 * 2 ** (p * 2.6);
      phase += (2 * Math.PI * f) / RATE;
      const air = band(n.white(), 400 * 2 ** (p * 3.5), 1.6);
      const swell = p ** 2.2 * Math.min(1, (len - t) / 0.02);
      return swell * (0.55 * Math.sin(phase) + 0.25 * Math.sin(phase * 2.01) + air);
    });
  },
  /** A thud: 450 ms, low and soft. For a landing, a stamp, a number that arrives. */
  thud: () => {
    const n = noise(6);
    const low = lowPass(900);
    let phase = 0;
    return render(0.45, (t) => {
      const f = 52 + 70 * Math.exp(-t / 0.03);
      phase += (2 * Math.PI * f) / RATE;
      const body = Math.sin(phase) * Math.min(1, t / 0.003) * Math.exp(-t / 0.12);
      return body + 0.5 * low(n.white()) * Math.exp(-t / 0.012);
    });
  },
  /** A chime: 1.8 s, a bell's partials dying away at their own rates. For an ending, a result, a reveal. */
  chime: () => {
    const partials = [
      { ratio: 1, gain: 1, decay: 0.9 },
      { ratio: 2.0, gain: 0.45, decay: 0.6 },
      { ratio: 2.76, gain: 0.35, decay: 0.45 },
      { ratio: 5.4, gain: 0.18, decay: 0.25 },
      { ratio: 8.93, gain: 0.08, decay: 0.12 },
    ];
    return render(1.8, (t) => {
      let sum = 0;
      for (const p of partials) sum += p.gain * Math.sin(2 * Math.PI * 880 * p.ratio * t) * Math.exp(-t / p.decay);
      return sum * Math.min(1, t / 0.002);
    });
  },
};

/** Noise swept through a band that rises and falls, swelling to its loudest at `peakAt` (0..1 of its length). */
function sweep(len: number, from: number, to: number, peakAt: number, seed: number): Float32Array {
  const n = noise(seed);
  const band = movingBandPass();
  return render(len, (t) => {
    const p = t / len;
    const rise = Math.min(1, p / peakAt);
    const f = from * (to / from) ** Math.sin((Math.PI / 2) * rise) * (p > peakAt ? 1 - 0.4 * (p - peakAt) : 1);
    const swell = p < peakAt ? Math.sin((Math.PI / 2) * rise) ** 2 : Math.exp(-(p - peakAt) / ((1 - peakAt) * 0.35));
    return swell * band(n.white(), f, 1.4);
  });
}

/** Samples of `len` seconds from `at(t)`, normalized to the peak, with 5 ms faded out at the end. */
function render(len: number, at: (t: number, n: ReturnType<typeof noise>) => number): Float32Array {
  const n = noise(1);
  const out = new Float32Array(Math.round(len * RATE));
  for (let i = 0; i < out.length; i++) out[i] = at(i / RATE, n);
  const fade = Math.round(0.005 * RATE);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] = (out[out.length - 1 - i] as number) * (i / fade);
  let max = 0;
  for (const s of out) max = Math.max(max, Math.abs(s));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] = ((out[i] as number) / max) * PEAK;
  return out;
}

/** White noise from a seed (mulberry32), the same on every run. */
function noise(seed: number) {
  let a = seed >>> 0;
  return {
    white(): number {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
    },
  };
}

/** A biquad band-pass (RBJ cookbook, constant peak gain) at a fixed centre. */
function bandPass(centre: number, q: number): (x: number) => number {
  const band = movingBandPass();
  return (x) => band(x, centre, q);
}

/** A biquad band-pass whose centre may change on every sample. */
function movingBandPass(): (x: number, centre: number, q: number) => number {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (x, centre, q) => {
    const w = (2 * Math.PI * centre) / RATE;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    const y = (alpha * x - alpha * x2 + 2 * Math.cos(w) * y1 - (1 - alpha) * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

/** A one-pole low-pass. */
function lowPass(cutoff: number): (x: number) => number {
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  return (x) => {
    y += k * (x - y);
    return y;
  };
}

/** A mono 16-bit PCM WAV file of the samples. */
export function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] as number));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVE", 8, "ascii");
  head.write("fmt ", 12, "ascii");
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36, "ascii");
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

if (import.meta.filename === process.argv[1]) {
  const force = process.argv.includes("--force");
  for (const [id, synth] of Object.entries(SOUNDS)) {
    const file = join(import.meta.dirname, `${id}.wav`);
    if (existsSync(file) && !force) continue;
    writeFileSync(file, wav(synth()));
    process.stdout.write(`${id}.wav\n`);
  }
}
