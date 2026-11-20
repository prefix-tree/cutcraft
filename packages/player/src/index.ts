// The player in the browser: the <Player> component and its ref, the PlayerCore underneath it, its events, its
// controls and hooks, and the font loader. The DOM-free model, compositor and audio plan for a renderer are in
// `@uberscene/player/engine`.
export { addFontFaces, type FontFaceSource } from "./media/fonts";
export { backdropTracks } from "./model/backdrop";
export { type CaptureSheetOptions, PlayerCore, type PlayerOptions, type TimeSnapshot } from "./player";
export { Controls } from "./react/Controls";
export { useCompositionFrame, useCompositionTime, useLayerClock, useLayerT, usePlayer } from "./react/hooks";
export { Player, type PlayerProps, type PlayerRef } from "./react/Player";
export type { MediaHandle, MediaResolver, PlayerErrorEvent, PlayerEvents } from "./types";
export { captureWarnings, devWarn } from "./warn";
