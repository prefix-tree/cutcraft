import type { ResolvedState } from "@cutcut/kit";
import type { ReactNode } from "react";
import { FRAME_EPS, buildAudioPlan, captureWarnings, makeNestedResolver, type MediaResolver, type PlayerErrorEvent } from "@cutcut/player/engine";
import { AudioSample, AudioSampleSource, EncodedVideoPacketSource, FilePathTarget, Mp3OutputFormat, Output, WavOutputFormat, canEncodeAudio, type AudioCodec } from "mediabunny";
import { encodeFrames } from "./encode";
import { initEnv } from "./env";
import { mixPlan, type MixedBlock } from "./mixer";
import { OverlayPlane, type OverlayFont } from "./overlays";
import { MediabunnyPcm } from "./pcm";
import { feedCopy, planCopy, type Run } from "./copy";
import { feedSegment, planSegments, SegmentPool, defaultWorkers, type ParallelOptions, type SegmentOutcome } from "./parallel";
import { FramePipeline } from "./pipeline";
import { encodeSegment, hardwareEncodes, outputFormat, videoSource, type QualityName, type Speed, type VideoCodec, type VideoContainer, type VideoEncoding } from "./segment";

export type Container = VideoContainer | "mp3" | "wav";
const AUDIO_CODEC: Record<Container, AudioCodec> = { webm: "opus", mp4: "aac", mov: "pcm-s16", mp3: "mp3", wav: "pcm-s16" };

/** The container a file name asks for: .mp4, .mov, .mp3 and .wav by extension, WebM otherwise. */
export function containerOf(out: string): Container {
  const ext = /\.([a-z0-9]+)$/i.exec(out)?.[1]?.toLowerCase();
  return ext === "mp4" || ext === "mov" || ext === "mp3" || ext === "wav" ? ext : "webm";
}

export interface RenderOptions {
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  /** The file to write; its extension picks the container unless `container` is given. MP3 and WAV hold only the soundtrack. */
  readonly out: string;
  readonly container?: Container;
  /** Default VP9 in WebM, AVC in MP4, ProRes in MOV. */
  readonly videoCodec?: VideoCodec;
  /** Bits per second; default about 0.1 bits per pixel per frame. */
  readonly bitrate?: number;
  /** One of the encoder's quality presets, in place of `bitrate`. */
  readonly quality?: QualityName;
  /** Seconds between keyframes; default 2. */
  readonly keyFrameInterval?: number;
  /** Render only this part of the composition, in composition seconds. */
  readonly from?: number;
  readonly to?: number;
  /** The children of each `<Layer id>` in the file (`indexLayerInteriors(file.default())`); without them layers draw nothing. */
  readonly interiors?: ReadonlyMap<string, ReactNode>;
  /** Fonts beyond the bundled Inter, picked by a title's `font` prop. */
  readonly fonts?: readonly OverlayFont[];
  /** Compression against speed for the software H.264 and HEVC encoders: `quality` (default), `balanced` or `fast`. */
  readonly speed?: Speed;
  /** H.264 and HEVC go through the machine's hardware encoder when it has one that works (default); false keeps software. */
  readonly hardware?: boolean;
  /**
   * Render in worker threads. Needs the file the state came from, because every worker loads it for itself;
   * the result is the same pictures, in pieces joined at keyframes.
   */
  readonly parallel?: ParallelOptions;
  /**
   * Copy the encoded pictures of whole groups of pictures from the source where a cut shows nothing but a stretch of
   * one file (VP8 or VP9, at the composition's size and frame rate, no overlay or effect), and render only the ends.
   */
  readonly smartCopy?: boolean;
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
  /** Pictures written: 0 for an MP3 or WAV. */
  readonly frames: number;
  /** Whether the file has an audio track. */
  readonly audio: boolean;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly wallMs: number;
  /** Threads that rendered: 1 when the frames were rendered in this one. */
  readonly workers: number;
  /** Frames whose encoded pictures were copied from a source instead of rendered. */
  readonly copiedFrames: number;
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
  const container = options.container ?? containerOf(options.out);
  const audioOnly = container === "mp3" || container === "wav";
  const videoContainer: VideoContainer = audioOnly ? "webm" : container;
  const base: VideoEncoding = {
    container: videoContainer,
    codec: options.videoCodec ?? (container === "mp4" ? "avc" : container === "mov" ? "prores" : "vp9"),
    bitrate: options.bitrate ?? Math.round(width * height * fps * 0.1),
    quality: options.quality,
    keyFrameInterval: options.keyFrameInterval ?? 2,
    speed: options.speed,
  };
  const encoding: VideoEncoding = { ...base, hardware: !audioOnly && options.hardware !== false && (await hardwareEncodes(base, width, height)) };
  if (!audioOnly && !outputFormat(videoContainer).getSupportedVideoCodecs().includes(encoding.codec)) {
    throw new Error(`a .${container} file cannot hold ${encoding.codec} video; use ${outputFormat(videoContainer).getSupportedVideoCodecs().join(", ")}`);
  }
  if (audioOnly && options.silent) throw new Error(`nothing to render: a .${container} file holds only the soundtrack`);
  const from = Math.max(0, options.from ?? 0);
  const to = Math.min(state.composition.duration, options.to ?? state.composition.duration);
  const first = Math.round(from * fps);
  const last = Math.ceil(to * fps - FRAME_EPS);
  const total = Math.max(0, last - first);
  if (total === 0) throw new Error("nothing to render: the range holds no frames");
  const gopFrames = Math.max(1, Math.round(encoding.keyFrameInterval * fps));
  const wanted = options.parallel ? Math.max(1, Math.floor(options.parallel.workers ?? defaultWorkers())) : 1;

