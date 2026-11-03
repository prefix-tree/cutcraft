import { z } from "zod";

// Every list is adopted from OpenReel's core so the two editors agree on names.

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

export const TRANSITION_TYPES = [
  "crossfade",
  "dipToBlack",
  "dipToWhite",
  "wipe",
  "slide",
  "zoom",
  "push",
  "circleReveal",
  "blur",
  "whipPan",
  "radialWipe",
  "pixelate",
  "glitch",
  "blinds",
  "diamondReveal",
  "spin",
  "flip",
  "splitReveal",
  "flash",
  "filmBurn",
  "mosaic",
  "ripple",
  "pageTurn",
  "colorSplit",
] as const;

export const VIDEO_EFFECT_TYPES = [
  "brightness",
  "contrast",
  "saturation",
  "hue",
  "temperature",
  "tint",
  "blur",
  "sharpen",
  "vignette",
  "grain",
  "shadow",
  "glow",
  "motion-blur",
  "radial-blur",
  "chromatic-aberration",
  "grayscale",
  "sepia",
  "invert",
  "levels",
  "hue-saturation",
] as const;

export const AUDIO_EFFECT_TYPES = [
  "gain",
  "pan",
  "eq",
  "compressor",
  "reverb",
  "delay",
  "noiseReduction",
  "fadeIn",
  "fadeOut",
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
  "blur",
  "bounce",
  "rotate",
  "pop",
  "flip",
  "split",
  "word-by-word",
  "rise",
  "drop",
  "elastic",
  "swing",
  "zoom-blur",
  "cascade",
  "wave",
  "shake",
  "rainbow",
  "glitch",
] as const;

export const CAPTION_ANIMATIONS = [
  "none",
  "word-highlight",
  "word-by-word",
  "karaoke",
  "bounce",
  "typewriter",
] as const;

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

export const EMPHASIS_ANIMATIONS = [
  "none",
  "pulse",
  "shake",
  "bounce",
  "float",
  "spin",
  "flash",
  "heartbeat",
  "swing",
  "wobble",
  "jello",
  "rubber-band",
  "tada",
  "vibrate",
  "flicker",
  "glow",
  "breathe",
  "wave",
  "tilt",
  "zoom-pulse",
  "focus-zoom",
  "pan-left",
  "pan-right",
  "pan-up",
  "pan-down",
  "ken-burns",
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
  "transform.position.z",
  "transform.scale.x",
  "transform.scale.y",
  "transform.rotation",
  "transform.rotation.x",
  "transform.rotation.y",
  "transform.perspective",
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
  "path",
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
export const MASK_TYPES = ["shape", "drawn", "matte"] as const;
export const MATTE_CHANNELS = ["alpha", "luminance", "bounds"] as const;
export const INTERPOLATION_QUALITIES = ["low", "medium", "high"] as const;
export const STABILIZE_CROP_MODES = ["auto", "none"] as const;
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
export const zAudioEffectType = z.enum(AUDIO_EFFECT_TYPES);
export const zTextAnimationPreset = z.enum(TEXT_ANIMATION_PRESETS);
export const zCaptionAnimation = z.enum(CAPTION_ANIMATIONS);
export const zGraphicAnimation = z.enum(GRAPHIC_ANIMATIONS);
export const zEmphasisAnimation = z.enum(EMPHASIS_ANIMATIONS);
export const zShapeType = z.enum(SHAPE_TYPES);
export const zKeyframeProperty = z.string().refine(isKeyframeProperty, "unknown keyframe property");

export type TrackLayout = (typeof TRACK_LAYOUTS)[number];
export type TrackRole = (typeof TRACK_ROLES)[number];
export type FitMode = (typeof FIT_MODES)[number];
export type BlendMode = (typeof BLEND_MODES)[number];
export type Easing = (typeof EASINGS)[number];
export type TransitionType = (typeof TRANSITION_TYPES)[number];
export type VideoEffectType = (typeof VIDEO_EFFECT_TYPES)[number];
export type AudioEffectType = (typeof AUDIO_EFFECT_TYPES)[number];
export type TrackFlag = (typeof TRACK_FLAGS)[number];
