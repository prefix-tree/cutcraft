import { MAX_RATE, MIN_RATE } from "../constants";
import type { Clock } from "../types";

/**
 * Composition time as an anchor on the clock: `anchorTime + (now − anchorClock) × rate`.
 * Every play, pause, seek and rate change re-anchors, so time is always derived from
 * the clock and never accumulates drift.
 */
export class Transport {
  private anchorTime = 0;
  private anchorClock = 0;
  private _rate = 1;
  private _playing = false;
  loop = false;

  constructor(private readonly clock: Clock, public duration: number) {}

  get playing(): boolean { return this._playing; }
  get rate(): number { return this._rate; }

  time(): number {
    return this.timeAt(this.clock.now());
  }

  timeAt(clockTime: number): number {
    if (!this._playing) return this.anchorTime;
    return this.clamp(this.anchorTime + (clockTime - this.anchorClock) * this._rate);
  }

  /** Clock time at which composition time `t` plays; the inverse of `timeAt` while playing. */
  clockTimeFor(t: number): number {
    if (!this._playing) return this.clock.now();
    return this.anchorClock + (t - this.anchorTime) / this._rate;
  }

  play(): void {
    if (this._playing) return;
    if (this.anchorTime >= this.duration && this.duration > 0) this.anchorTime = 0;
    this.anchorClock = this.clock.now();
    this._playing = true;
  }

  pause(): void {
    if (!this._playing) return;
    this.anchorTime = this.time();
    this._playing = false;
  }

  seek(t: number): void {
    this.anchorTime = this.clamp(t);
    this.anchorClock = this.clock.now();
  }

  setRate(rate: number): void {
    const r = Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
    this.anchorTime = this.time();
    this.anchorClock = this.clock.now();
    this._rate = r;
  }

  /** Advance bookkeeping at the end: loops wrap, otherwise playback stops on the last time. */
  check(): "ended" | "looped" | null {
    if (!this._playing || this.duration <= 0) return null;
    const raw = this.anchorTime + (this.clock.now() - this.anchorClock) * this._rate;
    if (raw < this.duration) return null;
    if (this.loop) {
      this.seek(raw - this.duration >= this.duration ? 0 : raw - this.duration);
      return "looped";
    }
    this.anchorTime = this.duration;
    this._playing = false;
    return "ended";
  }

  private clamp(t: number): number {
    return t < 0 ? 0 : t > this.duration ? this.duration : t;
  }
}
