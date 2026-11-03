import type { ResolvedState } from "@cutcraft/kit";
import {
  AssetSources, Compositor, ManualClock, MediabunnyInputs, backdropTracks, compositionBackground, coversCanvas, makeNestedResolver, mediabunnyFrameSourceFactory,
  paintBackground, type FrameIntercept, type MediaResolver, type PlayerErrorEvent,
} from "@cutcraft/player/engine";
import type { VideoSample } from "mediabunny";
import type { ReactNode } from "react";
import type { Canvas, CanvasRenderingContext2D } from "skia-canvas";
import { createCanvas, initEnv } from "./env";
import { DecodedFrame, frameSourceHooks, tagBt709 } from "./frame-source";
import { OverlayPlane, type OverlayFont } from "./overlays";

export interface PipelineOptions {
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  readonly interiors?: ReadonlyMap<string, ReactNode> | undefined;
  readonly fonts?: readonly OverlayFont[] | undefined;
  /** What to do when an asset cannot be opened or decoded: stop (default) or draw the grey placeholder and go on. */
  readonly onAssetError?: "throw" | "continue" | undefined;
  readonly warn: (message: string) => void;
  /** An overlay plane to share between pipelines (it keeps fonts and images); the caller disposes it. */
  readonly overlays?: OverlayPlane | undefined;
}

/** Milliseconds the pipeline spent per stage, summed over frames. */
export interface PipelineStages { composite: number; overlays: number; readback: number }

/**
 * One composition rendered frame by frame, in order: decode and composite the footage, draw the overlays,
 * read the pixels back. A pipeline owns its decoders and canvas; make a new one for a new range.
 */
export class FramePipeline {
  readonly errors: PlayerErrorEvent[] = [];
  readonly stages: PipelineStages = { composite: 0, overlays: 0, readback: 0 };
  private readonly inputs = new MediabunnyInputs();
  private readonly sources: AssetSources;
  private readonly compositor: Compositor;
  private readonly canvas: Canvas;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly overlays: OverlayPlane;
  private readonly ownsOverlays: boolean;
  private readonly footage: Canvas | null;

  constructor(private readonly options: PipelineOptions) {
    initEnv();
    const { state } = options;
    const { width, height } = state.composition;
    this.sources = new AssetSources({
      media: options.media,
      manifest: state.manifest,
      clock: new ManualClock(),
      onError: (e) => this.errors.push(e),
      frameSourceFactory: mediabunnyFrameSourceFactory(this.inputs, createCanvas, frameSourceHooks),
    });
    this.compositor = new Compositor(state, { sources: this.sources, createCanvas, resolveNested: makeNestedResolver(() => state) });
    this.canvas = createCanvas(width, height) as unknown as Canvas;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    // With overlays beneath the footage, the footage is composited on its own transparent canvas first.
    this.footage = backdropTracks(state).size ? createCanvas(width, height) as unknown as Canvas : null;
    this.compositor.attach((this.footage ? this.footage.getContext("2d") : this.ctx) as never);
    this.ownsOverlays = !options.overlays;
    this.overlays = options.overlays ?? new OverlayPlane({ state, media: options.media, warn: options.warn, ...(options.interiors ? { interiors: options.interiors } : {}), ...(options.fonts ? { fonts: options.fonts } : {}) });
  }

  /**
   * Frame `n` (time n / fps): its RGBA pixels, or, with `passThrough` and when the frame is one decoded picture shown
   * as it is (nothing over, under or applied to it), that picture as a sample the caller owns. Frames are asked for in
   * increasing order.
   */
  async frame(n: number): Promise<Uint8Array>;
  async frame(n: number, passThrough: boolean): Promise<Uint8Array | VideoSample>;
  async frame(n: number, passThrough = false): Promise<Uint8Array | VideoSample> {
    const { fps, width, height } = this.options.state.composition;
    const t = n / fps;
    let at = performance.now();
    let taken = null as VideoSample | null;
    const intercept: FrameIntercept = (plan, frames) => {
      const op = plan.ops.length === 1 ? plan.ops[0]! : null;
      if (op?.kind !== "video" || plan.backgroundBlur || plan.clear || !coversCanvas(op, width, height)) return false;
      const frame = frames.get(op.id);
      if (!(frame instanceof DecodedFrame) || this.overlays.hasOverlays(t)) return false;
      taken = frame.passThrough(width, height);
      return taken !== null;
    };
    await this.compositor.step(t, passThrough && !this.footage ? intercept : undefined);
    if (this.errors.length > 0 && this.options.onAssetError !== "continue") {
      taken?.close();
      throw new Error(`cannot render: ${this.errors.map((e) => `${e.asset ?? e.id ?? "?"}: ${e.error.message}`).join("; ")}`);
    }
    this.stages.composite += performance.now() - at;
    if (taken) return tagBt709(taken);
    at = performance.now();
    if (this.footage) {
      // Overlays beneath the footage: the background, those overlays, then the footage over them.
      paintBackground(this.ctx as never, compositionBackground(this.options.state), width, height);
      await this.overlays.draw(this.ctx, t, "backdrop");
      this.ctx.drawImage(this.footage, 0, 0);
      await this.overlays.draw(this.ctx, t, "front");
    } else {
      await this.overlays.draw(this.ctx, t);
    }
    this.stages.overlays += performance.now() - at;
    at = performance.now();
    const data = this.ctx.getImageData(0, 0, width, height).data;
    this.stages.readback += performance.now() - at;
    return new Uint8Array(data.buffer, data.byteOffset, data.length);
  }

  /** Frame `n` as a PNG or JPEG file's bytes. */
  async image(n: number, type: "png" | "jpg"): Promise<Buffer> {
    await this.frame(n);
    return this.canvas.toBuffer(type);
  }

  dispose(): void {
    if (this.ownsOverlays) this.overlays.dispose();
    this.compositor.dispose();
    this.sources.dispose();
    this.inputs.dispose();
  }
}
