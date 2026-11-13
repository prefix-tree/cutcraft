import type { AudioOccurrence, GainPoint } from "@cutcraft/player/engine";

/** Planar PCM of one decoded source range, at the source's own sample rate. */
export interface PcmBuffer {
  readonly sampleRate: number;
  /** One array per channel, all the same length. */
  readonly channels: readonly Float32Array[];
}

/** An occurrence with the PCM of its chunk, ready to mix. */
export interface MixSource {
  readonly occurrence: AudioOccurrence;
  readonly pcm: PcmBuffer;
}

/**
 * Value of a piecewise linear envelope at `t`: the first value before the
 * first point, the last value after the last, a straight line between.
 * This is what the player's Web Audio automation does with the same points.
 */
export function envelopeAt(points: readonly GainPoint[], t: number, fallback: number): number {
  const first = points[0],
    last = points[points.length - 1];
  if (!first || !last) return fallback;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  let lo = 0,
    hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((points[mid] as GainPoint)[0] <= t) lo = mid;
    else hi = mid;
  }
  const a = points[lo] as GainPoint,
    b = points[hi] as GainPoint;
  return b[0] === a[0] ? b[1] : a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
}

/**
 * Buffer seconds an occurrence has played by composition time `t`: the
 * integral of its `rate` from `compStart` (a prefix integral per point plus a
 * binary search, exact for the piecewise linear envelope that Web Audio
 * automates), or `(t - compStart) * speed` without one.
 */
function playedAt(o: AudioOccurrence): (t: number) => number {
  const r = o.rate;
  if (!r || r.length === 0) return (t) => (t - o.compStart) * o.speed;
  const n = r.length;
  const cum = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const a = r[i - 1] as GainPoint,
      b = r[i] as GainPoint;
    cum[i] = (cum[i - 1] as number) + ((b[0] - a[0]) * (a[1] + b[1])) / 2;
  }
  const first = r[0] as GainPoint,
    last = r[n - 1] as GainPoint;
  const integral = (t: number): number => {
    if (t <= first[0]) return (t - first[0]) * first[1];
    if (t >= last[0]) return (cum[n - 1] as number) + (t - last[0]) * last[1];
    let lo = 0,
      hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((r[mid] as GainPoint)[0] <= t) lo = mid;
      else hi = mid;
    }
    const a = r[lo] as GainPoint,
      b = r[hi] as GainPoint;
    const v = a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
    return (cum[lo] as number) + ((t - a[0]) * (a[1] + v)) / 2;
  };
  const base = integral(o.compStart);
  return (t) => integral(t) - base;
}

/**
 * Mixes `frames` output frames starting at output frame `startFrame` into stereo.
 * Every output sample is computed from the time alone, so the result does not
 * depend on how the output is cut into blocks.
 *
 * For an occurrence, composition time t reads source time
 * `bufferFrom + playedAt(o)(t)`; pitch follows speed, as in the preview. Samples are linearly interpolated, which also converts sample
 * rates. Pan follows the Web Audio StereoPanner rules, so mono and stereo
 * sources pan the same way as in the player.
 */
