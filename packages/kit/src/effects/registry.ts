// Every built-in effect and transition, once: its name, the strict schema of its params, and how it draws. The type
// lists, the shader lists, the transition params and the CSS fallbacks are all read from here, so a new effect is one
// entry. The order is the order the reference and the editor list them in.
import { z } from "zod";

import type { ShaderDefinition } from "../jsx/shader-definition";
import { curves, duotone, exposure, levels, lut, shadowsHighlights, vibrance, whiteBalance } from "./colour";
import * as cssEffects from "./css";
import { FALLBACKS } from "./css";
import { chromaticAberration, colorKey, cornerPin, regionBlur, zoomBlur } from "./footage";
import { grain, vignette } from "./post";
import { blinds, clockWipe, filmBurn, iris, pixelDissolve, zoom } from "./shader-transitions";
import { bevel, glow, longShadow, outline } from "./titles";

type Params = Readonly<Record<string, unknown>>;

/** How a built-in effect draws. */
export type EffectDraw =
  /** As a CSS filter. */
  | { readonly kind: "css"; readonly css: (p: Params) => string }
  /** As shader passes, with a CSS filter to fall back on where the shader cannot run, if it has one. */
  | { readonly kind: "shader"; readonly shader: ShaderDefinition; readonly css?: (p: Params) => string }
  /** By the painter, over the element's own pixels after it (vignette, grain). */
  | { readonly kind: "post" };

export interface EffectEntry {
  readonly name: string;
  readonly params: z.ZodObject;
  readonly draw: EffectDraw;
}

export interface TransitionEntry {
  readonly name: string;
  readonly params: z.ZodObject;
  /** `look`: drawn by the player's own transition looks (fades, wipes, slides); `shader`: by a shader. */
  readonly draw: { readonly kind: "look" } | { readonly kind: "shader"; readonly shader: ShaderDefinition };
}

const cssEntry = (name: string, e: cssEffects.CssEffect): EffectEntry => ({
  name,
  params: e.params,
  draw: { kind: "css", css: e.css },
});

/** A shader effect with strict params (an unknown param is an error, not dropped), and its CSS fallback if it has one. */
function shaderEntry(def: ShaderDefinition, css?: (p: Params) => string): EffectEntry {
  const strict = { ...def, params: def.params.strict() };
  return { name: def.name, params: strict.params, draw: { kind: "shader", shader: strict, ...(css ? { css } : {}) } };
}

export const EFFECTS = {
  brightness: cssEntry("brightness", cssEffects.brightness),
  contrast: cssEntry("contrast", cssEffects.contrast),
  saturation: cssEntry("saturation", cssEffects.saturation),
  hue: cssEntry("hue", cssEffects.hue),
  temperature: cssEntry("temperature", cssEffects.temperature),
  tint: cssEntry("tint", cssEffects.tint),
  blur: cssEntry("blur", cssEffects.blur),
  vignette: { name: "vignette", params: vignette.params, draw: { kind: "post" } },
  grain: { name: "grain", params: grain.params, draw: { kind: "post" } },
  shadow: cssEntry("shadow", cssEffects.shadow),
  grayscale: cssEntry("grayscale", cssEffects.grayscale),
  sepia: cssEntry("sepia", cssEffects.sepia),
  invert: cssEntry("invert", cssEffects.invert),
  levels: shaderEntry(levels, FALLBACKS.levels),
  lut: shaderEntry(lut),
  exposure: shaderEntry(exposure, FALLBACKS.exposure),
  vibrance: shaderEntry(vibrance, FALLBACKS.vibrance),
  whiteBalance: shaderEntry(whiteBalance),
  shadowsHighlights: shaderEntry(shadowsHighlights),
  duotone: shaderEntry(duotone),
  curves: shaderEntry(curves),
  colorKey: shaderEntry(colorKey),
  regionBlur: shaderEntry(regionBlur),
  cornerPin: shaderEntry(cornerPin),
  zoomBlur: shaderEntry(zoomBlur),
  chromaticAberration: shaderEntry(chromaticAberration),
  glow: shaderEntry(glow, FALLBACKS.glow),
  outline: shaderEntry(outline),
  longShadow: shaderEntry(longShadow),
  bevel: shaderEntry(bevel),
} as const satisfies Record<string, EffectEntry>;

const dir4 = z.enum(["left", "right", "up", "down"]);
const look = (name: string, params: z.ZodObject): TransitionEntry => ({ name, params, draw: { kind: "look" } });
const shaderTransition = (def: ShaderDefinition): TransitionEntry => {
  const strict = { ...def, params: def.params.strict() };
  return { name: def.name, params: strict.params, draw: { kind: "shader", shader: strict } };
};

