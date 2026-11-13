// The video's clock for the file's own code in an export: `performance.now()`, `Date`, `requestAnimationFrame` and
// `Math.random()` as names that shadow the page's (the kit's `loadModule` takes them as `scope`). Only the file sees
// them. React, the player, the capture's own waits and the libraries keep the browser's clock; three.js and Motion are
// put on the video's by their adapters in @cutcraft/graphics.
import { random } from "@cutcraft/kit";

export interface FreeCodeClock {
  /** What the file's code sees in place of the globals of these names. */
  readonly scope: Readonly<Record<string, unknown>>;
  /** The composition time of the frame being drawn, in seconds. */
  set(seconds: number): void;
  /**
   * Runs the animation-frame callbacks asked for so far, once each: a loop that asks again ticks once a frame.
   * Returns whether any ran.
   */
  flush(): boolean;
}

/** `epochMs` is the wall-clock time `Date` reads at composition time 0: one value for every page of an export. */
export function createFreeCodeClock(epochMs: number): FreeCodeClock {
  let ms = 0;
  let nextId = 1;
  let queue = new Map<number, FrameRequestCallback>();
  const RealDate = Date;
  class VideoDate extends RealDate {
    constructor(...args: unknown[]) {
      // With no argument "now"; with any, the date asked for.
      if (args.length === 0) super(epochMs + ms);
      else super(...(args as [number]));
    }
    static override now(): number {
      return epochMs + ms;
    }
  }
  const now = (): number => ms;
  // The nth call gives the nth number of one fixed sequence, on every page and in every export.
  let calls = 0;
  const seeded = (): number => random(`free-code:${calls++}`);
  return {
    scope: {
      // A proxy, not a copy: the other members (mark, measure, timeOrigin) are the real ones, called on the real object.
      performance: new Proxy(performance, {
        get(target, key) {
          if (key === "now") return now;
          const value = Reflect.get(target, key) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      }),
      Date: VideoDate,
      requestAnimationFrame: (callback: FrameRequestCallback): number => {
        queue.set(nextId, callback);
        return nextId++;
      },
      cancelAnimationFrame: (id: number): void => {
        queue.delete(id);
      },
      Math: Object.assign(Object.create(Math) as Math, { random: seeded }),
    },
    set(seconds) {
      ms = seconds * 1000;
    },
    flush() {
      const due = queue;
      queue = new Map();
      for (const callback of due.values()) callback(ms);
      return due.size > 0;
    },
  };
}