export function mixBlock(
  sources: readonly MixSource[],
  startFrame: number,
  frames: number,
  sampleRate: number,
  clamp = true,
): [Float32Array, Float32Array] {
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const t0 = startFrame / sampleRate;
  const t1 = (startFrame + frames) / sampleRate;
  for (const { occurrence: o, pcm } of sources) {
    if (o.compEnd <= t0 || o.compStart >= t1) continue;
    const first = Math.max(0, Math.ceil(o.compStart * sampleRate - startFrame - 1e-9));
    const last = Math.min(frames, Math.ceil(o.compEnd * sampleRate - startFrame - 1e-9));
    const chs = pcm.channels;
    const nCh = chs.length;
    if (nCh === 0 || last <= first) continue;
    const c0 = chs[0] as Float32Array,
      c1 = (nCh > 1 ? chs[1] : chs[0]) as Float32Array;
    const length = c0.length;
    const stereo = nCh > 1;
    const hasPan = (o.pan?.length ?? 0) > 0;
    const played = playedAt(o);
    for (let i = first; i < last; i++) {
      // From the absolute frame index, so no block size changes a sample.
      const t = (startFrame + i) / sampleRate;
      // Seconds into the chunk's buffer, then samples at the buffer's own rate.
      const pos = played(t) * pcm.sampleRate;
      if (pos < 0 || pos > length - 1) continue;
      const k = Math.floor(pos),
        f = pos - k;
      const k2 = k + 1 < length ? k + 1 : k;
      const inL = (c0[k] as number) * (1 - f) + (c0[k2] as number) * f;
      const inR = stereo ? (c1[k] as number) * (1 - f) + (c1[k2] as number) * f : inL;
      let l = inL,
        r = inR;
      if (hasPan) {
        const p = Math.max(-1, Math.min(1, envelopeAt(o.pan as readonly GainPoint[], t, 0)));
        if (stereo) {
          const x = p <= 0 ? p + 1 : p;
          const gl = Math.cos((x * Math.PI) / 2),
            gr = Math.sin((x * Math.PI) / 2);
          if (p <= 0) {
            l = inL + inR * gl;
            r = inR * gr;
          } else {
            l = inL * gl;
            r = inR + inL * gr;
          }
        } else {
          const x = (p + 1) / 2;
          l = inL * Math.cos((x * Math.PI) / 2);
          r = inL * Math.sin((x * Math.PI) / 2);
        }
      }
      const g = envelopeAt(o.gain, t, 1);
      left[i] = (left[i] as number) + l * g;
      right[i] = (right[i] as number) + r * g;
    }
  }
  for (let i = 0; clamp && i < frames; i++) {
    left[i] = Math.max(-1, Math.min(1, left[i] as number));
    right[i] = Math.max(-1, Math.min(1, right[i] as number));
  }
  return [left, right];
}

/** Where the mixer gets decoded audio: any asset's PCM for a source range. */
export interface PcmProvider {
  range(asset: string, from: number, to: number): Promise<PcmBuffer>;
}

export interface MixOptions {
  readonly sampleRate: number;
  /** Composition seconds to mix: from (default 0) to `to`. */
  readonly from?: number;
  readonly to: number;
  /** Frames per block; default 4096. */
  readonly blockFrames?: number;
  /** False leaves samples above full scale as they are, for measuring; default true. */
  readonly clamp?: boolean;
}

export interface MixedBlock {
  /** Seconds from the start of the mixed range. */
  readonly timestamp: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
}

/**
 * Mixes a whole plan block by block. A chunk's PCM is decoded when its first
 * block is reached and dropped after its last, so memory holds only the chunks
 * playing now; blocks with nothing playing are silence without any work.
 */
export async function* mixPlan(
  plan: readonly AudioOccurrence[],
  pcm: PcmProvider,
  options: MixOptions,
): AsyncGenerator<MixedBlock, void, unknown> {
  const sr = options.sampleRate;
  const block = options.blockFrames ?? 4096;
  const startFrame = Math.round((options.from ?? 0) * sr);
  const endFrame = Math.ceil(options.to * sr - 1e-9);
  const sorted = [...plan].sort((a, b) => a.compStart - b.compStart);
  const loading = new Map<string, Promise<MixSource>>();
  const key = (o: AudioOccurrence): string => `${o.id}#${o.chunk}`;
  for (let f = startFrame; f < endFrame; f += block) {
    const frames = Math.min(block, endFrame - f);
    const t0 = f / sr,
      t1 = (f + frames) / sr;
    const active = sorted.filter((o) => o.compEnd > t0 && o.compStart < t1);
    for (const o of active) {
      if (!loading.has(key(o)))
        loading.set(
          key(o),
          pcm.range(o.asset, o.bufferFrom, o.bufferTo).then((buf) => ({
            occurrence: o,
            pcm: o.reverse ? { ...buf, channels: buf.channels.map((c) => c.slice().reverse()) } : buf,
          })),
        );
    }
    const sources = await Promise.all(active.map((o) => loading.get(key(o)) as Promise<MixSource>));
    for (const [k, p] of loading) {
      void p;
      const o = sorted.find((x) => key(x) === k);
      if (o && o.compEnd <= t0) loading.delete(k);
    }
    const [left, right] = mixBlock(sources, f, frames, sr, options.clamp);
    yield { timestamp: (f - startFrame) / sr, left, right };
  }
}
