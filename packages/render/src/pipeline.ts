import type { ResolvedState } from "@cutcut/kit";
import {
  AssetSources, Compositor, ManualClock, MediabunnyInputs, makeNestedResolver, mediabunnyFrameSourceFactory,
  type MediaResolver, type PlayerErrorEvent,
} from "@cutcut/player/engine";
import type { ReactNode } from "react";
import type { Canvas, CanvasRenderingContext2D } from "skia-canvas";
import { createCanvas, initEnv } from "./env";
import { frameSourceHooks } from "./frame-source";
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
    this.compositor.attach(this.ctx as never);
    this.ownsOverlays = !options.overlays;
    this.overlays = options.overlays ?? new OverlayPlane({ state, media: options.media, warn: options.warn, ...(options.interiors ? { interiors: options.interiors } : {}), ...(options.fonts ? { fonts: options.fonts } : {}) });
  }

  /** The RGBA pixels of frame `n` (time n / fps). Frames are asked for in increasing order. */
  async frame(n: number): Promise<Uint8Array> {
    const { fps, width, height } = this.options.state.composition;
    const t = n / fps;
    let at = performance.now();
    await this.compositor.step(t);
    if (this.errors.length > 0 && this.options.onAssetError !== "continue") {
      throw new Error(`cannot render: ${this.errors.map((e) => `${e.asset ?? e.id ?? "?"}: ${e.error.message}`).join("; ")}`);
    }
    this.stages.composite += performance.now() - at;
    at = performance.now();
    await this.overlays.draw(this.ctx, t);
    this.stages.overlays += performance.now() - at;
    at = performance.now();
    const data = this.ctx.getImageData(0, 0, width, height).data;
    this.stages.readback += performance.now() - at;
    return new Uint8Array(data.buffer, data.byteOffset, data.length);
  }

  dispose(): void {
    if (this.ownsOverlays) this.overlays.dispose();
    this.compositor.dispose();
    this.sources.dispose();
    this.inputs.dispose();
  }
}
