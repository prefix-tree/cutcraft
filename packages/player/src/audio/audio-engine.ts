import type { ResolvedState } from "@cutcut/kit";
import { AUDIO_CACHE_S, AUDIO_PRIME_S, LOOKAHEAD_S, PLAY_PRIME_TIMEOUT_MS, SCHEDULER_MS } from "../constants";
import type { Transport } from "../clock/transport";
import { buildAudioPlan, type AudioOccurrence } from "../model/audio-plan";
import type { ResolveNested } from "../model/frame-plan";
import type { AudioOutput, AudioSource, EnvelopePoint, PlayerErrorEvent } from "../types";

export interface AudioEngineDeps {
  readonly output: AudioOutput;
  readonly transport: Transport;
  /** Clock seconds (the transport's clock) → audio context seconds. */
  readonly toContextTime: (clockTime: number) => number;
  readonly audioSource: (assetId: string) => Promise<AudioSource>;
  readonly state: () => ResolvedState;
  readonly resolveNested?: ResolveNested | undefined;
  readonly setInterval: (fn: () => void, ms: number) => unknown;
  readonly clearInterval: (id: unknown) => void;
  readonly onError?: ((e: PlayerErrorEvent) => void) | undefined;
}

/**
 * Schedules audio chunks on the output ahead of the transport. Every play
 * starts a session; a scheduler tick plans the window since the last tick
 * up to the lookahead and schedules each new chunk once, with offset,
 * duration and playback rate derived from the transport. Pause cancels
 * everything; seek and rate changes restart the session.
 */
export class AudioEngine {
  private session = 0;
  private timer: unknown = null;
  private scheduled = new Set<string>();
  private scheduledUpTo = 0;
  private running = false;
  private cache = new Map<string, { buffer: Promise<AudioBuffer>; seconds: number }>();
  private cacheSeconds = 0;
  private _muted = false;
  private _volume = 1;

  constructor(private readonly deps: AudioEngineDeps) {}

  get muted(): boolean { return this._muted; }
  get volume(): number { return this._volume; }
  get active(): boolean { return this.running; }

  setMaster(volume: number, muted: boolean): void {
    this._volume = volume;
    this._muted = muted;
    this.deps.output.setMaster(muted ? 0 : volume);
  }

  /** Decode what plays in the first moments after `t`, bounded by a timeout, so play starts on time. */
  prime(t: number): Promise<void> {
    const plan = buildAudioPlan(this.deps.state(), t, t + AUDIO_PRIME_S, this.deps.resolveNested);
    const all = Promise.all(plan.map((occ) => this.buffer(occ).catch(() => undefined))).then(() => undefined);
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, PLAY_PRIME_TIMEOUT_MS));
    return Promise.race([all, timeout]);
  }

  start(): void {
    this.session++;
    this.scheduled.clear();
    this.scheduledUpTo = this.deps.transport.time();
    this.running = true;
    void this.deps.output.resume();
    this.tick();
    this.timer = this.deps.setInterval(() => this.tick(), SCHEDULER_MS);
  }

  stop(): void {
    if (this.timer !== null) this.deps.clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    this.session++;
    this.deps.output.cancelAll();
  }

  /** After a seek, a rate change or a loop: reschedule from the new position. */
  reseek(): void {
    const wasRunning = this.running;
    this.stop();
    if (wasRunning) this.start();
  }

  tick(): void {
    if (!this.running) return;
    const transport = this.deps.transport;
    const now = transport.time();
    const horizon = Math.max(now, this.scheduledUpTo) + LOOKAHEAD_S;
    const from = Math.min(now, this.scheduledUpTo);
    const plan = buildAudioPlan(this.deps.state(), from, horizon, this.deps.resolveNested);
    const session = this.session;
    for (const occ of plan) {
      const key = `${occ.id}#${occ.chunk}`;
      if (this.scheduled.has(key)) continue;
      this.scheduled.add(key);
      void this.schedule(occ, session, key);
    }
    this.scheduledUpTo = horizon;
  }

  dispose(): void {
    this.stop();
    this.cache.clear();
  }

  private async schedule(occ: AudioOccurrence, session: number, key: string): Promise<void> {
    let buffer: AudioBuffer;
    try {
      buffer = await this.buffer(occ);
    } catch (error) {
      this.deps.onError?.({ id: occ.id, asset: occ.asset, error: error instanceof Error ? error : new Error(String(error)), fatal: false });
      return;
    }
    if (session !== this.session) return;
    const transport = this.deps.transport;
    const now = transport.time();
    const startComp = Math.max(occ.compStart, now);
    if (startComp >= occ.compEnd) return;
    const ctxTime = (t: number): number => this.deps.toContextTime(transport.clockTimeFor(t));
    const envelope: EnvelopePoint[] = occ.gain.map(([t, value]) => ({ at: ctxTime(t), value }));
    const pan = occ.pan?.map(([t, value]) => ({ at: ctxTime(t), value }));
    this.deps.output.schedule({
      key: `${key}#${session}`,
      buffer,
      when: ctxTime(startComp),
      offset: (startComp - occ.compStart) * occ.speed,
      duration: (occ.compEnd - startComp) * occ.speed,
      playbackRate: occ.speed * transport.rate,
      envelope,
      ...(pan ? { pan } : {}),
    });
  }

  private buffer(occ: AudioOccurrence): Promise<AudioBuffer> {
    const key = `${occ.asset}|${occ.bufferFrom}|${occ.bufferTo}${occ.reverse ? "|r" : ""}`;
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit.buffer;
    }
    const seconds = occ.bufferTo - occ.bufferFrom;
    const buffer = this.deps.audioSource(occ.asset).then((s) => s.range(occ.bufferFrom, occ.bufferTo)).then((b) => {
      if (occ.reverse) for (let ch = 0; ch < b.numberOfChannels; ch++) b.getChannelData(ch).reverse();
      return b;
    });
    buffer.catch(() => { this.cache.delete(key); this.cacheSeconds -= seconds; });
    this.cache.set(key, { buffer, seconds });
    this.cacheSeconds += seconds;
    while (this.cacheSeconds > AUDIO_CACHE_S && this.cache.size > 1) {
      const [oldest, entry] = this.cache.entries().next().value as [string, { buffer: Promise<AudioBuffer>; seconds: number }];
      this.cache.delete(oldest);
      this.cacheSeconds -= entry.seconds;
    }
    return buffer;
  }
}
