// The soundtrack, made in the export page: the player's audio plan, its clips decoded with WebCodecs, mixed sample by
// sample, and encoded for the file's container (Opus with WebCodecs; AAC and MP3 with Mediabunny's WebAssembly
// encoders, as Chrome on Linux has neither; WAV as plain PCM).
import { registerAacEncoder } from "@mediabunny/aac-encoder";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";
import {
  type AudioCodec,
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  canEncodeAudio,
  Mp3OutputFormat,
  Mp4OutputFormat,
  Output,
  WavOutputFormat,
  WebMOutputFormat,
} from "mediabunny";

import type { ResolvedState } from "@cutcraft/kit";
import { buildAudioPlan, type MediaResolver, makeNestedResolver } from "@cutcraft/player/engine";

import { clippingWarning, createLoudnessMeter, type Loudness } from "../../loudness";
import { mixPlan } from "../../mixer";
import { MediabunnyPcm } from "../../pcm";
import type { AudioRequest } from "./protocol";

registerAacEncoder();
registerMp3Encoder();

const CODEC: Readonly<Record<AudioRequest["container"], AudioCodec>> = {
  mp4: "aac",
  webm: "opus",
  mp3: "mp3",
  wav: "pcm-s16",
};

export interface Soundtrack {
  /** The encoded file, or null when the range has no sound or no encoder takes it. */
  readonly bytes: Uint8Array | null;
  readonly codec: AudioCodec | null;
  readonly warnings: readonly string[];
}

export async function renderSoundtrack(
  state: ResolvedState,
  media: MediaResolver,
  r: AudioRequest,
): Promise<Soundtrack> {
  const plan = buildAudioPlan(
    state,
    r.from,
    r.to,
    makeNestedResolver(() => state),
  );
  if (plan.length === 0) return { bytes: null, codec: null, warnings: [] };
  const sampleRate = Number(state.items.get(state.composition.id)?.props.sampleRate ?? 48000);
  const codec = CODEC[r.container];
  if (!(await canEncodeAudio(codec, { numberOfChannels: 2, sampleRate })))
    return {
      bytes: null,
      codec: null,
      warnings: [`no ${codec} encoder for ${sampleRate} Hz stereo: the file has no sound`],
    };
  const target = new BufferTarget();
  const output = new Output({
    format:
      r.container === "mp4"
        ? new Mp4OutputFormat()
        : r.container === "webm"
          ? new WebMOutputFormat()
          : r.container === "mp3"
            ? new Mp3OutputFormat()
            : new WavOutputFormat(),
    target,
  });
  const source = new AudioSampleSource({ codec, ...(codec.startsWith("pcm-") ? {} : { bitrate: r.bitrate }) });
  output.addAudioTrack(source);
  await output.start();
  const pcm = new MediabunnyPcm(media);
  // Measured before the clamp, then clamped here, so the mix runs once and the file sounds as it did.
  const meter = createLoudnessMeter(sampleRate);
  try {
    for await (const block of mixPlan(plan, pcm, { sampleRate, from: r.from, to: r.to, clamp: false })) {
      meter.add(block.left, block.right);
      const planar = new Float32Array(block.left.length * 2);
      planar.set(block.left, 0);
      planar.set(block.right, block.left.length);
      for (let i = 0; i < planar.length; i++) planar[i] = Math.max(-1, Math.min(1, planar[i] as number));
      const sample = new AudioSample({
        data: planar,
        format: "f32-planar",
        numberOfChannels: 2,
        sampleRate,
        timestamp: block.timestamp,
      });
      await source.add(sample);
      sample.close();
    }
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    pcm.dispose();
  }
  const clips = clippingWarning(meter.result(), r.from);
  return { bytes: new Uint8Array(target.buffer as ArrayBuffer), codec, warnings: clips ? [clips] : [] };
}

