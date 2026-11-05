import { z } from "zod";

// Every value here is drawn by the player and the export: a type the renderers do not draw is not offered.

export const TRACK_LAYOUTS = ["sequence", "free"] as const;
export const TRACK_ROLES = ["general", "captions", "dialogue", "music", "effects", "ambience"] as const;

export const FIT_MODES = ["contain", "cover", "stretch", "none"] as const;

export const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
  "add",
  "linear-dodge",
] as const;

export const EASINGS = [
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
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

export const MASK_EASINGS = ["linear", "ease-in", "ease-out", "ease-in-out"] as const;

export const TRANSITION_TYPES = ["crossfade", "dipToBlack", "dipToWhite", "wipe", "slide", "push"] as const;

export const VIDEO_EFFECT_TYPES = [
  "brightness",
  "contrast",
  "saturation",
  "hue",
  "temperature",
  "tint",
  "blur",
  "vignette",
  "grain",
  "shadow",
  "grayscale",
  "sepia",
  "invert",
  "levels",
  "lut",
] as const;

export const TEXT_ANIMATION_PRESETS = [
  "none",
  "typewriter",
  "fade",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "scale",
  "word-by-word",
] as const;

export const CAPTION_ANIMATIONS = ["none", "word-highlight", "word-by-word", "karaoke", "typewriter"] as const;

export const GRAPHIC_ANIMATIONS = [
  "none",
  "fade",
  "slide-left",
  "slide-right",
  "slide-up",
  "slide-down",
  "scale",
  "rotate",
  "bounce",
  "pop",
  "draw",
  "wipe-left",
  "wipe-right",
  "wipe-up",
  "wipe-down",
  "reveal-center",
  "reveal-edges",
  "elastic",
  "flip-horizontal",
  "flip-vertical",
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
  "transform.position.x",
  "transform.position.y",
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
  "colorGrade.temperature",
  "colorGrade.tint",
] as const;

/** `effect.<effectId>.<param>` is also a valid keyframe property; see `isKeyframeProperty`. */
export const KEYFRAME_PROPERTY_PATTERN = /^(effect\.[A-Za-z0-9_-]+\.[A-Za-z0-9_]+)$/;

export function isKeyframeProperty(value: string): boolean {
  return (KEYFRAME_PROPERTIES as readonly string[]).includes(value) || KEYFRAME_PROPERTY_PATTERN.test(value);
}

export const CAPTION_POSITIONS = ["top", "center", "bottom"] as const;
export const TEXT_ALIGNS = ["left", "center", "right", "justify"] as const;
export const TEXT_VALIGNS = ["top", "middle", "bottom"] as const;
export const TEXT_DECORATIONS = ["none", "underline", "line-through", "overline"] as const;
export const ANIMATION_UNITS = ["character", "word", "line"] as const;
export const MASK_TYPES = ["shape", "drawn"] as const;
export const SVG_COLOR_MODES = ["none", "tint", "replace"] as const;
export const AUTOMATION_LANES = ["volume", "pan"] as const;
export const TRACK_FLAGS = ["locked", "hidden", "muted", "solo"] as const;

export const zTrackLayout = z.enum(TRACK_LAYOUTS);
export const zTrackRole = z.enum(TRACK_ROLES);
export const zFitMode = z.enum(FIT_MODES);
export const zBlendMode = z.enum(BLEND_MODES);
export const zEasing = z.enum(EASINGS);
export const zMaskEasing = z.enum(MASK_EASINGS);
export const zTransitionType = z.enum(TRANSITION_TYPES);
export const zVideoEffectType = z.enum(VIDEO_EFFECT_TYPES);
export const zTextAnimationPreset = z.enum(TEXT_ANIMATION_PRESETS);
export const zCaptionAnimation = z.enum(CAPTION_ANIMATIONS);
export const zGraphicAnimation = z.enum(GRAPHIC_ANIMATIONS);
export const zShapeType = z.enum(SHAPE_TYPES);
export const zKeyframeProperty = z.string().refine(isKeyframeProperty, "unknown keyframe property");

export type TrackLayout = (typeof TRACK_LAYOUTS)[number];
export type TrackRole = (typeof TRACK_ROLES)[number];
export type FitMode = (typeof FIT_MODES)[number];
export type BlendMode = (typeof BLEND_MODES)[number];
export type Easing = (typeof EASINGS)[number];
export type TransitionType = (typeof TRANSITION_TYPES)[number];
export type VideoEffectType = (typeof VIDEO_EFFECT_TYPES)[number];
export type TrackFlag = (typeof TRACK_FLAGS)[number];
