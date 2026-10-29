import type { CAPTION_ANIMATIONS, MASK_TYPES, TEXT_ANIMATION_PRESETS, TransitionType, VideoEffectType, AudioEffectType } from "./enums";

/**
 * What the player and the renderer actually draw and play, out of what the
 * schemas accept. The player reads these lists; the `not-rendered` lint
 * reports everything else, so a file that checks clean renders as written.
 */

export const RENDERED_TRANSITIONS = ["crossfade"] as const satisfies readonly TransitionType[];
export const RENDERED_EFFECTS = ["brightness", "contrast", "saturation", "hue", "blur", "grayscale", "sepia", "invert", "shadow", "temperature", "tint", "levels"] as const satisfies readonly VideoEffectType[];
export const RENDERED_AUDIO_EFFECTS = [] as const satisfies readonly AudioEffectType[];
export const RENDERED_TITLE_ANIMATIONS = ["none", "fade", "slide-up", "slide-down", "slide-left", "slide-right", "scale", "typewriter", "word-by-word"] as const satisfies readonly (typeof TEXT_ANIMATION_PRESETS)[number][];
export const RENDERED_CAPTION_ANIMATIONS = ["none", "word-highlight", "word-by-word", "karaoke"] as const satisfies readonly (typeof CAPTION_ANIMATIONS)[number][];
export const RENDERED_MASK_TYPES = ["shape", "drawn"] as const satisfies readonly (typeof MASK_TYPES)[number][];
export const RENDERED_COLOR_GRADE = ["temperature", "tint"] as const;
/** Masks render on these kinds, one per element. */
export const MASKED_KINDS = ["clip", "nested"] as const;

/** An enum prop where only some values render: a written value outside `values` gets `reason`. */
export interface RenderedValues {
  readonly kind: string;
  /** A prop, or `prop.field` inside an object prop. */
  readonly prop: string;
  readonly values: readonly string[];
  readonly reason: string;
}

export const RENDERED_VALUES: readonly RenderedValues[] = [
  { kind: "transition", prop: "type", values: RENDERED_TRANSITIONS, reason: "draws as a crossfade" },
  { kind: "effect", prop: "type", values: RENDERED_EFFECTS, reason: "is ignored: the picture renders without it" },
  { kind: "audioEffect", prop: "type", values: RENDERED_AUDIO_EFFECTS, reason: "is ignored: the audio plays without it" },
  { kind: "title", prop: "animation.preset", values: RENDERED_TITLE_ANIMATIONS, reason: "shows as a fade" },
  { kind: "captions", prop: "animation", values: RENDERED_CAPTION_ANIMATIONS, reason: "shows as karaoke" },
  { kind: "mask", prop: "type", values: RENDERED_MASK_TYPES, reason: "is ignored: matte masks are not rendered, the element shows unmasked" },
  // shortcut: the preview's DOM overlay plane is its own stacking context (scaled, z-indexed), so CSS blends never reach the canvas; un-isolate it to drop these rows.
  ...(["title", "shape", "svg", "sticker", "graphic", "layer"] as const).map((kind) => ({ kind, prop: "blend", values: ["normal"], reason: "blends with the footage in the export only: the preview draws it unblended over the footage" })),
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
  readonly reason: string;
}

const THREE_D = "is ignored: 3D transforms are not rendered";

export const NOT_RENDERED: readonly NotRendered[] = [
  { kind: "*", prop: "emphasis", reason: "is ignored: emphasis animations are not rendered" },
  { kind: "*", prop: "transform.rotate3d", reason: THREE_D },
  { kind: "*", prop: "transform.perspective", reason: THREE_D },
  { kind: "*", prop: "transform.transformStyle", reason: THREE_D },
  { kind: "keyframe", prop: "property", value: "transform.position.z", reason: THREE_D },
  { kind: "keyframe", prop: "property", value: "transform.rotation.x", reason: THREE_D },
  { kind: "keyframe", prop: "property", value: "transform.rotation.y", reason: THREE_D },
  { kind: "keyframe", prop: "property", value: "transform.perspective", reason: THREE_D },
  { kind: "clip", prop: "chromaKey", reason: "is ignored: the green screen stays in the picture" },
  { kind: "clip", prop: "stabilize", reason: "is ignored: the footage renders unstabilised" },
  { kind: "clip", prop: "behindSubject", reason: "is ignored: the clip draws in its track order" },
  { kind: "title", prop: "behindSubject", reason: "is ignored: the title draws over the footage" },
  { kind: "title", prop: "text3d", reason: "is ignored: the title renders as flat text" },
  { kind: "clip", prop: "smoothSlowMo", reason: "is ignored: slow motion repeats frames" },
  { kind: "clip", prop: "interpolation", reason: "is ignored: slow motion repeats frames" },
  { kind: "clip", prop: "pitchCorrection", reason: "is ignored: sped-up or slowed audio changes pitch" },
  { kind: "audio", prop: "pitchCorrection", reason: "is ignored: sped-up or slowed audio changes pitch" },
  { kind: "clip", prop: "audioTrack", reason: "is ignored: the asset's first audio stream plays" },
  { kind: "audio", prop: "audioTrack", reason: "is ignored: the asset's first audio stream plays" },
  { kind: "clip", prop: "reverse", reason: "plays the picture backwards but renders silent: reversed audio is not played" },
  { kind: "audio", prop: "reverse", reason: "renders silent: reversed audio is not played" },
  { kind: "speedKey", reason: "changes the picture only: the clip length, audio and captions ignore it" },
  { kind: "freeze", reason: "holds the picture only: the clip length, audio and captions ignore it" },
  { kind: "effect", prop: "params.gamma", reason: "is ignored: levels render their black and white points only" },
  { kind: "adjustment", prop: "affects", reason: "is ignored: the adjustment filters every track below it" },
  { kind: "composition", prop: "background.mode", value: "blur", reason: "draws as the plain background colour" },
  { kind: "mask", prop: "matte", reason: "is ignored: matte masks are not rendered, the element shows unmasked" },
  { kind: "captions", prop: "animation", value: "bounce", reason: "has no motion: it shows as karaoke" },
  { kind: "captions", prop: "animation", value: "typewriter", reason: "types out only cues without word timings; cues with words show as karaoke" },
  ...(["wheels", "curves", "lut", "hsl"] as const).map((prop) => ({ kind: "colorGrade", prop, reason: `is ignored: only ${RENDERED_COLOR_GRADE.join(" and ")} render` })),
];

export const MASK_NOT_RENDERED = {
  /** On a kind outside MASKED_KINDS. */
  kind: "is ignored: masks render on clips and nested sequences only, the element shows unmasked",
  second: "is ignored: only the first <Mask> on an element renders",
} as const;
