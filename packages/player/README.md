<p align="center"><img src="../../docs/public/logo.svg" width="64" alt="cutcut logo"></p>

# @cutcut/player

The browser player for cut files. It takes a `ResolvedState` from `@cutcut/kit`
and plays it: footage decoded with WebCodecs through mediabunny and composited
on one canvas, overlays rendered as React DOM above it, sound mixed and
clocked by Web Audio. The editor's preview and the model's filmstrip drive the
same `PlayerCore`; the export (`@cutcut/render`) runs the same engine in Node
through `@cutcut/player/engine` and `@cutcut/player/overlays`, which have no
React layer, DOM or Web Audio in them.

```tsx
import { collectModule, resolve } from "@cutcut/kit";
import { Player } from "@cutcut/player";
import * as file from "./video";          // the TSX file the model wrote

const state = resolve(collectModule(file), manifest);
<Player state={state} element={file.default(file.defaults)} media={{ interview: blob, bed: "/bed.ogg" }} controls />
```

`media` maps asset ids to Blobs or URLs (or implements `MediaResolver`).
`element` is only needed for `<Layer>` interiors, which the resolver drops.

## What it does

- **Clock.** Composition time is an anchor on `AudioContext.currentTime`
  (`anchorTime + (now − anchorClock) × rate`), re-anchored on play, pause, seek
  and rate change; it never accumulates drift. The render loop is
  `requestAnimationFrame`; a tick that lands while a frame is in flight is
  coalesced, and a tick on the same frame index only keeps decoders prefetching.
- **Decoding.** One mediabunny `Input` per asset, shared by every clip of it
  and by nested compositions, ref-counted and closed when idle. Each clip near
  the play head has a `ClipDecoder`: a `VideoSampleSink` stream feeding a
  short queue for forward play, pre-decoded windows for reverse, single-frame
  fetches at high speeds and while scrubbing, one retained frame per freeze.
  A playing tick never waits for a frame; a seek does. A trim or speed drag
  updates the decoder in place rather than reopening it, and a paused preview
  repaints each drag step with what is decoded, then fetches the exact frame
  once the gesture has been quiet for 120 ms.
- **Compositing.** `buildFramePlan(state, t)` is pure and deterministic: tracks
  in document order (the first track is the bottom), each clip with its
  animated transform, crop, fit, opacity, blend, filter and mask; crossfades
  fade the incoming clip over the outgoing one; adjustments re-filter what is
  below them. `CanvasPainter` executes it. Titles, shapes, SVG, stickers,
  layers and captions are DOM elements positioned with the same matrix math.
- **Audio.** `buildAudioPlan` lists every audio-bearing chunk in a window with
  its gain envelope (volume, fades, automation, ducking, keyframes, mute and
  solo). `AudioEngine` schedules each chunk once per play session, 200 ms
  ahead, as an `AudioBufferSourceNode` with the right offset, duration and
  `playbackRate = clipSpeed × rate`; PCM is decoded per source range with
  `AudioBufferSink` and cached. Pause stops everything; seek reschedules once.
- **Addressability.** Every DOM element carries `data-el` and `data-kind`; the
  root carries `data-time` and `data-frame`; the canvas is
  `[data-el="composition"]`.
- **Determinism.** `seekTo(t)` and `renderFrame(t)` draw the exact frame for
  `t`, paused or playing. The exporter steps through frames with
  `Compositor.step(t)`, which keeps every decoder streaming.
- **Looking at the result.** `captureSheet(times, { columns })` returns a
  labelled contact sheet of those frames, the way an agent or a test checks
  a cut without exporting.

## API

`PlayerCore` (framework-free): `play`, `pause`, `toggle`, `seekTo`,
`seekToFrame`, `renderFrame`, `captureSheet`, `getCurrentTime`,
`getCurrentFrame`, `isPlaying`, `duration`, `playbackRate` (0.25–4), `loop`, `muted`, `volume`,
`setState`, `attachCanvas`, `addEventListener` (`frameupdate`, `play`,
`pause`, `seeked`, `ended`, `ratechange`, `volumechange`, `error`),
`subscribeTime`, `dispose`. Every browser dependency is injectable
(`clock`, `audioOutput`, `frameSourceFactory`, `audioSourceFactory`,
`createCanvas`, `raf`, `setInterval`), which is how the unit tests run in jsdom.

React: `<Player>` with `controls`, `loop`, `autoPlay`, `initiallyMuted`,
`playbackRate`, `fit`, `onError`, `onFrame` and a `PlayerRef`; hooks
`usePlayer`, `useCompositionTime`, `useCompositionFrame`, `useLayerT`.
Mounting a Player installs the kit's `useT()` and `useLayer()`.

## Not rendered yet

Transition types other than crossfade (drawn as a crossfade), effects that
have no CSS filter equivalent (vignette, grain, sharpen, glow, …),
colour wheels, curves and LUTs, matte masks, audio effects, pitch correction,
3D text, most text animation presets (shown as a fade),
`background.mode: "blur"`, sticker packs and `file:` nested references. The
kit's `not-rendered` lint warning reports these in the file before anything
plays, from the same table (`RENDERED_*` in `@cutcut/kit`) the player reads.

## Tests

```
pnpm --filter @cutcut/player test        # vitest over jsdom with fakes (part of `pnpm check`)
pnpm --filter @cutcut/player test:e2e    # Playwright: ffmpeg-generated media, Vite, headless Chromium
```

The browser suite generates `bars.webm` (frame number encoded in a binary
strip), `tone.ogg`, `logo.png` and `solid.webm` into `e2e/app/public/`, then
checks seek accuracy, real-time playback on the audio clock, rate changes,
crossfade blending, DOM overlays and `useT`, image clips, ended/loop and
determinism. It needs `ffmpeg` and Playwright's Chromium (pinned to 1.56.1 to
match the preinstalled browser).
