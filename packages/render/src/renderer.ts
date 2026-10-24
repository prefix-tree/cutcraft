import type { ResolvedState } from "@cutcut/kit";
import {
  AssetSources, Compositor, FRAME_EPS, ManualClock, MediabunnyInputs, captureWarnings, makeNestedResolver,
  mediabunnyFrameSourceFactory, type MediaResolver, type PlayerErrorEvent,
} from "@cutcut/player/engine";
import { FilePathTarget, Mp4OutputFormat, Output, VideoSample, VideoSampleSource, WebMOutputFormat } from "mediabunny";
import type { Canvas } from "skia-canvas";
import { createCanvas, initEnv } from "./env";
import { frameSourceHooks } from "./frame-source";

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
  readonly onProgress?: (progress: { readonly frame: number; readonly frames: number }) => void;
  readonly signal?: AbortSignal;
  /** What to do when an asset cannot be opened or decoded: stop (default) or draw the grey placeholder and go on. */
  readonly onAssetError?: "throw" | "continue";
}

export interface RenderResult {
  readonly frames: number;
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
  compositor.attach(canvas.getContext("2d") as never);

  const output = new Output({ format: container === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(), target: new FilePathTarget(options.out) });
  const source = new VideoSampleSource({
    codec,
    bitrate: options.bitrate ?? Math.round(width * height * fps * 0.1),
    keyFrameInterval: options.keyFrameInterval ?? 2,
    hardwareAcceleration: "prefer-software",
  });
  output.addVideoTrack(source, { frameRate: fps });

  const started = performance.now();
  try {
    await output.start();
    for (let n = first; n < last; n++) {
      if (options.signal?.aborted) throw new Error("render aborted");
      const t = n / fps;
      await compositor.step(t);
      if (errors.length > 0 && options.onAssetError !== "continue") {
        throw new Error(`cannot render: ${errors.map((e) => `${e.asset ?? e.id ?? "?"}: ${e.error.message}`).join("; ")}`);
      }
      const raw = await canvas.toBuffer("raw");
      const sample = new VideoSample(new Uint8Array(raw.buffer, raw.byteOffset, raw.length), { format: "RGBA", codedWidth: width, codedHeight: height, timestamp: (n - first) / fps, duration: 1 / fps });
      await source.add(sample);
      sample.close();
      options.onProgress?.({ frame: n - first + 1, frames: total });
    }
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    compositor.dispose();
    sources.dispose();
    inputs.dispose();
    captureWarnings(null);
  }
  return { frames: total, fps, width, height, wallMs: performance.now() - started, warnings, errors };
}
