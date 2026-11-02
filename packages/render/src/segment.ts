import type { ResolvedState } from "@cutcut/kit";
import { captureWarnings, type MediaResolver, type PlayerErrorEvent } from "@cutcut/player/engine";
import { BufferTarget, MovOutputFormat, Mp4OutputFormat, Output, QUALITY_HIGH, VideoSample, QUALITY_LOW, QUALITY_MEDIUM, QUALITY_VERY_HIGH, QUALITY_VERY_LOW, VideoSampleSource, WebMOutputFormat } from "mediabunny";
import type { ReactNode } from "react";
import { encodeFrames } from "./encode";
import { initEnv } from "./env";
import type { OverlayFont, OverlayPlane } from "./overlays";
import { FramePipeline, type PipelineStages } from "./pipeline";

/**
 * How hard the software H.264 and HEVC encoders work: `quality` is x264's medium preset, `balanced` (the default)
 * veryfast (about twice as fast, a little larger for the same picture), `fast` the real-time mode (ultrafast, no look-ahead). VP9 and
 * AV1 know only `fast` and the rest.
 */
export type Speed = "quality" | "balanced" | "fast";

const PRESETS: Readonly<Record<Exclude<Speed, "fast">, string>> = { quality: "medium", balanced: "veryfast" };

export type VideoCodec = "vp9" | "vp8" | "av1" | "avc" | "hevc" | "prores";
export type VideoContainer = "webm" | "mp4" | "mov";

/** Mediabunny's quality presets by name; a name, not the object, travels to the workers. */
export const QUALITIES = { "very-low": QUALITY_VERY_LOW, low: QUALITY_LOW, medium: QUALITY_MEDIUM, high: QUALITY_HIGH, "very-high": QUALITY_VERY_HIGH } as const;
export type QualityName = keyof typeof QUALITIES;

export function outputFormat(container: VideoContainer): Mp4OutputFormat | MovOutputFormat | WebMOutputFormat {
  return container === "mp4" ? new Mp4OutputFormat() : container === "mov" ? new MovOutputFormat() : new WebMOutputFormat();
}

/** How the picture is encoded: shared by a whole render and by each of its segments. */
export interface VideoEncoding {
  readonly container: VideoContainer;
  readonly codec: VideoCodec;
  /** Bits per second; `quality`, when set, replaces it. */
  readonly bitrate: number;
  readonly quality?: QualityName | undefined;
  /** Seconds between keyframes. */
  readonly keyFrameInterval: number;
  /** Compression against speed; see `Speed`. */
  readonly speed?: Speed | undefined;
  /** The machine's hardware encoder, when it has one; decided once per render (`hardwareEncodes`), so every segment matches. */
  readonly hardware?: boolean | undefined;
}

export function videoSource(encoding: VideoEncoding): VideoSampleSource {
  return new VideoSampleSource({
    codec: encoding.codec,
    ...(encoding.quality ? { quality: QUALITIES[encoding.quality] } : { bitrate: encoding.bitrate }),
    keyFrameInterval: encoding.keyFrameInterval,
    hardwareAcceleration: encoding.hardware ? "prefer-hardware" : "prefer-software",
    // Read by the patched @mediabunny/server encoder (patches/), which has no preset option of its own.
    onEncoderConfig: (c) => { if (encoding.speed !== "fast") (c as { ffmpegPreset?: string }).ffmpegPreset = PRESETS[encoding.speed ?? "balanced"]; },
    ...(encoding.speed === "fast" ? { latencyMode: "realtime" as const } : {}),
  });
}

export interface SegmentOptions {
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  readonly interiors?: ReadonlyMap<string, ReactNode> | undefined;
  readonly fonts?: readonly OverlayFont[] | undefined;
  readonly overlays?: OverlayPlane | undefined;
  readonly onAssetError?: "throw" | "continue" | undefined;
  readonly encoding: VideoEncoding;
  /** Frames `first` to `last - 1` of the composition. */
  readonly first: number;
  readonly last: number;
}

export interface SegmentStages extends PipelineStages { encode: number }

export interface SegmentResult {
  /** A complete file in the render's container holding just these frames, the first at time 0. */
  readonly bytes: Uint8Array;
  readonly stages: SegmentStages;
  readonly warnings: readonly string[];
  readonly errors: readonly PlayerErrorEvent[];
}

const probes = new Map<string, Promise<boolean>>();

/**
 * Whether H.264 or HEVC can go through the machine's hardware encoder at this size: one black frame into a throwaway
 * file, once per process. A machine without one encodes in software either way; one whose encoder refuses the size or
 * fails to start gets software.
 */
export function hardwareEncodes(encoding: VideoEncoding, width: number, height: number): Promise<boolean> {
  if (encoding.codec !== "avc" && encoding.codec !== "hevc") return Promise.resolve(false);
  const key = `${encoding.container}:${encoding.codec}:${width}x${height}`;
  let probe = probes.get(key);
  if (!probe) {
    probe = (async () => {
      const output = new Output({ format: outputFormat(encoding.container), target: new BufferTarget() });
      const source = videoSource({ ...encoding, hardware: true });
      output.addVideoTrack(source, { frameRate: 30 });
      const sample = new VideoSample(new Uint8Array(width * height * 4), { format: "RGBA", codedWidth: width, codedHeight: height, timestamp: 0, duration: 1 / 30 });
      try {
        await output.start();
        await source.add(sample);
        await output.finalize();
        return true;
      } catch {
        await output.cancel().catch(() => undefined);
        return false;
      } finally {
        sample.close();
      }
    })();
    probes.set(key, probe);
  }
  return probe;
}

/** Renders and encodes a run of frames into a container of its own, in memory. */
export async function encodeSegment(options: SegmentOptions): Promise<SegmentResult> {
  initEnv();
  const { state, encoding } = options;
  const { fps, width, height } = state.composition;
  const warnings: string[] = [];
  captureWarnings((m) => warnings.push(m));
  const pipeline = new FramePipeline({ ...options, warn: (m) => warnings.push(m) });
  const target = new BufferTarget();
  const output = new Output({ format: outputFormat(encoding.container), target });
  const source = videoSource(encoding);
  output.addVideoTrack(source, { frameRate: fps });
  try {
    await output.start();
    const waited = await encodeFrames({ pipeline, source, fps, width, height, first: options.first, last: options.last });
    const at = performance.now();
    await output.finalize();
    const encode = waited + performance.now() - at;
    return { bytes: new Uint8Array(target.buffer as ArrayBuffer), stages: { ...pipeline.stages, encode }, warnings, errors: pipeline.errors };
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    pipeline.dispose();
    captureWarnings(null);
  }
}
