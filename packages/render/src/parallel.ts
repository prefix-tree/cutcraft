import { Worker } from "node:worker_threads";
import { ALL_FORMATS, BufferSource, EncodedPacketSink, Input, type EncodedVideoPacketSource, type VideoCodec as MediabunnyCodec } from "mediabunny";
import type { LoadOptions } from "./load";
import type { OverlayFont } from "./overlays";
import type { VideoEncoding, SegmentStages } from "./segment";
import type { SegmentReply, SegmentRequest, WorkerInit } from "./worker";

/** Render in several threads: the cut file is loaded again in each, and each encodes whole runs of frames. */
export interface ParallelOptions {
  /** The cut file (TSX), as given to `loadVideo`. Each worker loads it itself: a React tree cannot cross threads. */
  readonly file: string;
  readonly load?: LoadOptions;
  /** The folder holding one media file per asset id, and any per-asset paths, as for `directoryResolver`. */
  readonly mediaDir: string;
  readonly overrides?: Readonly<Record<string, string>>;
  /** Threads; default `defaultWorkers()`. One means no workers. */
  readonly workers?: number;
  /** Frames per run; default about a third of an even split, in whole keyframe intervals. */
  readonly segmentFrames?: number;
}

/**
 * One: the encoder already uses every core, and a frame that passes straight to it leaves the thread little else to
 * do. Workers measured slower or no faster on 4-core Linux and a 12-core Mac (`pnpm bench:scenarios`).
 */
export function defaultWorkers(): number {
  return 1;
}

/** Splits frames [first, last) into runs of whole keyframe intervals, so each run starts on a keyframe the encoder would make anyway. */
export function planSegments(first: number, last: number, keyFrames: number, workers: number, wanted?: number): { first: number; last: number }[] {
  const total = last - first;
  const gop = Math.max(1, keyFrames);
  const even = Math.ceil(total / (workers * 3));
  const length = Math.max(gop, Math.round((wanted ?? even) / gop) * gop);
  const out: { first: number; last: number }[] = [];
  for (let a = first; a < last; a += length) out.push({ first: a, last: Math.min(last, a + length) });
  return out;
}

export interface SegmentOutcome { readonly bytes: Uint8Array; readonly stages: SegmentStages; readonly warnings: readonly string[]; readonly errors: readonly string[] }

interface Job { readonly request: SegmentRequest; readonly resolve: (r: SegmentOutcome) => void; readonly reject: (e: Error) => void }

/** A fixed set of worker threads taking runs of frames in the order they are asked for. */
export class SegmentPool {
  private readonly workers: Worker[] = [];
  private readonly idle: Worker[] = [];
  private readonly queue: Job[] = [];
  private readonly running = new Map<Worker, Job>();
  /** Workers in the middle of a run, failed or not; `terminate` waits for them. */
  private readonly inFlight = new Set<Worker>();
  private readonly drained: (() => void)[] = [];
  private nextId = 0;
  private failure: Error | null = null;

  constructor(count: number, init: WorkerInit) {
    // From source the worker needs tsx registered first; the published build is plain JS with the worker beside it.
    const url = new URL(import.meta.url.endsWith(".ts") ? "./worker-entry.mjs" : "./worker.mjs", import.meta.url);
    for (let i = 0; i < count; i++) {
      const worker = new Worker(url, { workerData: init });
      worker.on("message", (reply: SegmentReply) => this.settle(worker, reply));
      worker.on("error", (error) => this.fail(error));
      worker.on("exit", (code) => {
        this.markIdle(worker);
        if (code !== 0 && !this.failure) this.fail(new Error(`a render worker exited with code ${code}`));
      });
      this.workers.push(worker);
      this.idle.push(worker);
    }
  }

