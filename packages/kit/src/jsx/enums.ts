import { z } from "zod";

import { TRANSITION_TYPES, VIDEO_EFFECT_TYPES } from "../effects/registry";

// Every value here is drawn by the player and the export: a type the renderers do not draw is not offered.

export const TRACK_LAYOUTS = ["sequence", "free"] as const;
/** The id of the track made of the clips written straight in a `<Composition>`: the bottom one. */
export const MAIN_TRACK_ID = "main";
/** What may be written straight in a `<Composition>` to make that track. */
export const MAIN_TRACK_KINDS = ["clip", "transition", "gap"] as const;
export const TRACK_ROLES = ["general", "captions", "dialogue", "music", "effects", "ambience"] as const;

export const FIT_MODES = ["contain", "cover", "stretch", "none"] as const;

export const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "colorDodge",
  "colorBurn",
  "hardLight",
  "softLight",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
  "add",
  "linearDodge",
] as const;

export const EASINGS = [
  "linear",
  "ease",
  "easeIn",
  "easeOut",
  "easeInOut",
  "hold",
  "bezier",
  "smoothstep",
  "smootherstep",
  "snappy",
  "smooth",
  "spring",
  "easeInQuad",
  "easeOutQuad",
  "easeInOutQuad",
  "easeInCubic",
  "easeOutCubic",
  "easeInOutCubic",
  "easeInQuart",
  "easeOutQuart",
  "easeInOutQuart",
  "easeInQuint",
  "easeOutQuint",
  "easeInOutQuint",
  "easeInSine",
  "easeOutSine",
  "easeInOutSine",
  "easeInExpo",
  "easeOutExpo",
  "easeInOutExpo",
  "easeInCirc",
  "easeOutCirc",
  "easeInOutCirc",
  "easeInBack",
  "easeOutBack",
  "easeInOutBack",
  "easeInBackStrong",
  "easeOutBackStrong",
  "easeInOutBackStrong",
  "easeInElastic",
  "easeOutElastic",
  "easeInOutElastic",
  "easeInElasticSoft",
  "easeOutElasticSoft",
  "easeInOutElasticSoft",
  "easeInBounce",
  "easeOutBounce",
  "easeInOutBounce",
  "easeInBounceSmall",
  "easeOutBounceSmall",
  "easeInOutBounceSmall",
] as const;

// The built-in effects and transitions are listed by their registry (effects/registry.ts).
export { TRANSITION_TYPES, type TransitionType, VIDEO_EFFECT_TYPES, type VideoEffectType } from "../effects/registry";

export const TEXT_ANIMATION_TYPES = [
  "none",
  "typewriter",
  "fade",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scale",
  "wordByWord",
] as const;

export const CAPTION_ANIMATIONS = ["none", "wordHighlight", "wordByWord", "karaoke", "typewriter"] as const;

export const ENTRANCE_ANIMATIONS = [
  "none",
  "fade",
  "slideLeft",
  "slideRight",
  "slideUp",
  "slideDown",
  "scale",
  "rotate",
  "bounce",
  "pop",
  "draw",
  "wipeLeft",
  "wipeRight",
  "wipeUp",
  "wipeDown",
  "revealCenter",
  "revealEdges",
  "elastic",
  "flipHorizontal",
  "flipVertical",
] as const;

export const SHAPE_TYPES = [
  "rectangle",
  "circle",
  "ellipse",
  "triangle",
  "arrow",
  "line",
  "polygon",
  "path",
  "star",
] as const;

export const KEYFRAME_PROPERTIES = [
  "box.x",
  "box.y",
  "transform.scale.x",
  "transform.scale.y",
  "transform.rotation",
  "transform.opacity",
  "transform.anchor.x",
  "transform.anchor.y",
  "transform.borderRadius",
  "transform.crop.x",
  "transform.crop.y",
  "transform.crop.width",
  "transform.crop.height",
  "audio.volume",
  "audio.pan",
] as const;

/** A property a key list can animate, as the resolver names it (`transform.opacity` for `transform={{ opacity: […] }}`). */
export function isKeyframeProperty(value: string): boolean {
  return (KEYFRAME_PROPERTIES as readonly string[]).includes(value);
}

export const TEXT_ALIGNS = ["left", "center", "right", "justify"] as const;
export const TEXT_VALIGNS = ["top", "middle", "bottom"] as const;
export const TEXT_DECORATIONS = ["none", "underline", "lineThrough", "overline"] as const;
export const MASK_TYPES = ["shape", "drawn"] as const;
export const SVG_COLOR_TYPES = ["none", "tint", "replace"] as const;
export const TRACK_FLAGS = ["locked", "hidden", "muted", "solo"] as const;

/**
 * Values spelled in kebab-case before 0.6 and in camelCase since, old to new: blend modes, easings, entrances, text
 * and caption animations, and the line-through decoration. A JSX prop rejects the old spelling with an error naming the
 * new one; the free-code easing helpers still take an old easing name, with a warning.
 */
export const RESPELLED_VALUES: Readonly<Record<string, string>> = {
  "color-dodge": "colorDodge",
  "color-burn": "colorBurn",
  "hard-light": "hardLight",
  "soft-light": "softLight",
  "linear-dodge": "linearDodge",
  "ease-in": "easeIn",
  "ease-out": "easeOut",
  "ease-in-out": "easeInOut",
  "slide-up": "slideUp",
  "slide-down": "slideDown",
  "slide-left": "slideLeft",
  "slide-right": "slideRight",
  "word-by-word": "wordByWord",
  "word-highlight": "wordHighlight",
  "wipe-left": "wipeLeft",
  "wipe-right": "wipeRight",
  "wipe-up": "wipeUp",
  "wipe-down": "wipeDown",
  "reveal-center": "revealCenter",
  "reveal-edges": "revealEdges",
  "flip-horizontal": "flipHorizontal",
  "flip-vertical": "flipVertical",
  "line-through": "lineThrough",
};

export const zTrackLayout = z.enum(TRACK_LAYOUTS);
export const zTrackRole = z.enum(TRACK_ROLES);
export const zFitMode = z.enum(FIT_MODES);
export const zBlendMode = z.enum(BLEND_MODES);
export const zEasing = z.enum(EASINGS);
export const zTransitionType = z.enum(TRANSITION_TYPES);
export const zVideoEffectType = z.enum(VIDEO_EFFECT_TYPES);
export const zTextAnimationType = z.enum(TEXT_ANIMATION_TYPES);
export const zCaptionAnimation = z.enum(CAPTION_ANIMATIONS);
export const zEntranceAnimation = z.enum(ENTRANCE_ANIMATIONS);
export const zShapeType = z.enum(SHAPE_TYPES);
export const zKeyframeProperty = z.string().refine(isKeyframeProperty, "not a property a key can animate");

export type TrackLayout = (typeof TRACK_LAYOUTS)[number];
export type TrackRole = (typeof TRACK_ROLES)[number];
export type FitMode = (typeof FIT_MODES)[number];
export type BlendMode = (typeof BLEND_MODES)[number];
export type Easing = (typeof EASINGS)[number];
export type TrackFlag = (typeof TRACK_FLAGS)[number];