export const TRANSITIONS = {
  crossfade: look(
    "crossfade",
    z.strictObject({ curve: z.enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]).default("ease") }),
  ),
  dipToBlack: look("dipToBlack", z.strictObject({ holdDuration: z.number().min(0).max(30).default(0.1) })),
  dipToWhite: look("dipToWhite", z.strictObject({ holdDuration: z.number().min(0).max(30).default(0.1) })),
  wipe: look("wipe", z.strictObject({ direction: dir4.default("left") })),
  slide: look("slide", z.strictObject({ direction: dir4.default("left"), pushOut: z.boolean().default(false) })),
  push: look("push", z.strictObject({ direction: dir4.default("left") })),
  iris: shaderTransition(iris),
  clockWipe: shaderTransition(clockWipe),
  blinds: shaderTransition(blinds),
  filmBurn: shaderTransition(filmBurn),
  pixelDissolve: shaderTransition(pixelDissolve),
  zoom: shaderTransition(zoom),
} as const satisfies Record<string, TransitionEntry>;

export type VideoEffectType = keyof typeof EFFECTS;

/** The effects by family, for the reference and the editor's menus. Every effect is in exactly one. */
export const EFFECT_FAMILIES: Readonly<Record<string, readonly VideoEffectType[]>> = {
  "Basic adjustments": [
    "brightness",
    "contrast",
    "saturation",
    "hue",
    "temperature",
    "tint",
    "grayscale",
    "sepia",
    "invert",
    "blur",
    "shadow",
  ],
  "Vignette and grain": ["vignette", "grain"],
  Colour: ["levels", "lut", "exposure", "vibrance", "whiteBalance", "shadowsHighlights", "duotone", "curves"],
  Footage: ["colorKey", "regionBlur", "cornerPin", "zoomBlur", "chromaticAberration"],
  "Titles and shapes": ["glow", "outline", "longShadow", "bevel"],
};
export type TransitionType = keyof typeof TRANSITIONS;

/** The transitions by family. Every transition is in exactly one. */
export const TRANSITION_FAMILIES: Readonly<Record<string, readonly TransitionType[]>> = {
  "Fades, wipes and slides": ["crossfade", "dipToBlack", "dipToWhite", "wipe", "slide", "push"],
  Shaders: ["iris", "clockWipe", "blinds", "filmBurn", "pixelDissolve", "zoom"],
};

/** The built-in effect types, in the registry's order. */
export const VIDEO_EFFECT_TYPES = Object.keys(EFFECTS) as [VideoEffectType, ...VideoEffectType[]];
/** The built-in transition types, in the registry's order. */
export const TRANSITION_TYPES = Object.keys(TRANSITIONS) as [TransitionType, ...TransitionType[]];

const effectEntries: readonly EffectEntry[] = Object.values(EFFECTS);
const transitionEntries: readonly TransitionEntry[] = Object.values(TRANSITIONS);

/** The built-in effect of a type, if there is one. */
export function effectEntry(type: unknown): EffectEntry | undefined {
  return typeof type === "string" && Object.hasOwn(EFFECTS, type) ? EFFECTS[type as VideoEffectType] : undefined;
}

/** The built-in effects drawn by a shader. */
export const BUILT_IN_SHADERS: readonly ShaderDefinition[] = effectEntries.flatMap((e) =>
  e.draw.kind === "shader" ? [e.draw.shader] : [],
);
/** The built-in transitions drawn by a shader. */
export const BUILT_IN_TRANSITIONS: readonly ShaderDefinition[] = transitionEntries.flatMap((t) =>
  t.draw.kind === "shader" ? [t.draw.shader] : [],
);
/** Built-in shader effects with no CSS filter to fall back on: without WebGL they are not drawn. */
export const SHADER_ONLY_EFFECTS: readonly string[] = effectEntries
  .filter((e) => e.draw.kind === "shader" && !e.draw.css)
  .map((e) => e.name);
/** Effects the painter draws over the element after it. */
export const POST_EFFECTS: readonly string[] = effectEntries.filter((e) => e.draw.kind === "post").map((e) => e.name);

/** The built-in shader of an effect type, if it has one. */
export function builtInShader(type: unknown): ShaderDefinition | undefined {
  const draw = effectEntry(type)?.draw;
  return draw?.kind === "shader" ? draw.shader : undefined;
}

/** The built-in shader transition of a type, if it has one. */
export function builtInTransition(type: unknown): ShaderDefinition | undefined {
  const entry =
    typeof type === "string" && Object.hasOwn(TRANSITIONS, type) ? TRANSITIONS[type as TransitionType] : undefined;
  return entry?.draw.kind === "shader" ? entry.draw.shader : undefined;
}

/** The CSS filter a built-in effect draws as: its own, or its shader's fallback; undefined for one that has none. */
export function cssOf(type: unknown): ((p: Params) => string) | undefined {
  const draw = effectEntry(type)?.draw;
  return draw?.kind === "css" ? draw.css : draw?.kind === "shader" ? draw.css : undefined;
}

/** Per-type params schemas of the built-in transitions. */
export const TRANSITION_PARAMS: Readonly<Record<TransitionType, z.ZodObject>> = Object.fromEntries(
  Object.entries(TRANSITIONS).map(([k, t]) => [k, t.params]),
) as Record<TransitionType, z.ZodObject>;
