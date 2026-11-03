import type { Clock } from "../types";

/**
 * `AudioContext.currentTime` while the context runs, the performance clock
 * otherwise, with an offset captured at every state change so `now()` never
 * jumps. Audio scheduling converts back with `toContextTime`.
 */
export class AudioContextClock implements Clock {
  private offset = 0;
  private wasRunning = false;
  private lastNow = 0;

  constructor(private readonly ctx: BaseAudioContext) {}

  get running(): boolean {
    return this.ctx.state === "running";
  }

  now(): number {
    const running = this.running;
    const raw = running ? this.ctx.currentTime : performance.now() / 1000;
    if (running !== this.wasRunning) {
      this.offset = this.lastNow - raw;
      this.wasRunning = running;
    }
    const now = raw + this.offset;
    this.lastNow = Math.max(now, this.lastNow);
    return this.lastNow;
  }

  /** Audio context seconds for a clock time; exact while the context runs. */
  toContextTime(clockTime: number): number {
    this.now();
    return this.running ? clockTime - this.offset : this.ctx.currentTime + (clockTime - this.lastNow);
  }
}
