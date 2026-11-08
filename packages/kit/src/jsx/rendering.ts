/**
 * Where the renderers draw less than a file can say. Every type and enum value the schemas accept is drawn (a type the
 * player and the export do not draw is not offered); these are the remaining limits, which the `not-rendered` lint
 * reports, so a file that checks clean renders as written.
 */

/** Masks render on these kinds, one per element. */
export const MASKED_KINDS = ["clip", "nested"] as const;

/** The kinds drawn on the player's DOM overlay plane, over the canvas (a Motion or Three element is a layer). */
const OVERLAY_KINDS = ["title", "shape", "svg", "sticker", "graphic", "layer"] as const;

/** An enum prop where only some values render: a written value outside `values` gets `reason`. */
export interface RenderedValues {
  readonly kind: string;
  /** A prop, or `prop.field` inside an object prop. */
  readonly prop: string;
  readonly values: readonly string[];
  readonly reason: string;
}

export const RENDERED_VALUES: readonly RenderedValues[] = [
  // shortcut: the player's DOM overlay plane is its own stacking context (scaled, z-indexed), so CSS blends never reach the canvas, in the preview or the export; un-isolate it to drop these rows.
  ...OVERLAY_KINDS.map((kind) => ({
    kind,
    prop: "blend",
    values: ["normal"],
    reason: "is drawn unblended over the footage, in the preview and the export",
  })),
];

/**
 * Accepted but not rendered. `kind` "*" is any element; no `prop` is the
 * element itself; no `value` reports any written value except one that asks
 * for nothing (false, 0, "none", "all").
 */
export interface NotRendered {
  readonly kind: string;
  readonly prop?: string;
  readonly value?: string;
  /** Only on an element inside this kind. */
  readonly parent?: string;
  readonly reason: string;
}

export const NOT_RENDERED: readonly NotRendered[] = [
  // shortcut: nested sequences play at their constant source speed (time.ts nestedSourceTime, audio-plan.ts nestedOccurrences); drop these when they map through the ramp.
  {
    kind: "speedKey",
    parent: "nested",
    reason: "is ignored inside <Nested>: the sequence plays at its constant speed",
  },
  { kind: "freeze", parent: "nested", reason: "is ignored inside <Nested>: the sequence plays at its constant speed" },
  // shortcut: the lint cannot see which tracks sit beneath the footage, so it reports every blur; drop this when the blur also paints under backdrop overlays (frame-plan.ts).
  {
    kind: "composition",
    prop: "background.mode",
    value: "blur",
    reason: "draws as the plain colour when an overlay sits beneath the footage",
  },
  {
    kind: "captions",
    prop: "animation",
    value: "typewriter",
    reason: "types out only cues without word timings; cues with words show as karaoke",
  },
  // shortcut: vignette and grain are painted on the canvas (painter.ts paintPost); an overlay's effects run in the DOM
  // plane or HTML-in-Canvas, which has no pass for them yet. Drop these when an overlay draws them.
  ...OVERLAY_KINDS.flatMap((parent) =>
    (["vignette", "grain"] as const).map((value) => ({
      kind: "effect",
      prop: "type",
      value,
      parent,
      reason: "is not drawn on an overlay yet: put it on the clip, or on an <Adjustment> to cover everything beneath",
    })),
  ),
];

export const MASK_NOT_RENDERED = {
  /** On a kind outside MASKED_KINDS. */
  kind: "is ignored: masks render on clips and nested sequences only, the element shows unmasked",
  second: "is ignored: only the first <Mask> on an element renders",
} as const;

export interface MotionBlur {
  readonly shutterAngle: number;
  readonly samples: number;
}

/** The composition's motion blur (`<Composition motionBlur>`), or null when it has none. */
export function motionBlurOf(state: {
  readonly composition: { readonly id: string };
  readonly items: ReadonlyMap<string, { readonly props: Readonly<Record<string, unknown>> }>;
}): MotionBlur | null {
  const blur = state.items.get(state.composition.id)?.props.motionBlur as Partial<MotionBlur> | undefined;
  if (!blur) return null;
  return { shutterAngle: blur.shutterAngle ?? 180, samples: blur.samples ?? 8 };
}

/**
 * The composition seconds a frame at `t` averages: `samples` moments spread evenly across the open shutter, which
 * opens at `t` and stays open `shutterAngle / 360` of a frame. Never past the composition's end.
 */
export function shutterTimes(t: number, fps: number, blur: MotionBlur, duration: number): number[] {
  const open = blur.shutterAngle / 360 / fps;
  const last = Math.max(0, duration - 1e-6);
  return Array.from({ length: blur.samples }, (_, k) => Math.min(last, t + (open * k) / blur.samples));
}
