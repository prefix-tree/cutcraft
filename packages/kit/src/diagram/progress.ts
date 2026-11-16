import type { Easing } from "../jsx/enums";
import { type LayerClock, useLayer } from "../jsx/use-t";
import { EASING_FN } from "../resolve/speed";

/**
 * When a part of a diagram happens. Give `at`, seconds of the video (what a narration's cue gives), or `after`,
 * seconds since the layer started (for a layer that itself starts on a word); with neither, it starts with the
 * layer. Or give `progress` and drive the part yourself.
 */
export interface When {
  /** Seconds of the video. */
  readonly at?: number;
  /** Seconds since the layer started. */
  readonly after?: number;
  /** How long it takes, in seconds. Default 0.4. */
  readonly over?: number;
  /** Default `ease-in-out`. */
  readonly easing?: Easing;
  /** From 0 to 1, in place of a time: the part is this far along. */
  readonly progress?: number;
}

const clamp = (v: number): number => Math.min(1, Math.max(0, v));

/** How far along something is on a layer's clock: 0 before it starts, 1 once it is over, eased between. */
export function progress(clock: Pick<LayerClock, "time" | "elapsed">, when: When = {}): number {
  if (when.progress !== undefined) return clamp(when.progress);
  const since = when.at !== undefined ? clock.time - when.at : clock.elapsed - (when.after ?? 0);
  const over = when.over ?? 0.4;
  if (over <= 0) return since >= 0 ? 1 : 0;
  return EASING_FN[when.easing ?? "ease-in-out"](clamp(since / over));
}

/** `progress` on the clock of the layer this is drawn in. */
export function useProgress(when: When = {}): number {
  return progress(useLayer(), when);
}

/** The timing props of a part, taken apart from the rest. */
export function splitWhen<P extends When>(props: P): [When, Omit<P, keyof When>] {
  const { at, after, over, easing, progress: given, ...rest } = props;
  return [
    {
      ...(at !== undefined ? { at } : {}),
      ...(after !== undefined ? { after } : {}),
      ...(over !== undefined ? { over } : {}),
      ...(easing !== undefined ? { easing } : {}),
      ...(given !== undefined ? { progress: given } : {}),
    },
    rest as Omit<P, keyof When>,
  ];
}
