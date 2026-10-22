import type { AudioOutput, AudioSource, AudioSourceInfo, Ctx2D, Frame, FrameSource, FrameSourceInfo, MediaResolver, ScheduledSource } from "@cut/player";

export class FakeFrame implements Frame {
  closed = false;
  constructor(readonly source: FakeFrameSource, readonly timestamp: number, readonly duration: number, readonly retained = false) {
    source.live.add(this);
  }
  get width(): number { return this.source.width; }
  get height(): number { return this.source.height; }
  draw(ctx: Ctx2D, dx: number, dy: number, dw: number, dh: number): void {
    if (this.closed) throw new Error(`drawing a closed frame (${this.source.id}@${this.timestamp})`);
    ctx.drawImage({ fake: this.source.id, timestamp: this.timestamp } as unknown as CanvasImageSource, dx, dy, dw, dh);
  }
  retain(): Frame {
    this.source.retains++;
    return new FakeFrame(this.source, this.timestamp, this.duration, true);
  }
  close(): void {
    if (this.closed) throw new Error(`double close (${this.source.id}@${this.timestamp})`);
    this.closed = true;
    this.source.live.delete(this);
    this.source.closedCount++;
  }
}

/** A video source of `fps` frames; streams can be throttled with `slow` and released one frame at a time. */
export class FakeFrameSource implements FrameSource {
  fps = 30;
  width = 640;
  height = 360;
  decodable = true;
  opened = 0;
  closed = false;
  streamsStarted = 0;
  streamsAborted = 0;
  frameAtCalls: number[] = [];
  closedCount = 0;
  retains = 0;
  slow = false;
  readonly live = new Set<FakeFrame>();
  private credits = 0;
  private waiters: (() => void)[] = [];

  constructor(readonly id: string, readonly duration = 10) {}

  open(): Promise<FrameSourceInfo> {
    this.opened++;
    return Promise.resolve({ width: this.width, height: this.height, duration: this.duration, fps: this.fps, decodable: this.decodable });
  }

  frameAt(t: number): Promise<Frame | null> {
    this.frameAtCalls.push(t);
    if (t < 0) return Promise.resolve(null);
    return Promise.resolve(this.make(Math.floor(t * this.fps + 1e-6)));
  }

  async *stream(from: number, to: number): AsyncGenerator<Frame, void, unknown> {
    this.streamsStarted++;
    let i = Math.floor(from * this.fps + 1e-6);
    try {
      while (i / this.fps < to && i / this.fps < this.duration) {
        if (this.slow) {
          if (this.credits > 0) this.credits--;
          else await new Promise<void>((resolve) => this.waiters.push(resolve));
        }
        yield this.make(i);
        i++;
      }
    } finally {
      if (i / this.fps < to && i / this.fps < this.duration) this.streamsAborted++;
    }
  }

  /** Let one throttled frame through. */
  release(n = 1): void {
    this.credits += n;
    while (this.credits > 0 && this.waiters.length > 0) {
      this.credits--;
      this.waiters.shift()!();
    }
  }

  close(): void { this.closed = true; }

  private make(i: number): FakeFrame {
    return new FakeFrame(this, i / this.fps, 1 / this.fps);
  }
}

export class FakeAudioSource implements AudioSource {
  rangeCalls: [number, number][] = [];
  closed = false;
  constructor(readonly id: string, readonly duration = 10, readonly sampleRate = 48000) {}
  open(): Promise<AudioSourceInfo> { return Promise.resolve({ sampleRate: this.sampleRate, channels: 2, duration: this.duration, decodable: true }); }
  range(from: number, to: number): Promise<AudioBuffer> {
    this.rangeCalls.push([from, to]);
    const length = Math.round((to - from) * this.sampleRate);
    return Promise.resolve({ sampleRate: this.sampleRate, numberOfChannels: 2, duration: to - from, length, id: this.id, from, to } as unknown as AudioBuffer);
  }
  close(): void { this.closed = true; }
}

export class FakeAudioOutput implements AudioOutput {
  contextTime = 0;
  running = true;
  scheduled: ScheduledSource[] = [];
  cancelled: string[] = [];
  cancelAllCount = 0;
  master: number[] = [];
  resumed = 0;
  schedule(src: ScheduledSource): void { this.scheduled.push(src); }
  cancel(keyPrefix: string): void { this.cancelled.push(keyPrefix); this.scheduled = this.scheduled.filter((s) => !s.key.startsWith(keyPrefix)); }
  cancelAll(): void { this.cancelAllCount++; this.scheduled = []; }
  setMaster(gain: number): void { this.master.push(gain); }
  resume(): Promise<void> { this.resumed++; return Promise.resolve(); }
}

export function fakeResolver(ids: string[]): MediaResolver {
  return { resolve: (id) => (ids.includes(id) ? Promise.resolve({ kind: "url", url: `/${id}` }) : Promise.reject(new Error(`no media ${id}`))) };
}

export interface Recorded { name: string; args: unknown[] }

/** A 2D context stand-in that records every call and property set. */
export function recorderContext(): { ctx: Ctx2D; calls: Recorded[]; canvas: object } {
  const calls: Recorded[] = [];
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const target: Record<string, unknown> = { canvas };
  const ctx = new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      return (...args: unknown[]) => { calls.push({ name: prop, args }); };
    },
    set(t, prop: string, value) {
      calls.push({ name: `set:${prop}`, args: [value] });
      t[prop] = value;
      return true;
    },
  }) as unknown as Ctx2D;
  return { ctx, calls, canvas };
}

export function recorderCanvas(width: number, height: number) {
  const rec = recorderContext();
  (rec.canvas as { width: number; height: number }).width = width;
  (rec.canvas as { width: number; height: number }).height = height;
  return rec.canvas as unknown as OffscreenCanvas;
}

/** Let queued microtasks and a few macrotasks run. */
export async function flush(rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 0));
}
