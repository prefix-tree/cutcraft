// What an editor shows for a <Graphic>'s own props, read from its kind's schema.
export { type GraphicControl, graphicControls } from "@cutcraft/graphics";

export * from "./actions/executor";
export * from "./actions/handler-kit";
export * from "./actions/history";
export * from "./actions/registry";
export * from "./actions/types";
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
  POST_EFFECTS,
  SHADER_ONLY_EFFECTS,
  TRANSITION_FAMILIES,
  TRANSITIONS,
  type TransitionEntry,
  type TransitionParams,
} from "./effects/registry";
export * from "./jsx/animate";
export * from "./jsx/capabilities";
export * from "./jsx/curves";
export * from "./jsx/define";
export * from "./jsx/effect-params";
export * from "./jsx/elements";
export * from "./jsx/engines";
export * from "./jsx/enums";
export * from "./jsx/rendering";
export type { Transform } from "./jsx/schemas/common";
export type { ThreeFrameArgs, ThreeSetupArgs, ThreeSetupFunction } from "./jsx/schemas/overlays";
export { defaultTransitionParams, TRANSITION_PARAMS } from "./jsx/schemas/transition";
export * from "./jsx/shaders";
export * from "./jsx/use-t";
export * from "./manifest/cube";
export * from "./manifest/timeref";
export * from "./manifest/transcript";
export * from "./manifest/types";
export * from "./patches/log";
export * from "./patches/types";
export * from "./resolve/captions";
export * from "./resolve/collect";
export * from "./resolve/errors";
export * from "./resolve/resolve";
export * from "./resolve/scene";
export * from "./resolve/speed";
export * from "./resolve/subtitles";
export * from "./resolve/tree";
export * from "./theme";

import "./actions/handlers";
