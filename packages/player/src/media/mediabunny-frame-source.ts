import type { AssetEntry } from "@cutcraft/kit";
import { CanvasSink, VideoSampleSink, type Input, type InputVideoTrack, type VideoSample } from "mediabunny";
import { PICK_EPS } from "../constants";
import type {
  CreateCanvas,
  Ctx2D,
  Frame,
  FrameSource,
  FrameSourceFactory,
  FrameSourceInfo,
  MediaHandle,
} from "../types";
import { copyFrame, ImageFrameSource } from "./frame-source";
import type { MediabunnyInputs } from "./mediabunny-input";

type Crop = { x: number; y: number; w: number; h: number };

/** A decoded `VideoSample`: GPU-backed, drawn straight to the context, closed when consumed. */
export class SampleFrame implements Frame {
  readonly timestamp: number;
  readonly duration: number;
  readonly width: number;
  readonly height: number;

  constructor(
    private readonly sample: VideoSample,
    private readonly createCanvas: CreateCanvas,
  ) {
    this.timestamp = sample.timestamp;
    this.duration = sample.duration;
    this.width = sample.displayWidth;
    this.height = sample.displayHeight;
  }

  draw(ctx: Ctx2D, dx: number, dy: number, dw: number, dh: number, crop?: Crop): void {
    if (crop) this.sample.draw(ctx, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
    else this.sample.draw(ctx, dx, dy, dw, dh);
  }

  retain(): Frame {
    return copyFrame(this, this.createCanvas);
  }
  close(): void {
    this.sample.close();
  }
}

/** How a host customises decoding: the Node renderer converts samples itself and decodes in software. */
export interface FrameSourceHooks {
  /** Turns a decoded sample into a frame; may convert eagerly (the sample is closed by the frame). */
  readonly makeFrame?: (sample: VideoSample) => Promise<Frame> | Frame;
  /** Loads a still image asset. */
  readonly loadImage?: (handle: MediaHandle) => Promise<ImageBitmap | HTMLImageElement>;
  readonly hardwareAcceleration?: "no-preference" | "prefer-hardware" | "prefer-software";
}

/** Frames of one video asset through a shared `VideoSampleSink`. */
export class MediabunnyFrameSource implements FrameSource {
  private input: Input | null = null;
  private track: InputVideoTrack | null = null;
  private sink: VideoSampleSink | null = null;
  private stillSink: CanvasSink | null = null;

  constructor(
    private readonly assetId: string,
    private readonly handle: MediaHandle,
    private readonly inputs: MediabunnyInputs,
    private readonly createCanvas: CreateCanvas,
    private readonly hooks: FrameSourceHooks = {},
  ) {}

  private wrap(sample: VideoSample): Promise<Frame> | Frame {
    return this.hooks.makeFrame ? this.hooks.makeFrame(sample) : new SampleFrame(sample, this.createCanvas);
  }

  async open(): Promise<FrameSourceInfo> {
    this.input = this.inputs.acquire(this.assetId, this.handle);
    const track = await this.input.getPrimaryVideoTrack();
    if (!track) return { width: 0, height: 0, duration: 0, decodable: false };
    const decodable = await track.canDecode();
    const [width, height, duration] = await Promise.all([
      track.getDisplayWidth(),
      track.getDisplayHeight(),
      track.computeDuration(),
    ]);
    this.track = track;
    this.sink = new VideoSampleSink(track, {
      hardwareAcceleration: this.hooks.hardwareAcceleration ?? "no-preference",
      optimizeForLatency: true,
    });
    return { width, height, duration, decodable };
  }

  async frameAt(sourceTime: number): Promise<Frame | null> {
    if (!this.sink) return null;
    const sample = await this.sink.getSample(Math.max(0, sourceTime) + PICK_EPS);
    return sample ? this.wrap(sample) : null;
  }

  async *stream(from: number, to: number): AsyncGenerator<Frame, void, unknown> {
    if (!this.sink) return;
    for await (const sample of this.sink.samples(Math.max(0, from), to)) yield await this.wrap(sample);
  }

  /** A canvas copy of the frame at `sourceTime`, for freeze frames; pooled canvases are copied right away. */
  async still(sourceTime: number): Promise<Frame | null> {
    if (!this.track) return null;
    this.stillSink ??= new CanvasSink(this.track, { poolSize: 2 });
    const wrapped = await this.stillSink.getCanvas(Math.max(0, sourceTime));
    if (!wrapped) return null;
    const canvas = this.createCanvas(wrapped.canvas.width, wrapped.canvas.height);
    (canvas.getContext("2d") as Ctx2D | null)?.drawImage(wrapped.canvas, 0, 0);
    return copyFrame(
      {
        timestamp: wrapped.timestamp,
        duration: wrapped.duration,
        width: canvas.width,
        height: canvas.height,
        draw: (ctx, dx, dy, dw, dh) => ctx.drawImage(canvas, dx, dy, dw, dh),
        retain: () => {
          throw new Error("unreachable");
        },
        close: () => undefined,
      },
      this.createCanvas,
    );
  }

  close(): void {
    this.sink = null;
    this.stillSink = null;
    this.track = null;
    if (this.input) this.inputs.release(this.assetId);
    this.input = null;
  }
}

async function loadImage(handle: MediaHandle): Promise<ImageBitmap> {
  if (handle.kind === "path") throw new Error("a file path needs a host image loader (hooks.loadImage)");
  const blob = handle.kind === "blob" ? handle.blob : await (await fetch(handle.url)).blob();
  return createImageBitmap(blob);
}

export function mediabunnyFrameSourceFactory(
  inputs: MediabunnyInputs,
  createCanvas: CreateCanvas,
  hooks: FrameSourceHooks = {},
): FrameSourceFactory {
  return (assetId: string, handle: MediaHandle, kind: AssetEntry["kind"]) =>
    kind === "image"
      ? new ImageFrameSource(() => (hooks.loadImage ?? loadImage)(handle))
      : new MediabunnyFrameSource(assetId, handle, inputs, createCanvas, hooks);
}
