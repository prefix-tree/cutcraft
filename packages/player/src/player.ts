import type { ResolvedState } from "@cutcraft/kit";

import { AudioEngine } from "./audio/audio-engine";
import { WebAudioOutput } from "./audio/web-audio-output";
import { AudioContextClock } from "./clock/audio-clock";
import { PerformanceClock } from "./clock/clock";
import { Transport } from "./clock/transport";
import { MAX_RATE, MIN_RATE, SETTLE_MS } from "./constants";
import { AssetSources } from "./media/asset-sources";
import { defaultCreateCanvas } from "./media/frame-source";
import { mediabunnyAudioSourceFactory } from "./media/mediabunny-audio-source";
import { mediabunnyFrameSourceFactory } from "./media/mediabunny-frame-source";
import { MediabunnyInputs } from "./media/mediabunny-input";
import { toResolver } from "./media/resolver";
import type { ResolveNested } from "./model/frame-plan";
import { frameIndex, frameTime, timecode } from "./model/time";
import { makeNestedResolver } from "./nested";
import { Compositor } from "./render/compositor";
import type {
  AnyCanvas,
  AudioOutput,
  AudioSource,
  AudioSourceFactory,
  Clock,
  CreateCanvas,
  Ctx2D,
  FrameSourceFactory,
  MediaHandle,
  MediaResolver,
  PlayerErrorEvent,
  PlayerEvents,
} from "./types";

export interface CaptureSheetOptions {
  /** Cells per row; default 4, never more than the number of times. */
  readonly columns?: number;
  /** Cell width in pixels; default the composition width capped at 320. Height follows the aspect ratio. */
  readonly cellWidth?: number;
  /** Draw a `mm:ss:ff` label in each cell; default true. */
  readonly labels?: boolean;
}

export interface PlayerOptions {
  readonly state: ResolvedState;
  readonly media: MediaResolver | Readonly<Record<string, Blob | string>>;
  readonly audioContext?: AudioContext | undefined;
  readonly loop?: boolean | undefined;
  readonly initiallyMuted?: boolean | undefined;
  readonly playbackRate?: number | undefined;
  readonly resolveNested?: ResolveNested | undefined;
  /** Test seams; the browser defaults are the audio-context clock, Web Audio and mediabunny. */
  readonly clock?: Clock | undefined;
  readonly audioOutput?: AudioOutput | undefined;
  readonly toContextTime?: ((clockTime: number) => number) | undefined;
  readonly frameSourceFactory?: FrameSourceFactory | undefined;
  readonly audioSourceFactory?: AudioSourceFactory | undefined;
  readonly createCanvas?: CreateCanvas | undefined;
  readonly raf?: ((cb: () => void) => number) | undefined;
  readonly cancelRaf?: ((id: number) => void) | undefined;
  readonly setInterval?: ((fn: () => void, ms: number) => unknown) | undefined;
  readonly clearInterval?: ((id: unknown) => void) | undefined;
  readonly setTimeout?: ((fn: () => void, ms: number) => unknown) | undefined;
  readonly clearTimeout?: ((id: unknown) => void) | undefined;
}

export interface TimeSnapshot {
  readonly time: number;
  readonly frame: number;
}

type Listener<K extends keyof PlayerEvents> = (e: PlayerEvents[K]) => void;

/**
 * The framework-free player: owns the transport, the compositor (canvas),
 * the audio engine and the media sources. React's `<Player>` is a thin
 * wrapper over it; a headless exporter can drive `renderFrame` directly.
 */
export class PlayerCore {
  private _state: ResolvedState;
  private readonly media: MediaResolver;
  private readonly clock: Clock;
  private readonly transport: Transport;
  readonly compositor: Compositor;
  private readonly engine: AudioEngine;
  private readonly sources: AssetSources;
  private readonly inputs: MediabunnyInputs | null;
  private readonly audioContext: AudioContext | null;
  private readonly audioSources = new Map<string, Promise<AudioSource>>();
  private readonly listeners = new Map<keyof PlayerEvents, Set<Listener<keyof PlayerEvents>>>();
  private readonly timeListeners = new Set<() => void>();
  private readonly createCanvas: CreateCanvas;
  private readonly raf: (cb: () => void) => number;
  private readonly cancelRaf: (id: number) => void;
  private rafId: number | null = null;
  private readonly setTimeoutFn: (fn: () => void, ms: number) => unknown;
  private readonly clearTimeoutFn: (id: unknown) => void;
  private settleTimer: unknown = null;
  private seekGeneration = 0;
  private snapshot: TimeSnapshot = { time: 0, frame: 0 };
  private _muted: boolean;
  private _volume = 1;
  private disposed = false;

