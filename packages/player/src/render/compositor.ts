import type { ResolvedState } from "@cutcraft/kit";

import type { AssetSources } from "../media/asset-sources";
import { DecoderPool } from "../media/decoder-pool";
import { buildFramePlan, type FramePlan, type ResolveNested } from "../model/frame-plan";
import { frameIndex } from "../model/time";
import type { AnyCanvas, CreateCanvas, Ctx2D, Frame } from "../types";
import { CanvasPainter } from "./painter";

export interface CompositorDeps {
  readonly sources: AssetSources;
  readonly createCanvas: CreateCanvas;
  readonly resolveNested?: ResolveNested | undefined;
  /** Called after a frame was painted with a new frame index. */
  readonly onFrame?: ((time: number, frame: number) => void) | undefined;
}

export interface TickOptions {
  /** Fetch missing frames before painting (seek, export). */
  readonly wait: boolean;
  /** With `wait`: no deadline. An export waits for every frame instead of drawing a stale one. */
  readonly exact?: boolean;
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
  private pending: { t: number; opts: TickOptions; done: Promise<void>; resolve: () => void } | null = null;
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

  tick(t: number, opts: TickOptions): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.inFlight) {
      // Coalesce: the newest request replaces the pending one; both callers resolve when it has run.
      if (this.pending) {
        this.pending.t = t;
        this.pending.opts = {
          wait: opts.wait || this.pending.opts.wait,
          exact: Boolean(opts.exact || this.pending.opts.exact),
        };
        return this.pending.done;
      }
      let resolve = (): void => undefined;
      const done = new Promise<void>((r) => {
        resolve = r;
      });
      this.pending = { t, opts, done, resolve };
      return done;
    }
    const run = this.run(t, opts)
      .catch(() => undefined)
      .then(() => {
        this.inFlight = null;
        const next = this.pending;
        this.pending = null;
        if (next) void this.tick(next.t, next.opts).then(next.resolve, next.resolve);
      });
    this.inFlight = run;
    return run;
  }

  dispose(): void {
    this.disposed = true;
    this.pool.dispose();
    for (const n of this.nested.values()) n.compositor.dispose();
    this.nested.clear();
  }

  private async run(t: number, opts: TickOptions): Promise<void> {
    const frame = frameIndex(t, this.state.composition.fps);
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
        frames.set(op.id, d ? await d.frameFor(t, opts.wait, opts.exact) : null);
      }),
    );
    if (this.disposed) return;
    if (this.ctx) this.painter.paint(this.ctx, plan, { frames, nested: nestedCanvases });
    for (const op of plan.ops) this.pool.decoderFor(op.id)?.advance(t);
    this.lastFrame = frame;
    this.deps.onFrame?.(t, frame);
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
