// What a video file imports: the elements, the ready-made components and diagram parts, the hooks and helpers free
// code uses on the video's clock, fonts, themes, schema knobs and block descriptions. Tools that read, resolve or edit
// a file use `@uberscene/kit/schema` for the vocabulary as data and `@uberscene/sdk` for the rest.
export * from "./components/index";
export * from "./diagram/index";
export { builtInShader } from "./effects/registry";
export {
  type Extrapolate,
  type InterpolateOptions,
  interpolate,
  random,
  type SpringOptions,
  spring,
  stepAt,
} from "./jsx/animate";
export { type BlockMeta, blockMetaSchema } from "./jsx/block-meta";
export {
  Adjustment,
  Angle,
  Audio,
  Caption,
  Captions,
  Clip,
  Composition,
  Cut,
  Effect,
  type EffectComponent,
  type EffectParamsOf,
  Freeze,
  Gap,
  Keyframe,
  Layer,
  Marker,
  Mask,
  Motion,
  Multicam,
  Nested,
  Shape,
  SpeedKey,
  Sticker,
  Svg,
  Three,
  Title,
  Track,
  Transition,
  type TransitionComponent,
  type TransitionParamsOf,
} from "./jsx/elements";
export { holdLayerFrame } from "./jsx/engines";
export { type Knob, type KnobKind, knob } from "./jsx/knobs";
export * from "./jsx/narrate";
export type { ThreeFrameArgs, ThreeSetupArgs, ThreeSetupFunction } from "./jsx/schemas/overlays";
export { type EffectRef, effect, type TransitionRef, transition } from "./jsx/shaders";
export * from "./jsx/use-seekable";
export { type LayerClock, useLayer, useT } from "./jsx/use-t";
export { THEME_NAMES, THEMES, type ThemeName } from "./theme/builtins";
export { themeCss } from "./theme/css";
export { type FontRef, font, fontFamily, googleFont } from "./theme/fonts";
export type { ThemeInput } from "./theme/schema";