  constructor(options: PlayerOptions) {
    this._state = options.state;
    this.media = toResolver(options.media);
    const comp = options.state.composition;
    const wantsBrowserAudio = !options.audioOutput || !options.clock || !options.audioSourceFactory;
    this.audioContext =
      wantsBrowserAudio && typeof AudioContext !== "undefined"
        ? (options.audioContext ??
          new AudioContext({ sampleRate: Number(options.state.items.get(comp.id)?.props.sampleRate ?? 48000) }))
        : (options.audioContext ?? null);
    const audioClock = this.audioContext && !options.clock ? new AudioContextClock(this.audioContext) : null;
    this.clock = options.clock ?? audioClock ?? new PerformanceClock();
    const toContextTime =
      options.toContextTime ?? (audioClock ? (t: number) => audioClock.toContextTime(t) : (t: number) => t);
    this.transport = new Transport(this.clock, comp.duration);
    this.transport.loop = options.loop ?? false;
    if (options.playbackRate !== undefined) this.transport.setRate(options.playbackRate);
    this.raf = options.raf ?? ((cb) => requestAnimationFrame(cb));
    this.cancelRaf = options.cancelRaf ?? ((id) => cancelAnimationFrame(id));
    this.setTimeoutFn = options.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimeoutFn = options.clearTimeout ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
    const createCanvas = options.createCanvas ?? defaultCreateCanvas;
    this.createCanvas = createCanvas;
    this.inputs = options.frameSourceFactory && options.audioSourceFactory ? null : new MediabunnyInputs();
    const frameSourceFactory = options.frameSourceFactory ?? mediabunnyFrameSourceFactory(this.inputs!, createCanvas);
    const audioSourceFactory = options.audioSourceFactory ?? mediabunnyAudioSourceFactory(this.inputs!);
    const resolveNested = options.resolveNested ?? makeNestedResolver(() => this._state);
    this.sources = new AssetSources({
      media: this.media,
      manifest: options.state.manifest,
      frameSourceFactory,
      clock: this.clock,
      onError: (e) => this.emit("error", e),
    });
    this.compositor = new Compositor(options.state, {
      sources: this.sources,
      createCanvas,
      resolveNested,
      onFrame: (time, frame) => this.publish(time, frame),
    });
    this.compositor.setRate(this.transport.rate);
    const output = options.audioOutput ?? (this.audioContext ? new WebAudioOutput(this.audioContext) : null);
    if (!output) throw new Error("PlayerCore needs an AudioOutput: no AudioContext in this environment");
    this.engine = new AudioEngine({
      output,
      transport: this.transport,
      toContextTime,
      state: () => this._state,
      resolveNested,
      audioSource: (assetId) => this.audioSource(assetId, audioSourceFactory),
      setInterval: options.setInterval ?? ((fn, ms) => setInterval(fn, ms)),
      clearInterval: options.clearInterval ?? ((id) => clearInterval(id as ReturnType<typeof setInterval>)),
      onError: (e) => this.emit("error", e),
    });
    this._muted = options.initiallyMuted ?? false;
    this.engine.setMaster(this._volume, this._muted);
  }

  get state(): ResolvedState {
    return this._state;
  }
  get duration(): number {
    return this.transport.duration;
  }
  get playbackRate(): number {
    return this.transport.rate;
  }
  set playbackRate(rate: number) {
    const r = Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
    if (r === this.transport.rate) return;
    this.transport.setRate(r);
    this.compositor.setRate(r);
    if (this.transport.playing) this.engine.reseek();
    this.emit("ratechange", { rate: r });
  }
  get loop(): boolean {
    return this.transport.loop;
  }
  set loop(v: boolean) {
    this.transport.loop = v;
  }
  get muted(): boolean {
    return this._muted;
  }
  set muted(v: boolean) {
    if (v === this._muted) return;
    this._muted = v;
    this.engine.setMaster(this._volume, v);
    this.emit("volumechange", { volume: this._volume, muted: v });
  }
  get volume(): number {
    return this._volume;
  }
  set volume(v: number) {
    const vol = Math.min(1, Math.max(0, v));
    if (vol === this._volume) return;
    this._volume = vol;
    this.engine.setMaster(vol, this._muted);
    this.emit("volumechange", { volume: vol, muted: this._muted });
  }

  /** The media handle for an asset id, for DOM elements that show images. */
  resolveMedia(assetId: string): Promise<MediaHandle> {
    return this.media.resolve(assetId);
  }

