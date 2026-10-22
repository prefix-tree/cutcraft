import type { Placement } from "@cut/kit";
import { FRAME_WAIT_MS, QUEUE_MAX, QUEUE_TARGET, REVERSE_WINDOW_FRAMES, REVERSE_WINDOW_S, SEEK_MODE_SPEED } from "../constants";
import { placementSourceTime } from "../model/time";
import type { Frame, FrameSource } from "../types";

export type DecodeMode = "forward" | "reverse" | "seek";

/** How far the play head may run past the newest queued frame before the stream is restarted from the head. */
const BEHIND_RESEEK_S = 1.0;

/**
 * Decoded frames for one placement. Forward playback streams from the source
 * into a short queue; reverse pre-decodes windows behind the cursor; seek
 * mode (high speeds, scrubbing) fetches single frames. Freezes hold one
 * retained frame. The decoder never blocks a playing tick: when the frame for
 * `t` is not ready it returns the last frame it delivered.
 */
export class ClipDecoder {
  readonly id: string;
  readonly sourceKey: string;
  private queue: Frame[] = [];
  private current: Frame | null = null;
  private generation = 0;
  private gen: AsyncGenerator<Frame, void, unknown> | null = null;
  private pumping: Promise<void> | null = null;
  private streamEnd = 0;
  private seekPending: Promise<void> | null = null;
  private reverseLow = Number.POSITIVE_INFINITY;
  private reverseLoading: Promise<void> | null = null;
  private readonly freezes = new Map<string, Promise<Frame | null>>();
  private disposed = false;
  private primed: Promise<void> | null = null;

  constructor(
    private readonly source: FrameSource,
    readonly placement: Placement,
    readonly children: readonly Placement[],
    private readonly effectiveSpeed: () => number,
  ) {
    this.id = placement.id;
    this.sourceKey = sourceKeyOf(placement);
  }

  static sourceKey(p: Placement): string { return sourceKeyOf(p); }

  get mode(): DecodeMode {
    if (this.placement.props.reverse === true) return "reverse";
    return Math.abs(this.effectiveSpeed()) > SEEK_MODE_SPEED ? "seek" : "forward";
  }

  get queued(): number { return this.queue.length; }
  get ready(): Promise<void> { return this.primed ?? Promise.resolve(); }

  sourceTime(t: number): number {
    return placementSourceTime(this.placement, this.children, t);
  }

  /** Jump to composition time `t`: cancel streaming, fetch the frame, restart from there. */
  prime(t: number): Promise<void> {
    this.cancelStream();
    const st = this.sourceTime(t);
    const run = async (): Promise<void> => {
      const gen = this.generation;
      const frame = await this.source.frameAt(st);
      if (gen !== this.generation || this.disposed) { frame?.close(); return; }
      this.setCurrent(frame);
      if (this.mode === "forward") this.startStream(st);
      else if (this.mode === "reverse") { this.reverseLow = st; }
    };
    this.primed = run();
    return this.primed;
  }

  /** The frame to draw at composition time `t`. With `wait`, fetch it if it is not queued. */
  async frameFor(t: number, wait: boolean): Promise<Frame | null> {
    if (this.disposed) return null;
    const freeze = this.activeFreeze(t);
    if (freeze) return this.freezeFrame(freeze, wait);
    const st = this.sourceTime(t);
    if (this.mode === "seek") return this.seekFrame(st, wait);
    if (this.mode === "reverse") return this.reverseFrame(st, wait);
    return this.forwardFrame(st, wait);
  }

  /** Close consumed frames; called after a frame was painted. */
  advance(t: number): void {
    if (this.mode !== "forward") return;
    const st = this.sourceTime(t);
    while (this.queue.length > 0 && this.queue[0]!.timestamp + this.queue[0]!.duration <= st && this.queue.length > 1 && this.queue[1]!.timestamp <= st) {
      this.queue.shift()!.close();
    }
    this.pump();
  }

