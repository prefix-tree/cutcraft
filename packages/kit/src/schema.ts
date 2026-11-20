// The vocabulary as data, for tools: every element's schema and capabilities, the enums, the effect and transition
// registries, themes and fonts as the resolver reads them, the easing curves, and the hooks a host installs to draw
// free code. A video file imports `@uberscene/kit`; this entry is for the resolver, the player and editors.

export { COMPONENT_NAMES, COMPONENTS, type ComponentEntry } from "./components/index";
export * from "./easing";
export { type GaussOutside, type GaussWhat, gaussScale, gaussSources, gaussSteps } from "./effects/gauss";
export {
  BUILT_IN_SHADERS,
  BUILT_IN_TRANSITIONS,
  builtInShader,
  builtInTransition,
  cssOf,
  EFFECT_FAMILIES,
  EFFECTS,
  type EffectDraw,
  type EffectEntry,
  type EffectParams,
  effectEntry,
  isNeutral,
  POST_EFFECTS,
  SHADER_ONLY_EFFECTS,
  TRANSITION_FAMILIES,
  TRANSITIONS,
  type TransitionEntry,
  type TransitionParams,
} from "./effects/registry";
export { type ColourFunction, fusedColourSource } from "./effects/shapes";
export { BLOCK_ASPECTS } from "./jsx/block-meta";
export * from "./jsx/capabilities";
export * from "./jsx/curves";
export * from "./jsx/define";
export * from "./jsx/effect-params";
export * from "./jsx/elements";
export * from "./jsx/engines";
export * from "./jsx/enums";
export { knobsOf } from "./jsx/knobs";
export * from "./jsx/rendering";
export { BOX_ORIGIN_POINT, BOX_ORIGINS, type BoxOrigin, type ElementBox, type Transform } from "./jsx/schemas/common";
export { defaultTransitionParams, isBuiltInTransition, TRANSITION_PARAMS } from "./jsx/schemas/transition";
export * from "./jsx/shaders";
export { installLayerClock } from "./jsx/use-t";
export * from "./theme";
