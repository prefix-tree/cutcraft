import type { Clock } from "../types";

export class ManualClock implements Clock {
  private t = 0;
  now(): number { return this.t; }
  advance(dt: number): void { this.t += dt; }
  set(t: number): void { this.t = t; }
}

export class PerformanceClock implements Clock {
  now(): number { return performance.now() / 1000; }
}
