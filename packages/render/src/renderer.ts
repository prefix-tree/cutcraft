import type { ResolvedState } from "@cutcut/kit";
import type { ReactNode } from "react";
import { FRAME_EPS, buildAudioPlan, captureWarnings, makeNestedResolver, type MediaResolver, type PlayerErrorEvent } from "@cutcut/player/engine";
import { AudioSample, AudioSampleSource, EncodedVideoPacketSource, FilePathTarget, Mp4OutputFormat, Output, WebMOutputFormat, canEncodeAudio } from "mediabunny";
import { encodeFrames } from "./encode";
import { initEnv } from "./env";
import { mixPlan, type MixedBlock } from "./mixer";
import type { OverlayFont } from "./overlays";
import { MediabunnyPcm } from "./pcm";
import { feedSegment, planSegments, SegmentPool, defaultWorkers, type ParallelOptions } from "./parallel";
import { FramePipeline } from "./pipeline";
import { videoSource, type VideoCodec, type VideoEncoding } from "./segment";

export interface RenderOptions {
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  /** The file to write; its extension picks the container unless `container` is given. */
  readonly out: string;
  readonly container?: "webm" | "mp4";
  readonly videoCodec?: VideoCodec;
  /** Bits per second; default about 0.1 bits per pixel per frame. */
  readonly bitrate?: number;
  /** Seconds between keyframes; default 2. */
  readonly keyFrameInterval?: number;
  /** Render only this part of the composition, in composition seconds. */
  readonly from?: number;
  readonly to?: number;
  /** The children of each `<Layer id>` in the file (`indexLayerInteriors(file.default())`); without them layers draw nothing. */
  readonly interiors?: ReadonlyMap<string, ReactNode>;
  /** Fonts beyond the bundled Inter, picked by a title's `font` prop. */
  readonly fonts?: readonly OverlayFont[];
  /** `fast` trades compression for speed: the encoder's real-time mode. */
  readonly speed?: "quality" | "fast";
  /**
   * Render in worker threads. Needs the file the state came from, because every worker loads it for itself;
   * the result is the same pictures, in pieces joined at keyframes.
   */
  readonly parallel?: ParallelOptions;
  /** Skip the soundtrack. */
  readonly silent?: boolean;
  /** Audio bits per second; default 128 kbit/s. */
  readonly audioBitrate?: number;
  readonly onProgress?: (progress: { readonly frame: number; readonly frames: number }) => void;
  readonly signal?: AbortSignal;
  /** What to do when an asset cannot be opened or decoded: stop (default) or draw the grey placeholder and go on. */
  readonly onAssetError?: "throw" | "continue";
}

export interface RenderResult {
  readonly frames: number;
  /** Whether the file has an audio track. */
  readonly audio: boolean;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly wallMs: number;
  /** Threads that rendered: 1 when the frames were rendered in this one. */
  readonly workers: number;
  /** How long the frame loop was held up by each stage, summed over frames (the encoder runs beside the loop, so `encode` is only the part it did not hide). */
  readonly stagesMs: { readonly composite: number; readonly overlays: number; readonly readback: number; readonly encode: number; readonly audio: number };
  readonly warnings: readonly string[];
  readonly errors: readonly PlayerErrorEvent[];
}

