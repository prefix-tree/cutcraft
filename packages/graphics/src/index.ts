import type { GraphicKind, Label } from "./types";
import { arrow, curvedArrow, handArrow } from "./kinds/arrows";
import { badge, burst, callout, pill, speechBubble } from "./kinds/callouts";
import { lowerThird, lowerThirdCard, lowerThirdSplit } from "./kinds/lower-thirds";
import { cornerBrackets, deviceFrame, frame } from "./kinds/frames";
import { circleScribble, marker, strike, underline } from "./kinds/highlights";
import { countdown, divider, progressBar, steps } from "./kinds/progress";
import { comparison, counter, sampleSize, unitGrid } from "./kinds/data";
import { blobsBackground, dotsBackground, gradientBackground, gridBackground, wavesBackground } from "./kinds/backgrounds";
import { confetti, sparkles } from "./kinds/effects";
import { icon } from "./kinds/icon";
import { hash } from "./util";

export type { Drawn, GraphicContext, GraphicKind, KindCategory, Label } from "./types";
export { iconNames, isIcon } from "./kinds/icon";
export { hash, random } from "./util";
export { graphicControls, type GraphicControl } from "./controls";

/** Every built-in kind, in catalog order. */
export const GRAPHIC_KINDS = {
  "arrow": arrow,
  "curved-arrow": curvedArrow,
  "hand-arrow": handArrow,
  "callout": callout,
  "speech-bubble": speechBubble,
  "badge": badge,
  "pill": pill,
  "burst": burst,
  "lower-third": lowerThird,
  "lower-third-card": lowerThirdCard,
  "lower-third-split": lowerThirdSplit,
  "corner-brackets": cornerBrackets,
  "frame": frame,
  "device-frame": deviceFrame,
  "underline": underline,
  "circle-scribble": circleScribble,
  "marker": marker,
  "strike": strike,
  "progress-bar": progressBar,
  "countdown": countdown,
  "steps": steps,
  "counter": counter,
  "unit-grid": unitGrid,
  "comparison": comparison,
  "sample-size": sampleSize,
  "divider": divider,
  "gradient-background": gradientBackground,
  "dots-background": dotsBackground,
  "grid-background": gridBackground,
  "waves-background": wavesBackground,
  "blobs-background": blobsBackground,
  "confetti": confetti,
  "sparkles": sparkles,
  "icon": icon,
} as const;

export type GraphicKindName = keyof typeof GRAPHIC_KINDS;

/** Props every `<Graphic>` takes beside its kind's; no kind may use these names for its own. */
export const GRAPHIC_BASE_PROPS = ["id", "kind", "start", "anchor", "offset", "duration", "transform", "fit", "blend", "blendOpacity", "emphasis", "enter", "exit", "style", "width", "height"] as const;
export const GRAPHIC_KIND_NAMES = Object.keys(GRAPHIC_KINDS) as GraphicKindName[];

export function graphicKind(name: string): GraphicKind | null {
  return Object.hasOwn(GRAPHIC_KINDS, name) ? (GRAPHIC_KINDS[name as GraphicKindName] as unknown as GraphicKind) : null;
}

export interface DrawGraphicOptions {
  /** The box, in composition pixels. */
  readonly width: number;
  readonly height: number;
  readonly t: number;
  readonly duration: number;
  /** The element's id: seeds the kinds that scatter things. */
  readonly id: string;
  /** Theme tokens by name, without `$`. */
  readonly tokens: Readonly<Record<string, string | number>>;
}

/**
 * The box a graphic asks for: its own `width`/`height` when it gives them,
 * else the kind's size for its props (backgrounds and confetti fill `frame`).
 */
export function graphicSize(props: Readonly<Record<string, unknown>>, frame: { readonly width: number; readonly height: number }): { width: number; height: number } {
  const kind = graphicKind(String(props.kind));
  const base = kind ? kind.size(props as never, frame) : { width: 200, height: 200 };
  return {
    width: typeof props.width === "number" ? props.width : base.width,
    height: typeof props.height === "number" ? props.height : base.height,
  };
}

/** A graphic's art and labels for parsed props at one moment. An unknown kind draws nothing. */
export function drawGraphic(props: Readonly<Record<string, unknown>>, o: DrawGraphicOptions): { svg: string; labels: readonly Label[] } {
  const kind = graphicKind(String(props.kind));
  if (!kind) return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}"/>`, labels: [] };
  const value = (v: string): string => {
    const m = /^\$([A-Za-z][A-Za-z0-9_-]*)$/.exec(v);
    const hit = m ? o.tokens[m[1] as string] : undefined;
    return hit === undefined ? v : String(hit);
  };
  return kind.draw(props as never, { width: o.width, height: o.height, t: o.t, duration: o.duration, seed: hash(o.id), value });
}
