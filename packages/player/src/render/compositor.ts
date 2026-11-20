import type { ResolvedState } from "@uberscene/sdk/resolver";

import type { AssetSources } from "../media/asset-sources";
import { DecodeError } from "../media/clip-decoder";
import { DecoderPool } from "../media/decoder-pool";
import { type ShaderTextures, textureRefs } from "../media/shader-textures";
import { buildFramePlan, type FramePlan, type ResolveNested } from "../model/frame-plan";
import { frameIndex } from "../model/time";
import type { AnyCanvas, CreateCanvas, Ctx2D, Frame, PlayerErrorEvent } from "../types";
import { CanvasPainter } from "./painter";

export interface CompositorDeps {
  readonly sources: AssetSources;
  readonly createCanvas: CreateCanvas;
  /** The textures effect params name (a LUT, an image); without it such effects draw nothing. */
  readonly textures?: ShaderTextures | undefined;
  readonly resolveNested?: ResolveNested | undefined;
  /** Called after a frame was painted with a new frame index. */
  readonly onFrame?: ((time: number, frame: number) => void) | undefined;
  /** Called once for each error that stopped a frame from being drawn (a frame that failed to decode). */
  readonly onError?: ((e: PlayerErrorEvent) => void) | undefined;
}

export interface TickOptions {
  /** Fetch missing frames before painting (seek, export). */
  readonly wait: boolean;
  /** With `wait`: no deadline. An export waits for every frame instead of drawing a stale one. */
  readonly exact?: boolean;
}

/** Errors already passed to `onError`: a nested compositor's failure fails its parent's tick too, and is told once. */
const reported = new WeakSet<Error>();

interface Waiter {
  readonly exact: boolean;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
}

/**
 * One tick: plan the frame, sync decoders, gather frames, paint. A tick that
 * arrives while another is in flight is coalesced into one re-run; a tick on
 * the same frame index as the last paint only keeps decoders prefetching.
 */
export class Compositor {
  readonly pool: DecoderPool;
  private painter: CanvasPainter;
  private ctx: Ctx2D | null = null;
  private state: ResolvedState;
  private inFlight: Promise<void> | null = null;
  private pending: { t: number; opts: TickOptions; waiters: Waiter[] } | null = null;
  private lastFrame = -1;
  private lastPlan: FramePlan | null = null;
  private readonly nested = new Map<string, { compositor: Compositor; canvas: AnyCanvas }>();
  private disposed = false;

  constructor(
    state: ResolvedState,
    private readonly deps: CompositorDeps,
  ) {
    this.state = state;
    this.pool = new DecoderPool(deps.sources);
    this.painter = new CanvasPainter(state.composition.width, state.composition.height, deps.createCanvas);
  }

  attach(ctx: Ctx2D | null): void {
    this.ctx = ctx;
    this.lastFrame = -1;
  }

  get renderedFrame(): number {
    return this.lastFrame;
  }
  get attachedContext(): Ctx2D | null {
    return this.ctx;
  }
  get lastPlanBuilt(): FramePlan | null {
    return this.lastPlan;
  }
  get currentState(): ResolvedState {
    return this.state;
  }

  setState(state: ResolvedState): void {
    this.state = state;
    if (state.composition.width !== this.painter.width || state.composition.height !== this.painter.height) {
      this.painter = new CanvasPainter(state.composition.width, state.composition.height, this.deps.createCanvas);
    }
    this.lastFrame = -1;
  }

  setRate(rate: number): void {
    this.pool.setRate(rate);
    for (const n of this.nested.values()) n.compositor.setRate(rate);
  }

  plan(t: number): FramePlan {
    return buildFramePlan(this.state, t, this.deps.resolveNested);
  }

  /** Jump every decoder (nested ones too) to `t`. */
  seek(t: number): Promise<void> {
    const plan = this.plan(t);
    const nested = plan.ops
      .filter((op) => op.nested)
      .map((op) => this.nested.get(op.id)?.compositor.seek(op.nested!.time) ?? Promise.resolve());
    return Promise.all([this.pool.seekAll(t), ...nested]).then(() => undefined);
  }

  /**
   * The next frame of a sequential render (export): decoders keep streaming
   * from where they are instead of being re-primed, and every frame is waited
   * for. Paint order and output are the same as `seek` then `tick`, at a
   * fraction of the decode work.
   */
  step(t: number): Promise<void> {
    return this.tick(t, { wait: true, exact: true });
  }