  dispose(): void {
    this.disposed = true;
    this.cancelStream();
    this.setCurrent(null);
    for (const p of this.freezes.values()) void p.then((f) => f?.close());
    this.freezes.clear();
  }

  private async forwardFrame(st: number, wait: boolean): Promise<Frame | null> {
    const newest = this.queue[this.queue.length - 1] ?? this.current;
    const behind = newest !== null && st - (newest.timestamp + newest.duration) > BEHIND_RESEEK_S;
    const before = this.current !== null && st < this.current.timestamp && !this.queue.some((f) => f.timestamp <= st);
    if (this.gen === null && this.queue.length === 0 && this.current === null) {
      if (wait) { await this.primeAtSource(st); return this.current; }
      void this.primeAtSource(st);
      return null;
    }
    if (behind || before) {
      if (wait) { await this.primeAtSource(st); return this.current; }
      void this.primeAtSource(st);
      return this.current;
    }
    if (!wait) {
      const picked = this.forwardPick(st);
      this.pump();
      return picked ?? this.current;
    }
    const deadline = Date.now() + FRAME_WAIT_MS;
    for (;;) {
      const picked = this.forwardPick(st);
      const next = this.queue[0];
      const settled = (next !== undefined && next.timestamp > st) || this.gen === null || (picked !== null && picked.timestamp + picked.duration > st);
      if (settled || Date.now() >= deadline || this.disposed) { this.pump(); return picked ?? this.current; }
      await this.pumpOnce();
    }
  }