/** Renders the composition to a file, one frame at a time, through the same plan and painter as the preview. */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  initEnv();
  const { state } = options;
  const { fps, width, height } = state.composition;
  const container = options.container ?? (options.out.toLowerCase().endsWith(".mp4") ? "mp4" : "webm");
  const encoding: VideoEncoding = {
    container,
    codec: options.videoCodec ?? (container === "mp4" ? "avc" : "vp9"),
    bitrate: options.bitrate ?? Math.round(width * height * fps * 0.1),
    keyFrameInterval: options.keyFrameInterval ?? 2,
    speed: options.speed,
  };
  const from = Math.max(0, options.from ?? 0);
  const to = Math.min(state.composition.duration, options.to ?? state.composition.duration);
  const first = Math.round(from * fps);
  const last = Math.ceil(to * fps - FRAME_EPS);
  const total = Math.max(0, last - first);
  if (total === 0) throw new Error("nothing to render: the range holds no frames");
  // Workers only pay off with at least two runs of frames to share.
  const wanted = options.parallel ? Math.max(1, Math.floor(options.parallel.workers ?? defaultWorkers())) : 1;
  const runs = options.parallel && wanted > 1 ? planSegments(first, last, Math.round(encoding.keyFrameInterval * fps), wanted, options.parallel.segmentFrames) : [];
  const threads = runs.length > 1 ? Math.min(wanted, runs.length) : 1;

  const warnings: string[] = [];
  captureWarnings((m) => warnings.push(m));
  const errors: PlayerErrorEvent[] = [];
  const output = new Output({ format: container === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(), target: new FilePathTarget(options.out) });

  // Audio: the player's own plan, mixed by us and handed to the encoder block by block, a little ahead of the picture.
  const sampleRate = Number(state.items.get(state.composition.id)?.props.sampleRate ?? 48000);
  const plan = options.silent ? [] : buildAudioPlan(state, from, to, makeNestedResolver(() => state));
  const audioCodec = container === "mp4" ? "aac" : "opus";
  const withAudio = plan.length > 0 && (await canEncodeAudio(audioCodec, { numberOfChannels: 2, sampleRate }));
  if (plan.length > 0 && !withAudio) warnings.push(`no ${audioCodec} encoder for ${sampleRate} Hz stereo: the file has no sound`);
  const pcm = withAudio ? new MediabunnyPcm(options.media) : null;
  const audioSource = withAudio ? new AudioSampleSource({ codec: audioCodec, bitrate: options.audioBitrate ?? 128_000 }) : null;
  const mix = pcm ? mixPlan(plan, pcm, { sampleRate, from, to }) : null;
  let mixedUntil = 0;
  let audioDone = !mix;
  const pumpAudio = async (until: number): Promise<void> => {
    while (mix && audioSource && !audioDone && mixedUntil < until) {
      const next = await mix.next();
      if (next.done) { audioDone = true; return; }
      const block: MixedBlock = next.value;
      const planar = new Float32Array(block.left.length * 2);
      planar.set(block.left, 0);
      planar.set(block.right, block.left.length);
      const sample = new AudioSample({ data: planar, format: "f32-planar", numberOfChannels: 2, sampleRate, timestamp: block.timestamp });
      await audioSource.add(sample);
      sample.close();
      mixedUntil = block.timestamp + block.left.length / sampleRate;
    }
  };

  const stages = { composite: 0, overlays: 0, readback: 0, encode: 0, audio: 0 };
  const timed = async <T>(stage: "encode" | "audio", work: () => Promise<T>): Promise<T> => {
    const at = performance.now();
    try { return await work(); } finally { stages[stage] += performance.now() - at; }
  };
  const ahead = (seconds: number): Promise<void> => timed("audio", () => pumpAudio(seconds + 0.5));
  const started = performance.now();
  let pool: SegmentPool | null = null;
  let pipeline: FramePipeline | null = null;
  try {
    if (options.parallel && threads > 1) {
      // Workers render and encode runs of frames; this thread joins them in order and mixes the sound.
      const source = new EncodedVideoPacketSource(encoding.codec);
      output.addVideoTrack(source, { frameRate: fps });
      if (audioSource) output.addAudioTrack(audioSource);
      await output.start();
      const par = options.parallel;
      pool = new SegmentPool(threads, {
        file: par.file, load: par.load ?? {}, mediaDir: par.mediaDir, overrides: par.overrides ?? {}, fonts: options.fonts ?? [], encoding, onAssetError: options.onAssetError ?? "throw",
      });
      const results = runs.map((r) => pool!.run(r.first, r.last));
      results.forEach((r) => r.catch(() => undefined));
      const config = { current: null as VideoDecoderConfig | null };
      let done = 0;
      for (const [i, run] of runs.entries()) {
        if (options.signal?.aborted) throw new Error("render aborted");
        const outcome = await timed("encode", () => results[i] as Promise<Awaited<(typeof results)[number]>>);
        if (outcome.errors.length > 0 && options.onAssetError !== "continue") throw new Error(`cannot render: ${outcome.errors.join("; ")}`);
        for (const w of outcome.warnings) if (!warnings.includes(w)) warnings.push(w);
        for (const k of ["composite", "overlays", "readback"] as const) stages[k] += outcome.stages[k];
        await feedSegment(outcome, { source, codec: encoding.codec, fps, offsetFrames: run.first - first, config }, ahead);
        done += run.last - run.first;
        options.onProgress?.({ frame: done, frames: total });
      }
      await timed("audio", () => pumpAudio(Number.POSITIVE_INFINITY));
      await timed("encode", () => output.finalize());
    } else {
      pipeline = new FramePipeline({ state, media: options.media, interiors: options.interiors, fonts: options.fonts, onAssetError: options.onAssetError, warn: (m) => warnings.push(m) });
      const source = videoSource(encoding);
      output.addVideoTrack(source, { frameRate: fps });
      if (audioSource) output.addAudioTrack(audioSource);
      await output.start();
      stages.encode += await encodeFrames({
        pipeline, source, fps, width, height, first, last, signal: options.signal,
        before: (n) => ahead((n - first + 1) / fps),
        progress: (frame) => options.onProgress?.({ frame, frames: total }),
      });
      await timed("audio", () => pumpAudio(Number.POSITIVE_INFINITY));
      await timed("encode", () => output.finalize());
      for (const k of ["composite", "overlays", "readback"] as const) stages[k] += pipeline.stages[k];
      errors.push(...pipeline.errors);
    }
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    await pool?.terminate();
    pipeline?.dispose();
    pcm?.dispose();
    captureWarnings(null);
  }
  return { frames: total, audio: withAudio, fps, width, height, wallMs: performance.now() - started, workers: pool ? threads : 1, stagesMs: stages, warnings, errors };
}

export type { VideoCodec };