  /**
   * Paint composition time `t`. A frame that fails is reported through `onError` and the tick still resolves, so
   * playback carries on; with `exact` (the export's `step`) it rejects with that error instead of drawing a stale
   * picture.
   */
  tick(t: number, opts: TickOptions): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const exact = Boolean(opts.exact);
    if (this.inFlight) {
      // Coalesce: the newest request replaces the pending one; every caller settles when it has run, and only a
      // caller that asked for an exact frame is failed by an error.
      const done = new Promise<void>((resolve, reject) => {
        const waiter = { exact, resolve, reject };
        if (this.pending) {
          this.pending.t = t;
          this.pending.opts = {
            wait: opts.wait || this.pending.opts.wait,
            exact: exact || Boolean(this.pending.opts.exact),
          };
          this.pending.waiters.push(waiter);
        } else this.pending = { t, opts, waiters: [waiter] };
      });
      return done;
    }
    const failure = this.run(t, opts).then(
      () => null,
      (error: unknown) => this.report(error, exact),
    );
    this.inFlight = failure.then(() => {
      this.inFlight = null;
      const next = this.pending;
      this.pending = null;
      if (!next) return;
      void this.tick(next.t, next.opts).then(
        () => {
          for (const w of next.waiters) w.resolve();
        },
        (error: Error) => {
          for (const w of next.waiters) {
            if (w.exact) w.reject(error);
            else w.resolve();
          }
        },
      );
    });
    return failure.then((error) => {
      if (error && exact) throw error;
    });
  }

  dispose(): void {
    this.disposed = true;
    this.pool.dispose();
    for (const n of this.nested.values()) n.compositor.dispose();
    this.nested.clear();
  }

  private async run(t: number, opts: TickOptions): Promise<void> {
    const frame = frameIndex(t, this.state.composition.rate);
    this.pool.sync(this.state, t);
    if (frame === this.lastFrame && !opts.wait) return;
    const plan = this.plan(t);
    this.lastPlan = plan;
    this.syncNested(plan);
    if (opts.wait) await this.pool.settle();
    const frames = new Map<string, Frame | null>();
    const nestedCanvases = new Map<string, AnyCanvas>();
    await Promise.all(
      plan.ops.map(async (op) => {
        if (op.nested) {
          const n = this.nested.get(op.id);
          if (!n) return;
          await n.compositor.tick(op.nested.time, { wait: opts.wait, exact: Boolean(opts.exact) });
          nestedCanvases.set(op.id, n.canvas);
          return;
        }
        if (op.kind !== "video" && op.kind !== "image" && op.kind !== "error") return;
        const d = this.pool.decoderFor(op.id);
        frames.set(
          op.id,
          d
            ? await d.frameFor(t, opts.wait, opts.exact).catch((error: unknown) => {
                throw DecodeError.of(d, error);
              })
            : null,
        );
      }),
    );
    const refs = plan.ops.flatMap((op) => textureRefs(op.shaders));
    const textures = this.deps.textures;
    if (refs.length > 0 && textures) await textures.load(this.state.manifest, refs);
    if (this.disposed) return;
    if (this.ctx)
      this.painter.paint(this.ctx, plan, {
        frames,
        nested: nestedCanvases,
        ...(textures ? { textures } : {}),
      });
    for (const op of plan.ops) this.pool.decoderFor(op.id)?.advance(t);
    this.lastFrame = frame;
    this.deps.onFrame?.(t, frame);
  }

  /** Tell `onError` about a failed frame, once per error, and return it. */
  private report(error: unknown, fatal: boolean): Error {
    const e = error instanceof Error ? error : new Error(String(error));
    if (!reported.has(e)) {
      reported.add(e);
      const where = e instanceof DecodeError ? { id: e.id, ...(e.asset !== undefined ? { asset: e.asset } : {}) } : {};
      this.deps.onError?.({ ...where, error: e, fatal });
    }
    return e;
  }

  private syncNested(plan: FramePlan): void {
    const want = new Set<string>();
    for (const op of plan.ops) {
      if (!op.nested) continue;
      want.add(op.id);
      const existing = this.nested.get(op.id);
      if (existing && existing.compositor.currentState === op.nested.state) continue;
      existing?.compositor.dispose();
      const inner = op.nested.state;
      const canvas = this.deps.createCanvas(inner.composition.width, inner.composition.height);
      const compositor = new Compositor(inner, { ...this.deps, onFrame: undefined });
      compositor.attach(canvas.getContext("2d") as Ctx2D | null);
      this.nested.set(op.id, { compositor, canvas });
    }
    for (const [id, n] of this.nested) {
      if (want.has(id)) continue;
      n.compositor.dispose();
      this.nested.delete(id);
    }
  }
}
