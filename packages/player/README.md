<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/cutcraft/main/docs/public/logo.svg" width="64" alt="CutCraft"></p>

# @cutcraft/player

Plays a [CutCraft](https://prefix-tree.github.io/cutcraft/) video file in the browser. Footage is decoded with
WebCodecs through [mediabunny](https://mediabunny.dev) and drawn on one canvas, overlays are React DOM on top of it,
and Web Audio mixes the sound and keeps the time.

```sh
npm install @cutcraft/player @cutcraft/kit react react-dom
```

```tsx
import { collectModule, resolve } from "@cutcraft/kit";
import { Player } from "@cutcraft/player";
import "@cutcraft/player/fonts.css";
import * as file from "./video";

const state = resolve(collectModule(file), manifest);

<Player state={state} element={file.default(file.defaults)} media={{ interview: blob, bed: "/bed.ogg" }} controls />
```

`media` maps asset ids to Blobs or URLs, or you can pass your own `MediaResolver`. `element` is the rendered file; the
player needs it to draw what is inside each `<Layer>`.

## What you get

- Frame-exact seeking. `seekTo(t)` draws the frame for `t` whether the player is paused or playing.
- Smooth scrubbing and trimming. A drag repaints from frames already decoded, then fetches the exact frame once the
  pointer rests.
- Playback from 0.25× to 4× and looped, with speed ramps and freeze frames and their sound.
- A clock that does not drift: time comes from `AudioContext.currentTime`.
- Every overlay carries `data-el` and `data-kind`, and the root carries `data-time` and `data-frame`, so tests and
  agents can find things on screen.
- `captureSheet(times, { columns })` returns a labelled contact sheet of frames, a quick way to check a cut without
  exporting it.

## API

`<Player>` takes `state`, `element`, `media`, `controls`, `loop`, `autoPlay`, `initiallyMuted`, `playbackRate`, `fit`,
`onError` and `onFrame`, and exposes a `PlayerRef`. Hooks: `usePlayer`, `useCompositionTime`, `useCompositionFrame`, `useLayerT`.
Mounting a player makes the kit's `useT()` and `useLayer()` return the current time.

`PlayerCore` is the same player without React: `play`, `pause`, `toggle`, `seekTo`, `seekToFrame`, `renderFrame`,
`captureSheet`, `getCurrentTime`, `getCurrentFrame`, `isPlaying`, `duration`, `playbackRate`, `loop`, `muted`,
`volume`, `setState`, `attachCanvas`, `subscribeTime`, `dispose`, and the events `frameupdate`, `play`, `pause`,
`seeked`, `ended`, `ratechange`, `volumechange` and `error`. Every browser dependency (clock, audio output, canvas,
decoders) can be swapped out, which is how its tests run in jsdom.

## Not drawn yet

Some props are accepted but not drawn yet: transition types other than crossfade, dips, wipe, slide and push (shown as
a crossfade), effects with no CSS filter (vignette and grain do draw), colour wheels, curves and LUTs, matte masks,
audio effects, pitch correction, 3D text and most text animation presets (shown as a fade). The kit's lint flags them
in the file. [What renders](https://prefix-tree.github.io/cutcraft/reference/rendering) has the full table.

## Docs

- [Rendering](https://prefix-tree.github.io/cutcraft/guide/rendering)
- [Writing a file](https://prefix-tree.github.io/cutcraft/guide/writing-files)

MIT licensed.