  getCurrentTime(): number {
    return this.transport.time();
  }
  getCurrentFrame(): number {
    return frameIndex(this.transport.time(), this._state.composition.fps);
  }
  isPlaying(): boolean {
    return this.transport.playing;
  }
  getTime(): TimeSnapshot {
    return this.snapshot;
  }

  async play(): Promise<void> {
    if (this.disposed || this.transport.playing) return;
    const t = this.transport.time() >= this.duration ? 0 : this.transport.time();
    await this.engine.prime(t);
    if (this.disposed || this.transport.playing) return;
    if (this.transport.time() >= this.duration) {
      this.transport.seek(0);
      await this.compositor.seek(0);
    }
    this.transport.play();
    this.engine.start();
    this.startLoop();
    this.emit("play", { time: this.transport.time() });
  }

  pause(): void {
    if (!this.transport.playing) return;
    this.transport.pause();
    this.engine.stop();
    this.stopLoop();
    this.emit("pause", { time: this.transport.time() });
  }

  toggle(): Promise<void> {
    if (this.transport.playing) {
      this.pause();
      return Promise.resolve();
    }
    return this.play();
  }

  /** Jump to `time` and draw its exact frame before resolving, playing or not. */
  async seekTo(time: number): Promise<void> {
    if (this.disposed) return;
    const generation = ++this.seekGeneration;
    this.transport.seek(time);
    const t = this.transport.time();
    if (this.transport.playing) this.engine.reseek();
    await this.compositor.seek(t);
    // A slower, older decode must not repaint or publish over a newer scrub position.
    if (this.disposed || generation !== this.seekGeneration) return;
    await this.compositor.tick(t, { wait: true });
    if (this.disposed || generation !== this.seekGeneration) return;
    this.publish(t, frameIndex(t, this._state.composition.fps));
    this.emit("seeked", { time: t });
  }

  seekToFrame(frame: number): Promise<void> {
    return this.seekTo(frameTime(frame, this._state.composition.fps));
  }

  /** Draw `time` without moving the transport; decoders return to the play head afterwards. */
  async renderFrame(time: number): Promise<void> {
    if (this.disposed) return;
    const t = Math.min(this.duration, Math.max(0, time));
    await this.compositor.seek(t);
    await this.compositor.tick(t, { wait: true });
    if (this.transport.playing) await this.compositor.seek(this.transport.time());
  }

  /**
   * A contact sheet of the canvas plane at `times`: each cell is `renderFrame`
   * of that time with a timecode label, laid out `columns` wide. The way an
   * agent or a test looks at the result without exporting. DOM overlays
   * (titles, shapes, Layer interiors) are not on the canvas and do not appear.
   */
  async captureSheet(times: readonly number[], options: CaptureSheetOptions = {}): Promise<AnyCanvas> {
    const comp = this._state.composition;
    const count = times.length;
    const columns = Math.max(1, Math.min(Math.floor(options.columns ?? 4), Math.max(1, count)));
    const cellWidth = Math.max(1, Math.round(options.cellWidth ?? Math.min(comp.width, DEFAULT_SHEET_CELL_WIDTH)));
    const cellHeight = Math.max(1, Math.round((cellWidth * comp.height) / comp.width));
    const rows = Math.max(1, Math.ceil(count / columns));
    const sheet = this.createCanvas(columns * cellWidth, rows * cellHeight);
    const ctx = sheet.getContext("2d") as Ctx2D | null;
    const scratch = this.createCanvas(comp.width, comp.height);
    const scratchCtx = scratch.getContext("2d") as Ctx2D | null;
    if (!ctx || !scratchCtx) throw new Error("captureSheet: no 2d context");
    const previous = this.compositor.attachedContext;
    this.compositor.attach(scratchCtx);
    try {
      for (let i = 0; i < count; i++) {
        const t = times[i]!;
        await this.renderFrame(t);
        const x = (i % columns) * cellWidth;
        const y = Math.floor(i / columns) * cellHeight;
        ctx.drawImage(scratch, x, y, cellWidth, cellHeight);
        if (options.labels !== false)
          drawLabel(ctx, timecode(Math.min(this.duration, Math.max(0, t)), comp.fps), x, y, cellWidth, cellHeight);
      }
    } finally {
      this.compositor.attach(previous);
      if (previous && !this.disposed && !this.transport.playing)
        void this.compositor.tick(this.transport.time(), { wait: true });
    }
    return sheet;
  }

