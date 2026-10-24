import type { ResolvedState } from "@cutcut/kit";
import type { ReactNode } from "react";
import {
  AssetSources, Compositor, FRAME_EPS, ManualClock, MediabunnyInputs, buildAudioPlan, captureWarnings, makeNestedResolver,
  mediabunnyFrameSourceFactory, type MediaResolver, type PlayerErrorEvent,
} from "@cutcut/player/engine";
import { AudioSample, AudioSampleSource, FilePathTarget, Mp4OutputFormat, Output, VideoSample, VideoSampleSource, WebMOutputFormat, canEncodeAudio } from "mediabunny";
import type { Canvas } from "skia-canvas";
import { createCanvas, initEnv } from "./env";
import { frameSourceHooks } from "./frame-source";
import { mixPlan, type MixedBlock } from "./mixer";
import { OverlayPlane, type OverlayFont } from "./overlays";
import { MediabunnyPcm } from "./pcm";

export type VideoCodec = "vp9" | "vp8" | "av1" | "avc" | "hevc";

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
  readonly warnings: readonly string[];
  readonly errors: readonly PlayerErrorEvent[];
}

/** Renders the composition to a file, one frame at a time, through the same plan and painter as the preview. */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  initEnv();
  const { state } = options;
  const { fps, width, height } = state.composition;
  const container = options.container ?? (options.out.toLowerCase().endsWith(".mp4") ? "mp4" : "webm");
  const codec = options.videoCodec ?? (container === "mp4" ? "avc" : "vp9");
  const from = Math.max(0, options.from ?? 0);
  const to = Math.min(state.composition.duration, options.to ?? state.composition.duration);
  const first = Math.round(from * fps);
  const last = Math.ceil(to * fps - FRAME_EPS);
  const total = Math.max(0, last - first);
  if (total === 0) throw new Error("nothing to render: the range holds no frames");

  const warnings: string[] = [];
  captureWarnings((m) => warnings.push(m));
  const errors: PlayerErrorEvent[] = [];
  const inputs = new MediabunnyInputs();
  const sources = new AssetSources({
    media: options.media,
    manifest: state.manifest,
    clock: new ManualClock(),
    onError: (e) => errors.push(e),
    frameSourceFactory: mediabunnyFrameSourceFactory(inputs, createCanvas, frameSourceHooks),
  });
  const compositor = new Compositor(state, { sources, createCanvas, resolveNested: makeNestedResolver(() => state) });
  const canvas = createCanvas(width, height) as unknown as Canvas;
  const ctx = canvas.getContext("2d");
  compositor.attach(ctx as never);
  const overlays = new OverlayPlane({ state, media: options.media, warn: (m) => warnings.push(m), ...(options.interiors ? { interiors: options.interiors } : {}), ...(options.fonts ? { fonts: options.fonts } : {}) });

  const output = new Output({ format: container === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(), target: new FilePathTarget(options.out) });
  const source = new VideoSampleSource({
    codec,
    bitrate: options.bitrate ?? Math.round(width * height * fps * 0.1),
    keyFrameInterval: options.keyFrameInterval ?? 2,
    hardwareAcceleration: "prefer-software",
  });
  output.addVideoTrack(source, { frameRate: fps });

  // Audio: the player's own plan, mixed by us and handed to the encoder block by block, a little ahead of the picture.
  const sampleRate = Number(state.items.get(state.composition.id)?.props.sampleRate ?? 48000);
  const plan = options.silent ? [] : buildAudioPlan(state, from, to, makeNestedResolver(() => state));
  const audioCodec = container === "mp4" ? "aac" : "opus";
  const withAudio = plan.length > 0 && (await canEncodeAudio(audioCodec, { numberOfChannels: 2, sampleRate }));
  if (plan.length > 0 && !withAudio) warnings.push(`no ${audioCodec} encoder for ${sampleRate} Hz stereo: the file has no sound`);
  const pcm = withAudio ? new MediabunnyPcm(options.media) : null;
  const audioSource = withAudio ? new AudioSampleSource({ codec: audioCodec, bitrate: options.audioBitrate ?? 128_000 }) : null;
  if (audioSource) output.addAudioTrack(audioSource);
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

  const started = performance.now();
  try {
    await output.start();
    for (let n = first; n < last; n++) {
      if (options.signal?.aborted) throw new Error("render aborted");
      const t = n / fps;
      await pumpAudio((n - first + 1) / fps + 0.5);
      await compositor.step(t);
      if (errors.length > 0 && options.onAssetError !== "continue") {
        throw new Error(`cannot render: ${errors.map((e) => `${e.asset ?? e.id ?? "?"}: ${e.error.message}`).join("; ")}`);
      }
      await overlays.draw(ctx, t);
      const raw = await canvas.toBuffer("raw");
      const sample = new VideoSample(new Uint8Array(raw.buffer, raw.byteOffset, raw.length), { format: "RGBA", codedWidth: width, codedHeight: height, timestamp: (n - first) / fps, duration: 1 / fps });
      await source.add(sample);
      sample.close();
      options.onProgress?.({ frame: n - first + 1, frames: total });
    }
    await pumpAudio(Number.POSITIVE_INFINITY);
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    overlays.dispose();
    compositor.dispose();
    sources.dispose();
    inputs.dispose();
    pcm?.dispose();
    captureWarnings(null);
  }
  return { frames: total, audio: withAudio, fps, width, height, wallMs: performance.now() - started, warnings, errors };
}
