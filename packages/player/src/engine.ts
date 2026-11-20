/**
 * The DOM-free part of the player, for a renderer: the frame and audio plans, the compositor and painter, the
 * decoder pool and the mediabunny sources. Nothing here imports React or touches `document`, `window` or an
 * AudioContext at load time.
 */

export { ManualClock } from "./clock/clock";
export { FRAME_EPS, PICK_EPS, SETTLE_MS } from "./constants";
export { AssetSources } from "./media/asset-sources";
export { DecoderPool } from "./media/decoder-pool";
export { copyFrame, defaultCreateCanvas } from "./media/frame-source";
export { mediabunnyFrameSourceFactory } from "./media/mediabunny-frame-source";
export { MediabunnyInputs } from "./media/mediabunny-input";
export {
  type AudioOccurrence,
  buildAudioPlan,
  buildGainEnvelope,
  type GainPoint,
} from "./model/audio-plan";
export { OVERLAY_KINDS } from "./model/backdrop";
export { paramsAt } from "./model/effects";
export { buildFramePlan, type DrawOp } from "./model/frame-plan";
export { frameIndex, placementSourceTime } from "./model/time";
export { animatedBox, animatedTransform, boundsOf, type DrawRect } from "./model/transform";
export { isVisibleAt, visiblePlacements } from "./model/visible";
export { makeNestedResolver } from "./nested";
export { captionBox } from "./overlays/caption-placement";
export { Compositor } from "./render/compositor";
export { CanvasPainter, coversCanvas } from "./render/painter";
export type {
  CreateCanvas,
  Ctx2D,
  Frame,
  FrameSource,
  FrameSourceFactory,
  FrameSourceInfo,
  MediaHandle,
  MediaResolver,
} from "./types";
export { captureWarnings, devWarn } from "./warn";