  /**
   * The editor pushes a new resolve on every drag step. Decoders of the same
   * asset keep their frames and take the new trim; a paused preview paints at
   * once with what is decoded and fetches the exact frame after the gesture
   * has been quiet for `SETTLE_MS`.
   */
  setState(state: ResolvedState): void {
    this._state = state;
    this.transport.duration = state.composition.duration;
    this.compositor.setState(state);
    if (this.transport.playing) return;
    void this.compositor.tick(this.transport.time(), { wait: false });
    if (this.settleTimer !== null) this.clearTimeoutFn(this.settleTimer);
    this.settleTimer = this.setTimeoutFn(() => {
      this.settleTimer = null;
      if (!this.disposed && !this.transport.playing) void this.compositor.tick(this.transport.time(), { wait: true });
    }, SETTLE_MS);
  }

  attachCanvas(canvas: HTMLCanvasElement | OffscreenCanvas | null): void {
    const ctx = canvas ? (canvas.getContext("2d") as Ctx2D | null) : null;
    if (canvas) {
      canvas.width = this._state.composition.width;
      canvas.height = this._state.composition.height;
    }
    this.compositor.attach(ctx);
    if (ctx && !this.transport.playing) void this.compositor.tick(this.transport.time(), { wait: true });
  }

  addEventListener<K extends keyof PlayerEvents>(type: K, fn: Listener<K>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn as Listener<keyof PlayerEvents>);
    return () => this.removeEventListener(type, fn);
  }

  removeEventListener<K extends keyof PlayerEvents>(type: K, fn: Listener<K>): void {
    this.listeners.get(type)?.delete(fn as Listener<keyof PlayerEvents>);
  }

  /** For `useSyncExternalStore`: notified once per painted frame and on every seek. */
  subscribeTime(fn: () => void): () => void {
    this.timeListeners.add(fn);
    return () => {
      this.timeListeners.delete(fn);
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.pause();
    this.disposed = true;
    if (this.settleTimer !== null) this.clearTimeoutFn(this.settleTimer);
    this.settleTimer = null;
    this.engine.dispose();
    this.compositor.dispose();
    this.sources.dispose();
    for (const p of this.audioSources.values()) void p.then((s) => s.close()).catch(() => undefined);
    this.audioSources.clear();
    this.inputs?.dispose();
    this.listeners.clear();
    this.timeListeners.clear();
  }

  private startLoop(): void {
    if (this.rafId !== null) return;
    const tick = (): void => {
      this.rafId = null;
      if (this.disposed || !this.transport.playing) return;
      const result = this.transport.check();
      const t = this.transport.time();
      if (result === "ended") {
        this.engine.stop();
        void this.compositor.tick(t, { wait: true }).then(() => this.emit("ended", { time: t }));
        return;
      }
      if (result === "looped") {
        void this.compositor.seek(t);
        this.engine.reseek();
      }
      void this.compositor.tick(t, { wait: false });
      this.rafId = this.raf(tick);
    };
    this.rafId = this.raf(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) this.cancelRaf(this.rafId);
    this.rafId = null;
  }

  private publish(time: number, frame: number): void {
    if (this.snapshot.time === time && this.snapshot.frame === frame) return;
    this.snapshot = { time, frame };
    for (const fn of this.timeListeners) fn();
    this.emit("frameupdate", { time, frame });
  }

  private emit<K extends keyof PlayerEvents>(type: K, event: PlayerEvents[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) (fn as Listener<K>)(event);
  }

  private audioSource(assetId: string, factory: AudioSourceFactory): Promise<AudioSource> {
    let p = this.audioSources.get(assetId);
    if (!p) {
      p = this.media.resolve(assetId).then(async (handle) => {
        const source = factory(
          assetId,
          handle,
          this.audioContext ??
            ({
              createBuffer: () => {
                throw new Error("no AudioContext");
              },
            } as unknown as BaseAudioContext),
        );
        const info = await source.open();
        if (!info.decodable) throw new Error(`audio of "${assetId}" cannot be decoded`);
        return source;
      });
      this.audioSources.set(assetId, p);
      p.catch(() => undefined);
    }
    return p;
  }
}

export type { PlayerErrorEvent };

const DEFAULT_SHEET_CELL_WIDTH = 320;

function drawLabel(ctx: Ctx2D, text: string, x: number, y: number, w: number, h: number): void {
  const band = Math.max(12, Math.round(h * 0.1));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(x, y + h - band, w, band);
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.round(band * 0.7)}px monospace`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + Math.round(band / 3), y + h - band / 2);
}
