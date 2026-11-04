# Player

`@cutcraft/player` plays a file in the browser. It's the preview in an editor, and it works as a plain video player
on a page too.

```sh
npm install @cutcraft/player @cutcraft/kit react react-dom
```

```tsx
import { collectModule, resolve } from "@cutcraft/kit";
import { Player } from "@cutcraft/player";
import "@cutcraft/player/fonts.css";
import * as file from "./video";

const state = resolve(collectModule(file), manifest);

<Player state={state} element={file.default(file.defaults)} media={{ founder: blob, music: "/music.ogg" }} controls />
```

- `state` is the resolved file: every element placed in time.
- `element` is the rendered component. The player needs it to draw what is inside each `<Layer>`.
- `media` maps asset ids to Blobs or URLs, or you pass your own `MediaResolver`.
  A font the file declares with `font({ src: "asset:brand" })` is looked up the same way, as `brand`
  ([Fonts](./themes#fonts)); `ref.current.core.fontsReady` resolves once the file's fonts have loaded.

### Files with `<Three>` or `<Motion>`

The player draws them once the page has installed their engines. Call `installFreeCodeLibraries()` from
`@cutcraft/graphics` once, before the player mounts; without it those layers stay empty and the console says which
engine is missing.

```sh
npm install @cutcraft/graphics   # brings three.js, React Three Fiber and Motion with it
```

```tsx
import { installFreeCodeLibraries } from "@cutcraft/graphics/libraries";

installFreeCodeLibraries();
```

### A file loaded as text

For a file that arrives at run time (one a model just wrote, say), use `loadModule` from `@cutcraft/kit/source` in
place of the `import`. Pass it what `installFreeCodeLibraries()` returns, so the file may import three.js and Motion
too; the export loads files the same way, so a file that plays here also exports.

```tsx
import { installFreeCodeLibraries } from "@cutcraft/graphics/libraries";
import { collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const imports = installFreeCodeLibraries();
const file = loadModule(sourceText, { imports });
const state = resolve(collectModule(file), manifest);

<Player state={state} element={file.default(file.defaults ?? {})} media={media} controls />;
```

[Free code](./free-code#libraries) covers offering other libraries.

## How it draws

Footage is decoded with WebCodecs through [mediabunny](https://mediabunny.dev) and drawn on one canvas, tracks in the
order they are written, so the first track is at the bottom. Transitions, keyframes, crops, masks, blend modes and
filters are applied there. Titles, shapes, SVG, stickers, graphics, layers and captions are DOM elements above the
canvas, positioned with the same maths. A track placed below every footage track draws beneath it.

Sound is mixed with Web Audio, which is also the clock: the current time comes from `AudioContext.currentTime`, so
playback doesn't drift.

## Seeking is exact

`seekTo(t)` and `renderFrame(t)` draw exactly the frame for `t`, whether the player is paused or playing. While you
drag a clip's edge, the preview repaints from frames already decoded and fetches the exact frame once the pointer
rests.

## Looking at the result

`captureSheet(times, { columns, cellWidth, labels })` returns one canvas with a labelled cell per time. It is a quick
way for a test, or an agent, to check a cut without exporting: the first frame of each clip and the frames around each
join. The sheet holds the canvas only; titles and layers are in the DOM.

## Finding things on screen

Every DOM element the player draws carries `data-el` (the element's id) and `data-kind`, the root carries `data-time`
and `data-frame`, and the canvas is `[data-el="composition"]`. An editor can select and drag preview elements by the
same ids the file uses.

## Without React

`PlayerCore` is the same player without React: `play`, `pause`, `seekTo`, `renderFrame`, `captureSheet`,
`playbackRate`, `loop`, `volume`, `setState` and events such as `frameupdate`, `seeked` and `ended`. Every browser
dependency (clock, audio output, canvas, decoders) can be replaced, which is how its tests run without a browser.

[API](/reference/api#cutcraft-player) lists every prop, method and event. What isn't drawn yet is in
[What renders](/reference/rendering).