  const warnings: string[] = [];
  captureWarnings((m) => warnings.push(m));
  const errors: PlayerErrorEvent[] = [];
  // Which frames are copied, which are rendered, and how the rendered ones are cut into runs for workers.
  const sharedOverlays = options.smartCopy && !audioOnly ? new OverlayPlane({ state, media: options.media, warn: (m) => warnings.push(m), ...(options.interiors ? { interiors: options.interiors } : {}), ...(options.fonts ? { fonts: options.fonts } : {}) }) : null;
  const copyPlan = sharedOverlays ? await planCopy({ state, media: options.media, overlays: sharedOverlays, codec: encoding.codec, first, last }) : null;
  const runs: readonly Run[] = copyPlan?.runs ?? [{ kind: "render", first, last }];
  const pieces: Run[] = runs.flatMap((run) => (run.kind === "copy" || wanted === 1 ? [run] : planSegments(run.first, run.last, gopFrames, wanted, options.parallel?.segmentFrames).map((r): Run => ({ kind: "render", ...r }))));
  const renderPieces = pieces.filter((p) => p.kind === "render").length;
  const threads = options.parallel && wanted > 1 && renderPieces > 1 ? Math.min(wanted, renderPieces) : 1;
  const joined = (copyPlan?.copied ?? 0) > 0 || threads > 1;
  const output = new Output({ format: container === "mp3" ? new Mp3OutputFormat() : container === "wav" ? new WavOutputFormat() : outputFormat(container), target: new FilePathTarget(options.out) });

  // Audio: the player's own plan, mixed by us and handed to the encoder block by block, a little ahead of the picture.
  const sampleRate = Number(state.items.get(state.composition.id)?.props.sampleRate ?? 48000);
  const plan = options.silent ? [] : buildAudioPlan(state, from, to, makeNestedResolver(() => state));
  const audioCodec = AUDIO_CODEC[container];
  const withAudio = plan.length > 0 && (await canEncodeAudio(audioCodec, { numberOfChannels: 2, sampleRate }));
  if (plan.length > 0 && !withAudio) warnings.push(`no ${audioCodec} encoder for ${sampleRate} Hz stereo: the file has no sound`);
  const pcm = withAudio ? new MediabunnyPcm(options.media) : null;
  const audioSource = withAudio ? new AudioSampleSource({ codec: audioCodec, ...(audioCodec.startsWith("pcm-") ? {} : { bitrate: options.audioBitrate ?? 128_000 }) }) : null;
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
    if (audioOnly) {
      if (!audioSource) throw new Error(`nothing to render: ${plan.length > 0 ? `no ${audioCodec} encoder for ${sampleRate} Hz stereo` : "the composition has no sound in this range"}`);
      output.addAudioTrack(audioSource);
      await output.start();
      await timed("audio", () => pumpAudio(Number.POSITIVE_INFINITY));
      await timed("encode", () => output.finalize());
    } else if (joined) {
      // Pieces joined in order: runs a worker (or this thread) renders and encodes, and runs copied from the source.
      // This thread writes them to the file and mixes the sound.
      const source = new EncodedVideoPacketSource(encoding.codec);
      output.addVideoTrack(source, { frameRate: fps });
      if (audioSource) output.addAudioTrack(audioSource);
      await output.start();
      const par = options.parallel;
      if (par && threads > 1) {
        pool = new SegmentPool(threads, {
          file: par.file, load: par.load ?? {}, mediaDir: par.mediaDir, overrides: par.overrides ?? {}, fonts: options.fonts ?? [], encoding, onAssetError: options.onAssetError ?? "throw",
        });
      }
      // Pooled pieces start at once and finish in any order; in-process ones start when their turn comes.
      const work = pieces.map((piece): (() => Promise<SegmentOutcome>) | null => {
        if (piece.kind === "copy") return null;
        if (pool) { const started = pool.run(piece.first, piece.last); started.catch(() => undefined); return () => started; }
        return async () => {
          const r = await encodeSegment({ state, media: options.media, interiors: options.interiors, fonts: options.fonts, overlays: sharedOverlays ?? undefined, onAssetError: options.onAssetError, encoding, first: piece.first, last: piece.last });
          return { bytes: r.bytes, stages: r.stages, warnings: r.warnings, errors: r.errors.map((e) => `${e.asset ?? e.id ?? "?"}: ${e.error.message}`) };
        };
      });
      const config = { current: null as VideoDecoderConfig | null };
      let done = 0;
      for (const [i, piece] of pieces.entries()) {
        if (options.signal?.aborted) throw new Error("render aborted");
        if (piece.kind === "copy") {
          await feedCopy(piece, { source, fps, originFrame: first, config }, ahead);
        } else {
          const outcome = await timed("encode", () => (work[i] as () => Promise<SegmentOutcome>)());
          if (outcome.errors.length > 0 && options.onAssetError !== "continue") throw new Error(`cannot render: ${outcome.errors.join("; ")}`);
          for (const w of outcome.warnings) if (!warnings.includes(w)) warnings.push(w);
          for (const k of ["composite", "overlays", "readback"] as const) stages[k] += outcome.stages[k];
          await feedSegment(outcome, { source, codec: encoding.codec, fps, offsetFrames: piece.first - first, config }, ahead);
        }
        done += piece.last - piece.first;
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
    sharedOverlays?.dispose();
    pcm?.dispose();
    captureWarnings(null);
  }
  return { frames: audioOnly ? 0 : total, audio: withAudio, fps, width, height, wallMs: performance.now() - started, workers: pool ? threads : 1, copiedFrames: copyPlan?.copied ?? 0, stagesMs: stages, warnings, errors };
}

export type { VideoCodec };
