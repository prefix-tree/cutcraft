import { EASING_FN, easingCurve, type OldEasing } from "../easing";
import type { Easing } from "../jsx/enums";
import { type LayerClock, useLayer } from "../jsx/use-t";

/**
 * When a part of a diagram happens. Give `start`, seconds of the video (what a narration's cue gives), or `after`,
 * seconds since the layer started (for a layer that itself starts on a word); with neither, it starts with the
 * layer. Or give `progress` and drive the part yourself.
 */
export interface When {
  /** Seconds of the video. */
  readonly start?: number;
  /** Seconds since the layer started. */
  readonly after?: number;
  /** How long it takes, in seconds. Default 0.4. */
  readonly over?: number;
  /** Default `easeInOut`. An old name (`"ease-in-out"`) still works, with a warning. */
  readonly easing?: Easing | OldEasing;
  /** From 0 to 1, in place of a time: the part is this far along. */
  readonly progress?: number;
}

const clamp = (v: number): number => Math.min(1, Math.max(0, v));

let warnedAt = false;
/** `start`, or the `at` it was called before 0.6, which still works with one warning. */
function startOf(when: When): number | undefined {
  if (when.start !== undefined) return when.start;
  const at = (when as { readonly at?: unknown }).at;
  if (typeof at !== "number") return undefined;
  if (!warnedAt) {
    warnedAt = true;
    console.warn("a diagram part's `at` is now `start`: seconds of the video it starts at");
  }
  return at;
}

/** How far along something is on a layer's clock: 0 before it starts, 1 once it is over, eased between. */
export function progress(clock: Pick<LayerClock, "time" | "elapsed">, when: When = {}): number {
  if (when.progress !== undefined) return clamp(when.progress);
  const start = startOf(when);
  const since = start !== undefined ? clock.time - start : clock.elapsed - (when.after ?? 0);
  const over = when.over ?? 0.4;
  if (over <= 0) return since >= 0 ? 1 : 0;
  return (easingCurve(when.easing ?? "easeInOut") ?? EASING_FN.easeInOut)(clamp(since / over));
}

/** `progress` on the clock of the layer this is drawn in. */
export function useProgress(when: When = {}): number {
  return progress(useLayer(), when);
}

/** The timing props of a part, taken apart from the rest. */
export function splitWhen<P extends When>(props: P): [When, Omit<P, keyof When>] {
  const { after, over, easing, progress: given, ...others } = props;
  // An old `at` is taken as `start` here too, so it never reaches the part's own props.
  const { start: _start, at: _at, ...rest } = others as typeof others & { start?: number; at?: number };
  const start = startOf(props);
  return [
    {
      ...(start !== undefined ? { start } : {}),
      ...(after !== undefined ? { after } : {}),
      ...(over !== undefined ? { over } : {}),
      ...(easing !== undefined ? { easing } : {}),
      ...(given !== undefined ? { progress: given } : {}),
    },
    rest as Omit<P, keyof When>,
  ];
}