  /** The newest queued frame at or before `st` becomes current; older ones are consumed. */
  private forwardPick(st: number): Frame | null {
    let best: Frame | null = null;
    let index = -1;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i]!.timestamp <= st) { best = this.queue[i]!; index = i; } else break;
    }
    if (!best) return null;
    for (let i = 0; i < index; i++) this.queue[i]!.close();
    this.queue.splice(0, index + 1);
    this.setCurrent(best);
    return best;
  }

  private primeAtSource(st: number): Promise<void> {
    this.cancelStream();
    const gen = this.generation;
    this.primed = this.source.frameAt(st).then((frame) => {
      if (gen !== this.generation || this.disposed) { frame?.close(); return; }
      this.setCurrent(frame);
      this.startStream(st);
    });
    return this.primed;
  }

  private startStream(from: number): void {
    const src = this.placement.source;
    this.streamEnd = src ? src.out : Number.POSITIVE_INFINITY;
    if (from >= this.streamEnd) return;
    this.gen = this.source.stream(from, this.streamEnd);
    this.pump();
  }

  private pump(): void {
    if (this.pumping || this.gen === null || this.queue.length >= QUEUE_TARGET || this.disposed) return;
    void this.pumpOnce();
  }

  /** Pull frames until the queue is at target; a caller that finds a pump running awaits that one. */
  private pumpOnce(): Promise<void> {
    if (this.pumping) return this.pumping;
    if (this.gen === null) return Promise.resolve();
    const gen = this.gen, generation = this.generation;
    const run = async (): Promise<void> => {
      try {
        while (this.queue.length < QUEUE_TARGET && this.gen === gen) {
          const next = await gen.next();
          if (generation !== this.generation || this.disposed) { if (!next.done) next.value.close(); return; }
          if (next.done) { this.gen = null; return; }
          const frame = next.value;
          const last = this.queue[this.queue.length - 1];
          if (last && frame.timestamp <= last.timestamp) { frame.close(); continue; }
          this.queue.push(frame);
          while (this.queue.length > QUEUE_MAX) this.queue.shift()!.close();
        }
      } finally {
        this.pumping = null;
      }
    };
    this.pumping = run();
    return this.pumping;
  }

  private seekFrame(st: number, wait: boolean): Promise<Frame | null> {
    if (this.current && this.current.timestamp <= st && st < this.current.timestamp + this.current.duration) return Promise.resolve(this.current);
    if (!this.seekPending) {
      const gen = this.generation;
      this.seekPending = this.source.frameAt(st).then((frame) => {
        this.seekPending = null;
        if (gen !== this.generation || this.disposed) { frame?.close(); return; }
        this.setCurrent(frame);
      });
    }
    return wait ? this.seekPending.then(() => this.current) : Promise.resolve(this.current);
  }

  private async reverseFrame(st: number, wait: boolean): Promise<Frame | null> {
    const pick = (): Frame | null => {
      let best: Frame | null = null;
      let index = -1;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i]!.timestamp <= st) { best = this.queue[i]!; index = i; }
      }
      if (!best) return null;
      for (let i = index + 1; i < this.queue.length; i++) {
        const f = this.queue[i]!;
        if (f === this.current) this.current = null;
        f.close();
      }
      this.queue.length = index + 1;
      this.setCurrent(best);
      return best;
    };
    const have = pick();
    const needEarlier = this.queue.length === 0 || this.queue[0]!.timestamp > st - 1e-6 || st < this.reverseLow;
    const src = this.placement.source;
    const low = Math.min(this.reverseLow, this.queue[0]?.timestamp ?? Number.POSITIVE_INFINITY);
    if (needEarlier && src && low > src.in && !this.reverseLoading) {
      this.reverseLoading = this.loadReverseWindow(Math.min(low, st + 1e-6), src.in);
    }
    if (have && (!needEarlier || !wait)) return have;
    if (wait && this.reverseLoading) { await this.reverseLoading; return pick() ?? this.current; }
    return have ?? this.current;
  }

  private async loadReverseWindow(to: number, floor: number): Promise<void> {
    const gen = this.generation;
    const from = Math.max(floor, to - REVERSE_WINDOW_S);
    const frames: Frame[] = [];
    try {
      for await (const f of this.source.stream(from, to)) {
        if (gen !== this.generation || this.disposed) { f.close(); return; }
        if (f.timestamp >= to) { f.close(); break; }
        frames.push(f);
        if (frames.length > REVERSE_WINDOW_FRAMES) frames.shift()!.close();
      }
      if (gen !== this.generation || this.disposed) { frames.forEach((f) => f.close()); return; }
      this.queue = [...frames, ...this.queue];
      this.reverseLow = from;
    } finally {
      this.reverseLoading = null;
    }
  }

  private activeFreeze(t: number): Placement | null {
    const rel = t - this.placement.start;
    for (const c of this.children) {
      if (c.kind !== "freeze") continue;
      const fs = Number(c.props.start ?? 0), fd = Number(c.props.duration ?? 0);
      if (rel >= fs && rel < fs + fd) return c;
    }
    return null;
  }

  private freezeFrame(freeze: Placement, wait: boolean): Promise<Frame | null> {
    let p = this.freezes.get(freeze.id);
    if (!p) {
      p = this.source.frameAt(Number(freeze.props.at ?? 0)).then((f) => {
        if (!f) return null;
        const held = f.retain();
        if (held !== f) f.close();
        return held;
      });
      this.freezes.set(freeze.id, p);
    }
    return wait ? p : Promise.race([p, Promise.resolve(this.current)]);
  }

  private setCurrent(frame: Frame | null): void {
    if (this.current && this.current !== frame && !this.queue.includes(this.current)) this.current.close();
    this.current = frame;
  }

  private cancelStream(): void {
    this.generation++;
    const gen = this.gen;
    this.gen = null;
    if (gen) void gen.return(undefined).catch(() => undefined);
    for (const f of this.queue) if (f !== this.current) f.close();
    this.queue = [];
    this.reverseLow = Number.POSITIVE_INFINITY;
  }
}

function sourceKeyOf(p: Placement): string {
  const s = p.source;
  return s ? `${s.asset}|${s.in}|${s.out}|${s.speed}|${p.props.reverse === true ? "r" : "f"}` : p.id;
}
