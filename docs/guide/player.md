# Player

`@cutcraft/player` plays a file in the browser. It is the preview in an editor, and it works as a plain video player
on a page too. Read this page when you embed CutCraft video in your own app.

## Play a file

Install the player with the kit and React, then give `<Player>` the resolved file, its rendered component and its
media:

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

| Prop | Is |
|---|---|
| `state` | The resolved file: every element placed in time. |
| `element` | The rendered component. The player needs it to draw what is inside each `<Layer>`. |
| `media` | A map from asset ids to Blobs or URLs, or your own `MediaResolver`. |
| `controls` | Shows the playback controls. |

A font the file declares with `font({ src: "asset:brand" })` is looked up in `media` the same way, as `brand`
([Fonts](./themes#fonts)). `ref.current.core.fontsReady` resolves once the file's fonts have loaded.

The [API reference](/reference/api#cutcraft-player) lists every prop, method and event.

## Files with `<Three>` or `<Motion>`

The player draws these once the page has installed their engines. Call `installFreeCodeLibraries()` from
`@cutcraft/graphics` once, before the player mounts:

```sh
npm install @cutcraft/graphics   # brings three.js, React Three Fiber and Motion with it
```

```tsx
import { installFreeCodeLibraries } from "@cutcraft/graphics/libraries";

installFreeCodeLibraries();
```

Without it those layers stay empty, and the console says which engine is missing.

## A file loaded as text

For a file that arrives at run time (one a model just wrote, say), use `loadModule` from `@cutcraft/kit/source` in
place of the `import`. Pass it what `installFreeCodeLibraries()` returns, so the file may import three.js and Motion
too:

```tsx
import { installFreeCodeLibraries } from "@cutcraft/graphics/libraries";
import { collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const imports = installFreeCodeLibraries();
const file = loadModule(sourceText, { imports });
const state = resolve(collectModule(file), manifest);

<Player state={state} element={file.default(file.defaults ?? {})} media={media} controls />;
```

The export loads files the same way, so a file that plays here also exports. [Free code](./free-code#libraries)
covers offering other libraries.

## Seek to an exact frame

`seekTo(t)` and `renderFrame(t)` draw exactly the frame for `t`, whether the player is paused or playing.

While you drag a clip's edge, the preview repaints from frames already decoded and fetches the exact frame once the
pointer rests.

## Select elements on the preview

The player marks what it draws with the file's own ids, so an editor can select and drag preview elements by the
same ids the file uses.

| Where | Attribute |
|---|---|
| Every DOM element the player draws | `data-el` (the element's id) and `data-kind` |
| The root | `data-time` and `data-frame` |
| The canvas | `[data-el="composition"]` |

## Check a cut without exporting

`captureSheet(times, { columns, cellWidth, labels })` returns one canvas with a labelled cell per time. It is a quick
way for a test, or an agent, to check a cut: the first frame of each clip and the frames around each join.

::: warning
The sheet holds the canvas only. Titles and layers are in the DOM, so they are not on it. For full frames, use
[`cutcraft look`](./checking#look-at-frames).
:::

## Without React

`PlayerCore` is the same player without React. It has `play`, `pause`, `seekTo`, `renderFrame`, `captureSheet`,
`playbackRate`, `loop`, `volume`, `setState`, and events such as `frameupdate`, `seeked` and `ended`.

Every browser dependency (clock, audio output, canvas, decoders) can be replaced, which is how its tests run without
a browser.

## How it draws

Footage is decoded with WebCodecs through [mediabunny](https://mediabunny.dev) and drawn on one canvas. Transitions,
keyframes, crops, masks, blend modes and filters are applied there.

Tracks draw in the order they are written, so the first track is at the bottom. Titles, shapes, SVG, stickers,
graphics, layers and captions are DOM elements above the canvas, positioned with the same maths. A track placed below
every footage track draws beneath it.

Sound is mixed with Web Audio, which is also the clock: the current time comes from `AudioContext.currentTime`, so
playback doesn't drift.

What isn't drawn yet is in [What renders](/reference/rendering).

## Next

- [Editing](./editing): build an editor around the player.
- [API reference](/reference/api#cutcraft-player): every prop, method and event.
- [How the export works](./export-architecture): the same player, run headless to write a file.