  run(first: number, last: number): Promise<SegmentOutcome> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.queue.push({ request: { id: this.nextId++, first, last }, resolve, reject });
      this.dispatch();
    });
  }

  /**
   * Stops every worker. One in the middle of a run is let finish it first: terminating a thread
   * inside a native skia call leaves an exception skia-canvas cannot handle, and it aborts the
   * whole process. A run that has not finished within `patience` milliseconds is cut off anyway.
   */
  async terminate(patience = 60_000): Promise<void> {
    if (this.inFlight.size > 0) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([new Promise<void>((resolve) => this.drained.push(resolve)), new Promise<void>((resolve) => { timer = setTimeout(resolve, patience); })]);
      clearTimeout(timer);
    }
    await Promise.all(this.workers.map((w) => w.terminate()));
  }

  private markIdle(worker: Worker): void {
    this.inFlight.delete(worker);
    if (this.inFlight.size === 0) for (const resolve of this.drained.splice(0)) resolve();
  }

  private dispatch(): void {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const worker = this.idle.shift() as Worker;
      const job = this.queue.shift() as Job;
      this.running.set(worker, job);
      this.inFlight.add(worker);
      worker.postMessage(job.request);
    }
  }

  private settle(worker: Worker, reply: SegmentReply): void {
    this.markIdle(worker);
    const job = this.running.get(worker);
    this.running.delete(worker);
    this.idle.push(worker);
    if (job) {
      if (reply.ok) job.resolve({ bytes: reply.bytes, stages: reply.stages, warnings: reply.warnings, errors: reply.errors });
      else job.reject(new Error(reply.message));
    }
    this.dispatch();
  }

  private fail(error: Error): void {
    this.failure ??= error;
    for (const job of [...this.running.values(), ...this.queue]) job.reject(this.failure);
    this.running.clear();
    this.queue.length = 0;
  }
}

export interface Fed {
  /** Timestamp, in seconds from the start of the output, of the last packet written. */
  readonly end: number;
}

/**
 * Writes one segment's packets into the final video track, shifted to where the segment belongs.
 * Timestamps are snapped to the frame grid: a WebM stores milliseconds, and the offset is exact.
 */
export async function feedSegment(
  outcome: SegmentOutcome,
  into: { source: EncodedVideoPacketSource; codec: MediabunnyCodec; fps: number; offsetFrames: number; config: { current: VideoDecoderConfig | null } },
  before: (timestamp: number) => Promise<void>,
): Promise<Fed> {
  const input = new Input({ source: new BufferSource(outcome.bytes), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("a render worker produced a segment with no video");
    const config = await track.getDecoderConfig();
    if (!config) throw new Error("a render worker produced a segment with no decoder configuration");
    const first = into.config.current;
    if (first && !compatibleConfig(first, config)) throw new Error(`render workers encoded with different settings (${first.codec} against ${config.codec}); the pieces cannot be joined`);
    let end = 0;
    for await (const packet of new EncodedPacketSink(track).packets()) {
      const frame = Math.round(packet.timestamp * into.fps) + into.offsetFrames;
      const timestamp = frame / into.fps;
      await before(timestamp);
      await into.source.add(packet.clone({ timestamp, duration: 1 / into.fps }), first ? undefined : { decoderConfig: config });
      end = Math.max(end, timestamp + 1 / into.fps);
    }
    into.config.current ??= config;
    return { end };
  } finally {
    input.dispose();
  }
}

/**
 * Whether two decoder configurations describe streams one decoder can play through: the same codec, profile and
 * bit depth and the same size. VP9 level strings differ between encoders and mean nothing to a decoder; an AVC
 * or HEVC description (its parameter sets) must match byte for byte.
 */
export function compatibleConfig(a: VideoDecoderConfig, b: VideoDecoderConfig): boolean {
  if (a.codedWidth !== b.codedWidth || a.codedHeight !== b.codedHeight) return false;
  if (a.codec.startsWith("vp09") && b.codec.startsWith("vp09")) {
    const [, pa, , da] = a.codec.split("."), [, pb, , db] = b.codec.split(".");
    return pa === pb && da === db;
  }
  if (a.codec !== b.codec) return false;
  const da = a.description ? new Uint8Array(a.description as ArrayBuffer) : null;
  const db = b.description ? new Uint8Array(b.description as ArrayBuffer) : null;
  if (!da || !db) return da === db;
  return da.length === db.length && da.every((v, i) => v === db[i]);
}

export type { OverlayFont, VideoEncoding };
