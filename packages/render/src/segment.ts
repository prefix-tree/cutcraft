import type { ResolvedState } from "@cutcut/kit";
import { captureWarnings, type MediaResolver, type PlayerErrorEvent } from "@cutcut/player/engine";
import { BufferTarget, Mp4OutputFormat, Output, VideoSampleSource, WebMOutputFormat } from "mediabunny";
import type { ReactNode } from "react";
import { encodeFrames } from "./encode";
import { initEnv } from "./env";
import type { OverlayFont, OverlayPlane } from "./overlays";
import { FramePipeline, type PipelineStages } from "./pipeline";

export type VideoCodec = "vp9" | "vp8" | "av1" | "avc" | "hevc";

/** How the picture is encoded: shared by a whole render and by each of its segments. */
export interface VideoEncoding {
  readonly container: "webm" | "mp4";
  readonly codec: VideoCodec;
  /** Bits per second. */
  readonly bitrate: number;
  /** Seconds between keyframes. */
  readonly keyFrameInterval: number;
  /** `fast` trades compression for speed (the encoder's real-time mode). */
  readonly speed?: "quality" | "fast" | undefined;
}

export function videoSource(encoding: VideoEncoding): VideoSampleSource {
  return new VideoSampleSource({
    codec: encoding.codec,
    bitrate: encoding.bitrate,
    keyFrameInterval: encoding.keyFrameInterval,
    hardwareAcceleration: "prefer-software",
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
  /** A complete WebM or MP4 file holding just these frames, the first at time 0. */
  readonly bytes: Uint8Array;
  readonly stages: SegmentStages;
  readonly warnings: readonly string[];
  readonly errors: readonly PlayerErrorEvent[];
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
  const output = new Output({ format: encoding.container === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(), target });
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