/** What a stretch of the mix sounds like, measured: for a picture of it, and for the numbers beside it. */
export interface SoundMeasure extends Loudness {
  /** The loudest sample of each column, 0..1, and the root mean square of each. */
  readonly peaks: number[];
  readonly rms: number[];
  /**
   * The loudest sample of the stretch and its root mean square, in dB relative to full scale; null for silence. The
   * mix is measured before the export clamps it, so a peak above 0 is sound the file will clip.
   */
  readonly peakDb: number | null;
  readonly rmsDb: number | null;
  /** Stretches of at least 0.3 s quieter than -50 dBFS, in composition seconds. */
  readonly silences: [number, number][];
}

const SILENCE_DB = -50;
const SILENCE_MIN_S = 0.3;
const WINDOW_S = 0.05;

const db = (x: number): number | null => (x > 0 ? Math.round(200 * Math.log10(x)) / 10 : null);

/** Mixes composition seconds [from, to) as the export does, and measures the mix in `columns` equal slices. */
export async function measureSound(
  state: ResolvedState,
  media: MediaResolver,
  from: number,
  to: number,
  columns: number,
): Promise<SoundMeasure> {
  const peaks = new Array<number>(columns).fill(0);
  const squares = new Array<number>(columns).fill(0);
  const counts = new Array<number>(columns).fill(0);
  const plan = buildAudioPlan(
    state,
    from,
    to,
    makeNestedResolver(() => state),
  );
  const sampleRate = Number(state.items.get(state.composition.id)?.props.sampleRate ?? 48000);
  const total = Math.max(1, Math.ceil((to - from) * sampleRate));
  const windowFrames = Math.max(1, Math.round(WINDOW_S * sampleRate));
  const windows = new Array<number>(Math.ceil(total / windowFrames)).fill(0);
  let peak = 0,
    sum = 0,
    seen = 0;
  const meter = createLoudnessMeter(sampleRate);
  if (plan.length > 0) {
    const pcm = new MediabunnyPcm(media);
    try {
      for await (const block of mixPlan(plan, pcm, { sampleRate, from, to, clamp: false })) {
        meter.add(block.left, block.right);
        for (let i = 0; i < block.left.length; i++) {
          const l = block.left[i] as number,
            r = block.right[i] as number;
          const loud = Math.max(Math.abs(l), Math.abs(r));
          const power = (l * l + r * r) / 2;
          const column = Math.min(columns - 1, Math.floor((seen / total) * columns));
          if (loud > (peaks[column] as number)) peaks[column] = loud;
          squares[column] = (squares[column] as number) + power;
          counts[column] = (counts[column] as number) + 1;
          const w = Math.floor(seen / windowFrames);
          windows[w] = (windows[w] as number) + power;
          if (loud > peak) peak = loud;
          sum += power;
          seen++;
        }
      }
    } finally {
      pcm.dispose();
    }
  }
  // Windows of 50 ms below the floor, joined, and kept when they last.
  const floor = 10 ** (SILENCE_DB / 20);
  const silences: [number, number][] = [];
  let start: number | null = null;
  for (let w = 0; w <= windows.length; w++) {
    const quiet = w < windows.length && Math.sqrt((windows[w] as number) / windowFrames) < floor;
    if (quiet && start === null) start = w;
    if (!quiet && start !== null) {
      const a = from + (start * windowFrames) / sampleRate;
      const b = Math.min(to, from + (w * windowFrames) / sampleRate);
      if (b - a >= SILENCE_MIN_S) silences.push([Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]);
      start = null;
    }
  }
  const loudness = meter.result();
  return {
    ...loudness,
    clippedAt: loudness.clippedAt === null ? null : Math.round((from + loudness.clippedAt) * 1000) / 1000,
    peaks: peaks.map((p) => Math.min(1, p)),
    rms: squares.map((s, i) => Math.min(1, Math.sqrt(s / Math.max(1, counts[i] as number)))),
    peakDb: db(peak),
    rmsDb: db(seen > 0 ? Math.sqrt(sum / seen) : 0),
    silences,
  };
}
