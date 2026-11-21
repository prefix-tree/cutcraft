# API

The functions, components and options you call from code: the player in the browser, the export you drive from Node, the kit a video file imports, and the SDK a tool is built with. The list of every export at the end is read from the code.

## @uberscene/player

```tsx
import { Player, type PlayerRef } from "@uberscene/player";
import "@uberscene/player/fonts.css";
import { collectModule, resolve } from "@uberscene/sdk";
import * as file from "./video";

const state = resolve(collectModule(file), manifest);
const ref = useRef<PlayerRef>(null);

<Player
  ref={ref}
  state={state}
  element={file.default(file.defaults)}
  media={{ founder: blob, music: "/music.ogg" }}
  controls
/>;
```

Import `@uberscene/player/fonts.css` once in the app. It loads the bundled font families, so the preview sets text in the same faces as the export.

### `<Player>` props

| Prop | Type | Default | |
|---|---|---|---|
| `state` | `ResolvedState` | | The resolved composition, from `resolve()`. A new state is pushed into the running player. |
| `media` | `MediaResolver \| Record<string, Blob \| string>` | | Where each asset's bytes come from. A map takes a Blob or a URL per asset id. |
| `element` | `ReactNode` | | The evaluated file element, `file.default(props)`. Needed only to render the children of each `<Layer>`. |
| `controls` | `boolean` | | Show the control bar: play and pause, scrubber, time, mute and rate. |
| `loop` | `boolean` | `false` | Start again from 0 at the end. |
| `autoPlay` | `boolean` | | Start playing once the player is ready. |
| `initiallyMuted` | `boolean` | `false` | Start muted. |
| `playbackRate` | `number` | `1` | Playback speed, clamped to 0.25 to 4. |
| `fit` | `"contain" \| "none"` | `"contain"` | `contain` scales the composition into the box; `none` renders at composition pixels. |
| `style` | `CSSProperties` | | Merged into the root element's style. |
| `className` | `string` | | Class of the root element. |
| `audioContext` | `AudioContext` | | Use this context instead of creating one. |
| `onError` | `(e: PlayerErrorEvent) => void` | | Called on the `error` event. |
| `onFrame` | `(e: { time: number; frame: number }) => void` | | Called on the `frameupdate` event. |
| `coreOptions` | `Partial<PlayerOptions>` | | Options passed through to `PlayerCore`; meant for tests. |

A new `PlayerCore` is created when `media` or `audioContext` changes, so keep both stable between renders. The root element carries `data-time` and `data-frame`, and every element carries `data-el` and `data-kind`.

### `PlayerRef`

The ref of `<Player>` exposes part of `PlayerCore`.

| Member | Type | |
|---|---|---|
| `play()` | `Promise<void>` | Start playback. From the end, it starts again at 0. |
| `pause()` | `void` | Pause. |
| `toggle()` | `Promise<void>` | Play when paused, pause when playing. |
| `seekTo(time)` | `Promise<void>` | Jump to `time` seconds and draw its exact frame before resolving. |
| `seekToFrame(frame)` | `Promise<void>` | Same, by frame index. |
| `getCurrentTime()` | `number` | Composition seconds. |
| `getCurrentFrame()` | `number` | Frame index at the current time. |
| `isPlaying()` | `boolean` | Whether it is playing. |
| `addEventListener(type, fn)` | `() => void` | Listen to an event; returns a function that removes the listener. |
| `removeEventListener(type, fn)` | `void` | Remove a listener. |
| `renderFrame(time)` | `Promise<void>` | Draw `time` without moving the play head. |
| `captureSheet(times, options?)` | `Promise<HTMLCanvasElement \| OffscreenCanvas>` | A contact sheet of the canvas at `times`. See [captureSheet](#capturesheet). |
| `duration` | `number` | Composition length in seconds. Read only. |
| `state` | `ResolvedState` | The current state. Read only. |
| `playbackRate` | `number` | Read and write. Clamped to 0.25 to 4. |
| `loop` | `boolean` | Read and write. |
| `muted` | `boolean` | Read and write. |
| `volume` | `number` | Read and write. Clamped to 0 to 1. |
| `core` | `PlayerCore` | The underlying player. |
| `canvas` | `HTMLCanvasElement \| null` | The canvas the media is drawn on. |

### Hooks

These work only inside a `<Player>`; outside one they throw.

| Hook | Returns | |
|---|---|---|
| `usePlayer()` | `PlayerCore` | The player the component sits in. |
| `useCompositionTime()` | `number` | Composition seconds. Re-renders once per painted frame and on every seek. |
| `useCompositionFrame()` | `number` | Frame index. Updates like `useCompositionTime()`. |
| `useLayerT()` | `number` | Progress through the enclosing `<Layer>`, 0 to 1. Throws outside a `<Layer>`. |

Inside a file, use the kit's `useT()` and `useLayer()` instead. A mounted `<Player>` installs them, and they read the same clock.

### `PlayerCore`

The player without React. `<Player>` is a thin wrapper over it.

```ts
import { PlayerCore } from "@uberscene/player";

const core = new PlayerCore({ state, media: { founder: blob } });
core.attachCanvas(canvas);
await core.seekTo(2);
await core.play();
```

Constructor options (`PlayerOptions`):

| Option | Type | Default | |
|---|---|---|---|
| `state` | `ResolvedState` | | The resolved composition. |
| `media` | `MediaResolver \| Record<string, Blob \| string>` | | Where each asset's bytes come from. |
| `audioContext` | `AudioContext` | a new one | When omitted, a context is created at the composition's `sampleRate`, or 48000. |
| `loop` | `boolean` | `false` | Start again from 0 at the end. |
| `initiallyMuted` | `boolean` | `false` | Start muted. |
| `playbackRate` | `number` | `1` | Clamped to 0.25 to 4. |
| `resolveNested` | `ResolveNested` | | How a `<Nested>` sequence is resolved; by default from the state itself. |

The remaining options (`clock`, `audioOutput`, `toContextTime`, `frameSourceFactory`, `audioSourceFactory`, `createCanvas`, `raf`, `cancelRaf`, `setInterval`, `clearInterval`, `setTimeout`, `clearTimeout`) are test seams. In a browser the defaults are the audio context clock, Web Audio and mediabunny.

Methods and properties beyond those in [PlayerRef](#playerref):

| Member | Type | |
|---|---|---|
| `attachCanvas(canvas)` | `void` | Draw on this canvas (`HTMLCanvasElement`, `OffscreenCanvas` or `null`). It is sized to the composition. |
| `setState(state)` | `void` | Push a new resolved state, for example on every drag step in an editor. A paused player paints at once and fetches the exact frame 120 ms after the last call. |
| `getTime()` | `{ time: number; frame: number }` | The last painted time and frame. |
| `subscribeTime(fn)` | `() => void` | Called once per painted frame and on every seek. Fits `useSyncExternalStore`. |
| `resolveMedia(assetId)` | `Promise<MediaHandle>` | The media handle for an asset id. |
| `dispose()` | `void` | Pause and release decoders, audio and listeners. |

### Events

Listen with `addEventListener(type, fn)`. The event types are in `PlayerEvents`.

| Event | Payload | |
|---|---|---|
| `frameupdate` | `{ time, frame }` | A new frame was painted. |
| `play` | `{ time }` | Playback started. |
| `pause` | `{ time }` | Playback paused. |
| `seeked` | `{ time }` | A seek finished and its frame is drawn. |
| `ended` | `{ time }` | Playback reached the end without `loop`. |
| `ratechange` | `{ rate }` | `playbackRate` changed. |
| `volumechange` | `{ volume, muted }` | `volume` or `muted` changed. |
| `error` | `PlayerErrorEvent` | An asset failed. `{ id?, asset?, error: Error, fatal: boolean }`. |

### captureSheet

`captureSheet(times, options?)` draws each time with `renderFrame` into one canvas, `columns` cells wide, with a timecode label in each cell. It returns the canvas. It shows only the canvas plane: DOM overlays such as titles, shapes and `<Layer>` interiors are not on it.

| Option | Type | Default | |
|---|---|---|---|
| `columns` | `number` | `4` | Cells per row, never more than the number of times. |
| `cellWidth` | `number` | composition width, at most 320 | Cell width in pixels. Height follows the aspect ratio. |
| `labels` | `boolean` | `true` | Draw an `mm:ss:ff` label in each cell. |

### MediaResolver

Pass a resolver as `media` when a plain map of Blobs and URLs is not enough.

```ts
interface MediaResolver {
  resolve(assetId: string): Promise<MediaHandle>;
}

type MediaHandle =
  | { kind: "blob"; blob: Blob }
  | { kind: "url"; url: string }
  | { kind: "path"; path: string }; // a file on disk: the export's server reads it; the player needs a URL
```

A map passed as `media` is turned into a resolver that answers a string with `url` and a Blob with `blob`, and rejects an id it does not hold.

## @uberscene/render

Renders a file to a video, a soundtrack, a still image or a layout report, from Node, through the player in headless Chrome.

```ts
import { directoryResolver, loadVideo, renderVideo } from "@uberscene/render";

const video = await loadVideo("video.tsx");
const result = await renderVideo({
  state: video.state,
  source: video.source,
  media: directoryResolver("media", video.manifest),
  out: "video.mp4",
  onProgress: ({ frame, frames }) => console.log(frame, frames),
});
```

See [Exporting](/guide/exporting) for the command line and what the export draws.

### loadVideo

`loadVideo(file: string, options?: LoadOptions): Promise<LoadedVideo>`

Evaluates a cut file the way the editor does, with the kit's `loadModule`, and resolves it against its manifest. A file that imports something the host does not offer fails here as it would in the editor.

| Option | Type | Default | |
|---|---|---|---|
| `manifest` | `string \| AssetManifest` | the file's `manifest` export | A manifest file path, or the manifest itself. Without either, loading fails. |
| `props` | `Record<string, unknown>` | | Props for the file's default component, over its `defaults` export. |
| `imports` | `Record<string, string>` | | Modules the file may import beyond `react`, `zod` and the kit, by the name it imports them as. Each value is a package name or a path relative to the file's folder. |

`LoadedVideo`:

| Field | Type | |
|---|---|---|
| `state` | `ResolvedState` | The resolved composition. |
| `manifest` | `AssetManifest` | The manifest it was resolved against. |
| `source` | `ExportSource` | The file's text, manifest and props, for `renderVideo`, `renderStill` and `checkLayout`: the export page loads the file itself. |

### directoryResolver

`directoryResolver(dir: string, manifest: AssetManifest, overrides?: Record<string, string>): MediaResolver`

Finds each asset's file in `dir`: `<dir>/<id>` with no extension or with one of the usual media extensions (`.webm`, `.mp4`, `.mov`, `.mkv`, `.m4v`, `.ogg`, `.opus`, `.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`). An entry in `overrides` gives the path for that asset id instead.

### renderVideo

`renderVideo(options: RenderOptions): Promise<RenderResult>`

Renders the composition to a file in headless Chrome: the real player draws each frame, and the browser encodes the
pictures and the soundtrack. Node joins the pieces into the file. The first call downloads Chrome for Testing unless
one is cached or `UBERSCENE_CHROMIUM` names one (`findChrome`, `installChrome`).

| Option | Type | Default | |
|---|---|---|---|
| `state` | `ResolvedState` | | The resolved composition. |
| `source` | `ExportSource` | | From `loadVideo`: `{ text, manifest, props?, executablePath? }`. `executablePath` names the Chrome to run. |
| `media` | `MediaResolver` | | Where each asset's file is. Usually `directoryResolver`. |
| `out` | `string` | | The file to write. Its extension picks the container unless `container` is given. |
| `container` | `"mp4" \| "webm" \| "mov" \| "mp3" \| "wav"` | from `out` | By extension. MP3 and WAV hold only the soundtrack. MOV needs the native encoder ([Native codecs](/guide/native-codecs)). Any other extension is an error. |
| `videoCodec` | `"avc" \| "vp9" \| "av1" \| "prores"` | AVC in MP4, VP9 in WebM, ProRes in MOV | The video codec. It must fit the container: AVC or AV1 in MP4, VP9 or AV1 in WebM, ProRes in MOV. |
| `bitrate` | `number` | about 0.1 bits per pixel per frame | Video bits per second. |
| `quality` | `"very-low" \| "low" \| "medium" \| "high" \| "very-high"` | | An encoder quality preset, in place of `bitrate`. |
| `keyFrameInterval` | `number` | `2` | Seconds between keyframes. |
| `from` | `number` | `0` | Start of the part to render, in composition seconds. |
| `to` | `number` | the composition's duration | End of the part to render, in composition seconds. |
| `fonts` | `FontFile[]` | | Fonts beyond the bundled ones and those the file declares, picked by a title's `font` prop. `{ name, data: Buffer \| ArrayBuffer, weight?, style?: "normal" \| "italic" }`. |
| `tabs` | `number` | `1` | Pages of the browser that render pieces at once. |
| `draft` | `boolean` | | A render for watching, not keeping: every second frame, each shown twice as long, at half the width and height, at the `low` preset unless `bitrate` or `quality` is given ([A draft](/guide/exporting#a-draft)). |
| `smartCopy` | `boolean` | | Copy encoded pictures from the source where a stretch shows only one file (VP9, at the composition's size and frame rate, no overlay or effect), and render only the ends. |
| `silent` | `boolean` | | Skip the soundtrack. |
| `audioBitrate` | `number` | `128000` | Audio bits per second. |
| `onProgress` | `(p: { frame: number; frames: number }) => void` | | Called as pieces are written. |
| `onLog` | `(message: string) => void` | | Progress while Chrome downloads, on the first export. |
| `signal` | `AbortSignal` | | Stops the render when aborted. |
| `onAssetError` | `"throw" \| "continue"` | `"throw"` | When an asset cannot be opened or decoded: stop, or draw the grey placeholder and go on. |
| `frameTimeout` | `number` | `60` | Seconds one frame may take before the export fails with the frame and the step it was in. `renderStill`, `renderLook` and `checkLayout` take it too. |

`RenderResult`:

| Field | Type | |
|---|---|---|
| `frames` | `number` | Pictures written; 0 for MP3 or WAV. |
| `audio` | `boolean` | Whether the file has an audio track. |
| `fps`, `width`, `height` | `number` | The composition's frame rate and size. |
| `wallMs` | `number` | Time the render took, starting the browser included. |
| `tabs` | `number` | Pages that rendered pieces at once. |
| `copiedFrames` | `number` | Frames copied from a source instead of rendered. |
| `warnings` | `string[]` | What was left out and why, a soundtrack that clips, frames captured without a paint signal, and asset errors under `onAssetError: "continue"`. |

`containerOf(out)` returns the container a file name asks for, by the same rule as `container`.

### renderStill

`renderStill(options: StillOptions): Promise<StillResult>`

Draws one frame the way `renderVideo` does, to a PNG or a JPEG.

| Option | Type | Default | |
|---|---|---|---|
| `state` | `ResolvedState` | | The resolved composition. |
| `source` | `ExportSource` | | As for `renderVideo`. |
| `media` | `MediaResolver` | | Where each asset's file is. |
| `out` | `string` | | The image to write. `.jpg` or `.jpeg` writes a JPEG, anything else a PNG. |
| `time` | `number` | | Composition seconds. The frame showing at that time is drawn. It must be within the composition. |
| `fonts` | `FontFile[]` | | As for `renderVideo`. |
| `onAssetError` | `"throw" \| "continue"` | | As for `renderVideo`. |
| `onLog` | `(message: string) => void` | | As for `renderVideo`. |

`StillResult` has `frame`, `width`, `height` and `warnings`.

### checkLayout

`checkLayout(options: LayoutCheckOptions): Promise<LayoutCheckResult>`

Samples the composition in the export page, drawing each overlay alone to measure its ink, and reports every overlay (titles, shapes, graphics, stickers, layers and captions) that leaves the frame, leaves the safe zone, covers captions, or covers the subject. Each issue is a run of consecutive samples. Overlays beneath the footage, ones whose ink fills the frame, and moments where an element is fainter than 10% are not checked.

| Option | Type | Default | |
|---|---|---|---|
| `state` | `ResolvedState` | | The resolved composition. |
| `media` | `MediaResolver` | | Where each asset's file is. |
| `source` | `ExportSource & { file?: string }` | | As for `renderVideo`, plus the file's path, so each issue points at its place in the JSX. |
| `fonts` | `FontFile[]` | | As for `renderVideo`. |
| `safeZone` | `SafeZoneName \| Insets` | `"title-safe"` | A named zone from `SAFE_ZONES`, or your own margins. |
| `subject` | `{ x, y, w, h }` | | Where the subject is, as fractions of the frame, while footage shows whose manifest entry has no `subjects`. |
| `step` | `number` | one frame | Seconds between samples. |
| `from` | `number` | `0` | Start, in composition seconds. |
| `to` | `number` | the composition's duration | End, in composition seconds. |

`LayoutCheckResult` has `summary` (one line on what was checked and found), `issues`, `samples` and `warnings`. Each `LayoutIssue` has:

| Field | Type | |
|---|---|---|
| `rule` | `"frame-edge" \| "safe-zone" \| "captions" \| "subject"` | The rule it breaks. |
| `id`, `kind` | `string` | The element. |
| `with` | `string` | What it runs into: the captions' id, `subject`, or the safe zone's name (`custom` for insets). |
| `from`, `to` | `number` | First and last sample that break the rule, in seconds. |
| `at` | `number` | The worst moment. |
| `box`, `area` | `{ x, y, w, h }` | The element's ink at `at`, and what it breaks, in composition pixels. |
| `message` | `string` | What is wrong, in one sentence. |
| `fix` | `string` | The smallest change in props that clears it at `at`. |
| `source` | `SourceSpot` | Where to fix it in the file, when `source` was given: `file`, `line`, `column`, `code`, and `helper` or `loop` when the element was generated. |

`formatLayout(result)` prints the result as a compiler does: `file:line:column`, the rule and message, the line of JSX with a caret, and the fix for each issue, then the summary.

`SAFE_ZONES` holds the named margins, as fractions of the frame's height (top, bottom) and width (left, right):

| Name | Top | Bottom | Left | Right |
|---|---|---|---|---|
| `tiktok` | 240/1920 | 660/1920 | 120/1080 | 120/1080 |
| `reels` | 0.14 | 0.35 | 0.06 | 0.06 |
| `shorts` | 288/1920 | 672/1920 | 48/1080 | 192/1080 |
| `title-safe` | 0.05 | 0.05 | 0.05 | 0.05 |
| `action-safe` | 0.035 | 0.035 | 0.035 | 0.035 |

### addAsset

```ts
const { entry, manifest } = await addAsset("media/talk.mp4", { manifest: "uberscene.json" });
```

What `uberscene add` does: probes the media (kind, duration, fps, size, sound), reads the transcript beside it
(`talk.json`, `talk.vtt`, `talk.srt`) or `transcript`, and writes the entry into the manifest. Options: `manifest`,
`id`, `transcript`. The result also has `transcript` (the file read), `estimated` and `warnings`.

### Constants

`QUALITIES` maps each quality name (`very-low`, `low`, `medium`, `high`, `very-high`) to mediabunny's preset. Its keys are the values of `quality`.

`CHROME_MILESTONE` is the Chrome for Testing milestone the export downloads; `browserCacheDir()` is where.
`findChrome()` returns the binary the export would run (downloading it if needed), and `installChrome()` downloads it.

## @uberscene/kit

What a video file imports: the elements, components, hooks, helpers, diagram parts and theme. It has no DOM and
nothing a tool needs to edit a file.

| Export | Signature | |
|---|---|---|
| `useT` | `() => number` | Progress through the enclosing `<Layer>`, 0 to 1. Needs a mounted player. |
| `useLayer` | `() => LayerClock` | The layer's clock: `t`, `elapsed`, `remaining`, `duration`, `time`, `fps`. Needs a mounted player. |
| `useSeekable` | `(create: (scope) => Seekable, deps?) => RefObject` | Plays an animation from another library (GSAP, Anime.js, Lottie) on the layer's clock: built once on the ref's element, seeked to the layer's seconds every frame, reverted when the layer ends. Needs a mounted player. |
| `knob` | `{ color(), font(), image() }` | Schema helpers: a string that wants a colour picker, a font menu or an image picker ([The file](/guide/the-file#schema-and-defaults-are-the-knobs)). |
| `themeCss` | `(value: string) => string` | A theme value for CSS inside a Layer: `"$accent"` becomes `var(--us-accent)`, which the Layer sets from the file's theme; anything else is returned as written. For colours and fonts a component takes as props ([Blocks](/guide/blocks)). |
| `blockMetaSchema`, `BlockMeta` | zod schema, type | What a block says about itself in its `meta` export: `title`, `what`, `useWhen`, `avoidWhen`, `pairsWith`, `tags`, `aspects`, `length`, `beats`, `poster`. `uberscene blocks` lists and filters on it ([Blocks](/reference/cli#blocks)). |
| `interpolate` | `(input, inputRange, outputRange, options?: { easing?, extrapolateLeft?, extrapolateRight? }) => number` | Piecewise map from one range onto another. Extends past the ends unless `"clamp"`. |
| `spring` | `({ time, from?, to?, mass?, damping?, stiffness?, overshootClamping? }) => number` | A physical spring at `time` seconds. Defaults: `from` 0, `to` 1, mass 1, damping 10, stiffness 100. |
| `DrawnLine`, `Label`, `CountUp`, `Cells` | React components | Parts for drawing a diagram inside a `<Layer>`: a line that draws itself, a word with a line to what it names, a number that counts, a row of cells. Each renders SVG and happens `at` a second of the video, or `after` so many seconds of its layer, taking `over` seconds ([Diagram parts](/guide/free-code#diagram-parts)). |
| `useProgress`, `progress` | `(when?: { at?, after?, over?, easing?, progress? }) => number`, `(clock, when?) => number` | How far along something is on the layer's clock: 0 before it starts, 1 once it is over, eased between. |
| `random` | `(seed: string \| number) => number` | A number in [0, 1) fixed by `seed`, the same every frame in the preview and the export. |
| `narrate` | `(script: string, options?: { start?, pace?: { word?, letter?, comma?, stop? }, lineLength?, hold?, transcript? }) => { words, lines, cues, at(name), duration, warnings }` | Times a narration from its script: every word with its start and end, the subtitles a phrase at a time, and the cues by name. A word in square brackets is a cue, a number in round brackets a pause in seconds, a name in curly brackets a cue with no word. Times come from a speaking pace, or from `transcript` ([Narration from a script](/guide/captions-and-sound#narration-from-a-script)). |
| `effect` | `<P extends ZodObject>({ name, params?: P, shader } \| { name, params?: P, passes: string[] }) => EffectRef<P>` | Declares an effect drawn by a GLSL `vec4 effect(vec2 uv)`, or by several run in order (`passes`, each reading the one before as `image` and the element as `original`), that reads each param as `params.<name>`. Returns the definition as a value, with no side effect, for the `type` of an entry in `effects`, whose params are then checked against `P`. The player finds it on the element that uses it or among the file's exports, so each file's effects are its own ([Effects and transitions of your own](/guide/custom-effects)). |
| `transition` | `<P extends ZodObject>({ name, params?: P, shader }) => TransitionRef<P>` | Declares a transition drawn by a GLSL `vec4 transition(vec2 uv)` that reads `from`, `to`, `progress` and `params.<name>`. Returns the definition as a value for `<Transition type>`, which then checks `params` against `P`. |
| `font` | `({ family, src: "asset:<id>", weight?, style? }) => FontRef` | Declares a face from a font file and returns it as a value that stands for its family wherever a string goes ([Fonts](/guide/themes#fonts)). The faces a file uses or exports are on `state.fonts`. |
| `googleFont` | `(family, { weights?, styles? }?) => FontRef` | Declares a Google Fonts family, one face per weight and style, and returns it as a value that stands for its family. The export downloads it once into a local cache. |
| `THEMES`, `THEME_NAMES`, `MOTIONS`, `MOTION_NAMES` | registries | The built-in themes (`midnight`, `paper`, `neon`, `pastel`, `mono`, `bold`) and motion styles a file's `theme` can name or extend ([Themes](/guide/themes)). |
| `LowerThird`, `Callout`, `Badge`, `Counter`, `TypeCard` and `COMPONENTS` | `(props) => element` | The ready-made components, and the registry the [components reference](/reference/components/) is generated from. |

From `@uberscene/kit/schema`, the vocabulary as data: the element schemas and capabilities, the effect and
transition registries, the enums, the fonts and the themes. Tools and the reference pages read it.

| Export | Signature | |
|---|---|---|
| `knobsOf` | `(schema, values?) => Knob[]` | A file's schema values in order, each with `key`, `kind`, `description`, `optional`, its `value`, and `options`, `min` and `max` where it has them. |
| `BUILT_IN_SHADERS`, `builtInShader` | `readonly ShaderDefinition[]`, `(type) => ShaderDefinition \| undefined` | The built-in effects drawn by a shader (the colour, footage and title effects), with the schema of their params. |
| `EFFECTS`, `TRANSITIONS`, `EFFECT_FAMILIES`, `TRANSITION_FAMILIES` | registries | Every built-in effect and transition: its name, strict params schema and how it draws, and the families the reference groups them in. The generated [effects reference](/reference/effects/) is read from these. |
| `EffectParams<K>`, `TransitionParams<K>` | types | The params a built-in effect or transition takes, as an `effects` entry and `<Transition params>` check them. |
| `isNeutral` | `(type, params) => boolean` | Whether a built-in effect changes nothing with these params (an amount at 0): the player does not draw it then. |
| `FONT_CATALOG`, `findFont`, `fontsFor`, `nearestFont` | `readonly CatalogFont[]`, `(family) => CatalogFont \| undefined`, `({ role?, category? }?) => CatalogFont[]`, `(family) => CatalogFont \| undefined` | The fonts to choose from: the bundled families and a short list from Google Fonts, each with its category, the roles it suits, a line on how it looks, what it pairs with, and its weights. What `uberscene fonts` prints and what a font picker lists; `nearestFont` finds the family a misspelt name meant ([Choosing a font](/guide/themes#choosing-a-font)). |

## @uberscene/sdk

What a tool is built with: the resolver, the actions and executor, the patch log, the write-back to source, the lint
and the inspection rows. See [Editing](/guide/editing) for how these fit together and [Actions](/reference/actions)
for every action. The player and the renderer build on it too.

`@uberscene/sdk/resolver` has the resolver and the manifest types alone, without the parser, the actions or the
lint. It is what the player imports, so an app that plays files and never edits them loads no Babel.

| Export | Signature | |
|---|---|---|
| `collectModule` | `(mod: VideoModule, overrides?: Record<string, unknown>, options?: CollectOptions) => CollectedTree` | Calls the file's default component with `defaults` and `overrides` and collects the element tree. |
| `resolve` | `(tree: CollectedTree, manifest: AssetManifest, log?: PatchLog) => ResolvedState` | Absolute placements by id, with the patch log applied. |
| `Executor` | `new Executor({ tree, manifest, log?, history? })` | Runs actions: `execute(input)`, `can(input)`, `undo()`, `redo()`, `state()`, `log()`, `history()`, `beginGroup()`, `endGroup()`, `replaceTree(tree)`. `can` answers what `execute` would, without changing anything ([Editing](/guide/editing#run-a-gesture)). |
| `affordances` | `(state: ResolvedState, id: string) => Affordances \| undefined` | What can be done to one element: its kind, whether it is written in the file, its track and lock, how each prop can be written (`literal`, `bound`, `locked`), and the actions about it that accept it. |
| `actionTarget` | `(input: ActionInput) => string \| undefined` | The element an action is about, or undefined for one that creates something or acts on the whole file. |
| `parseTranscript` | `(text: string, format?: "srt" \| "vtt" \| "json") => { words, estimated }` | Reads SRT, WebVTT or speech-to-text JSON (OpenAI, whisper, whisper.cpp, ElevenLabs) into the manifest's word list ([Getting a transcript](/guide/captions-and-sound#getting-a-transcript)). |
| `subtitles` | `(state: ResolvedState, { format: "srt" \| "vtt", from?, to? }) => string` | The captions the cut plays, as a subtitle file timed from `from` ([Subtitle files](/guide/captions-and-sound#subtitle-files)). |
| `parseCube` | `(text: string) => { size, domainMin, domainMax, data, title? }` | Reads a 3D `.cube` LUT; throws naming the line that is wrong ([A look from a LUT](/guide/colour#a-look-from-a-lut)). |
| `loadModule` | `(source: string, options?: { imports?, scope?, files? }) => CutModule` | Evaluates a file's text. It may import `react`, `zod` and `@uberscene/kit`, plus `imports`, and its own modules from `files` (path from the file's folder to text). |
| `gatherLocalFiles` | `(source: string, read: (path) => string \| undefined, options?: { name?, imports? }) => Record<string, string>` | The texts of the modules a file imports by `./` or `../`, and of the ones they import, read through `read` (which may throw to refuse a path). Pass the result to `loadModule` as `files`. |
| `lint` | `(text: string, options?: { manifest?, rules?, deprecations? }) => Diagnostic[]` | Static checks that keep a file editable. Each `Diagnostic` has `rule`, `severity`, `message`, `range`, `id` and `prop` when known, and `fix` (source edits) when there is one right answer. |
| `fixSource` | `(text: string, options?: LintOptions) => { text, applied, remaining }` | Lints and applies every fix, round by round until none applies (ten rounds at most). A fix that touches text another fix claimed in the same round waits for the next. `applied` is what was mended, `remaining` what the fixed text still reports. |
| `DEPRECATIONS` | `readonly Deprecation[]` | The old spellings the `deprecated-props` rule reports: `{ element, prop, to, since, note? }`, where `to` is `{ rename }`, `{ into, key?, wrap? }` or `{ value: { from, to } }`. Empty until a release respells something; pass more as `lint`'s `deprecations`. |
| `jsxTags` | `(index: { ast }, name?: string) => JSXOpeningElement[]` | Every JSX opening tag in a parsed file (`parseSource` or `buildSourceIndex`), or only the tags of one name: what the fix helpers below work on. `tagName`, `attributeOf` and `propAt` read a tag. |
| `renameProp` | `(tag, from: string, to: string) => SourceEdit[] \| null` | Edits that rename a prop; a dotted path (`"animation.preset"`) renames a key inside an object prop. Null when the new name is taken or the object is an expression. |
| `renameValue` | `(text: string, tag, path: string, from: string, to: string) => SourceEdit[] \| null` | Edits that respell a string value, in an attribute, in braces or inside an object prop. Null when the prop does not hold exactly `from`. |
| `movePropInto` | `(text: string, tag, prop: string, objectProp: string, key?: string, options?: { wrap?, rewrite? }) => SourceEdit[] \| null` | Edits that move a prop into an object prop, making the object when the tag has none and extending an object literal. With `wrap`, a plain value already there (`style="h1"`) becomes that key of the new object. Null when the object is any other expression or has the key. `movePropsInto` moves several at once. |
| `foldToSource` | `(text: string, log: PatchLog, state: ResolvedState, maxRounds?: number) => FoldResult` | Writes the patch log's net effect back into the text. `FoldResult` has `text`, `edits`, `baked` and `skipped`. |
| `buildSourceIndex` | `(text: string) => SourceIndex` | Where each element, prop and helper sits in the text. |
| `insertLayer` | `(text: string, placement: { track, id, component, from, timing, props? }) => string` | The text with `component` imported from `from` (unless the file imports it already) and a `<Layer id timing…>` holding it at the end of `track`; `Layer` is added to the kit's import when the file lacks it. A missing track, a taken id, or the name bound to something else is an error. What `uberscene blocks add --into` writes. |

<!-- every export: generated by scripts/gen-docs.ts -->

## Every export

Every name each entry exports, read from the code. The sections above explain the ones you start with.

### `@uberscene/kit`

99 exports.

| Export | Kind | |
|---|---|---|
| `Adjustment` | const | The `<Adjustment>` element ([reference](/reference/elements/adjustment)). |
| `Angle` | const | The `<Angle>` element ([reference](/reference/elements/angle)). |
| `Animatable` | type | A value written as a constant, or as keys over time. |
| `AnyEffectSpec` | type | Any effect a file may write. |
| `Audio` | const | The `<Audio>` element ([reference](/reference/elements/audio)). |
| `Badge` | function | A short word on a pill that pops in. |
| `BlockMeta` | type |  |
| `blockMetaSchema` | const | What a block says about itself, so an agent or a person can choose it without opening it. |
| `builtInShader` | function | The built-in shader of an effect type, if it has one. |
| `Callout` | function | A note on a surface box, with a line drawn from it to the thing it is about. |
| `Caption` | const | The `<Caption>` element ([reference](/reference/elements/caption)). |
| `Captions` | const | The `<Captions>` element ([reference](/reference/elements/captions)). |
| `Cells` | function | A row of cells, each with a value under it if you give them. |
| `CellsProps` | interface |  |
| `Clip` | const | The `<Clip>` element ([reference](/reference/elements/clip)). |
| `COMPONENT_NAMES` | const | The components' names. |
| `ComponentEntry` | interface |  |
| `COMPONENTS` | const | Every ready-made component by name, with its props schema. |
| `Composition` | const | The `<Composition>` element ([reference](/reference/elements/composition)). |
| `Counter` | function | A number that counts up (or down) to its value, with a label under it. |
| `CounterValue` | function | The number itself, drawn each frame inside the counter's Layer. |
| `CountUp` | function | A number that counts from one value to another. |
| `CountUpProps` | interface |  |
| `Cut` | const | The `<Cut>` element ([reference](/reference/elements/cut)). |
| `DrawnLine` | function | A line that draws itself from one point to another. |
| `DrawnLineProps` | interface |  |
| `effect` | function | Declares an effect drawn by a GLSL function, and returns it for an effect's `type`. |
| `EffectParamsOf` | type | The params of an effect type. |
| `EffectRef` | interface | An effect a file declares, as `effect()` returns it. |
| `EffectSpec` | type | One entry of an element's `effects`. |
| `Extrapolate` | type | Pure animation helpers for `<Layer>` code, beside `useT()` and `useLayer()`. |
| `font` | function | Declares a face from a font file and returns it (a `FontRef`, standing for its family), to pass as a `font` prop, a theme font or a CSS `fontFamily`. |
| `fontFamily` | function | A CSS `font-family` value for free code. |
| `FontRef` | type | A family a file declares, as `font()` and `googleFont()` return it. |
| `Gap` | const | The `<Gap>` element ([reference](/reference/elements/gap)). |
| `googleFont` | function | Declares a Google Fonts family, in each weight and style given (default 400, normal), and returns it (a `FontRef`). |
| `grid` | function | The geometry of a grid, and nothing drawn. |
| `Grid` | interface |  |
| `GridCell` | interface | One cell of a grid. |
| `GridOptions` | interface |  |
| `holdLayerFrame` | function | Hold the frame until the returned release is called (once; later calls do nothing). |
| `interpolate` | function | Maps `input` from `inputRange` onto `outputRange`, piecewise. |
| `InterpolateOptions` | interface |  |
| `Key` | interface | One key of a value that changes over time. |
| `knob` | const | Schema helpers for values that are strings to zod but want their own control. |
| `Knob` | interface | One value of a file's `schema`, as an editor or an agent needs it to offer a control. |
| `KnobKind` | type | What control a knob wants. |
| `Label` | function | A word, with a line from beside it to the point it names. |
| `LabelProps` | interface |  |
| `LabelSide` | type |  |
| `Layer` | const | The `<Layer>` element ([reference](/reference/elements/layer)). |
| `LayerClock` | interface | Time inside a `<Layer>`. |
| `LowerThird` | function | A name and a role in the lower third of the frame. |
| `Marker` | const | The `<Marker>` element ([reference](/reference/elements/marker)). |
| `Mask` | const | The `<Mask>` element ([reference](/reference/elements/mask)). |
| `Motion` | const | The `<Motion>` element ([reference](/reference/elements/motion)). |
| `Multicam` | const | The `<Multicam>` element ([reference](/reference/elements/multicam)). |
| `narrate` | function | Times a narration from its script. |
| `NarratedLine` | interface | A subtitle. |
| `NarratedWord` | interface | A word of the narration, with when it is said. |
| `NarrateOptions` | interface |  |
| `Narration` | interface |  |
| `NarrationPace` | interface | How long things take to say, in seconds. |
| `Nested` | const | The `<Nested>` element ([reference](/reference/elements/nested)). |
| `Point` | type |  |
| `progress` | function | How far along something is on a layer's clock. |
| `random` | function | A number in [0, 1) fixed by its keys. |
| `Seekable` | interface | Anything that can be set to a moment. |
| `Shape` | const | The `<Shape>` element ([reference](/reference/elements/shape)). |
| `spring` | function | A physical spring from `from` (default 0) to `to` (default 1) at `time` seconds. |
| `SpringOptions` | interface |  |
| `stepAt` | function | Which step a moment has reached. |
| `Sticker` | const | The `<Sticker>` element ([reference](/reference/elements/sticker)). |
| `Svg` | const | The `<Svg>` element ([reference](/reference/elements/svg)). |
| `THEME_NAMES` | const | The built-in themes and motion styles a file can name. |
| `themeCss` | function | A theme value for CSS inside a Layer. |
| `ThemeInput` | type |  |
| `ThemeName` | type |  |
| `THEMES` | const |  |
| `Three` | const | The `<Three>` element ([reference](/reference/elements/three)). |
| `ThreeFrameArgs` | interface | What the update `setup` returns gets on every frame. |
| `ThreeSetupArgs` | interface | What `<Three setup>` gets once. |
| `ThreeSetupFunction` | type |  |
| `Title` | const | The `<Title>` element ([reference](/reference/elements/title)). |
| `Track` | const | The `<Track>` element ([reference](/reference/elements/track)). |
| `transition` | function | Declares a transition drawn by a GLSL function of the two pictures, and returns it for `<Transition type>`. |
| `Transition` | const | The `<Transition>` element ([reference](/reference/elements/transition)). |
| `TransitionComponent` | interface | `<Transition>`. |
| `TransitionParamsOf` | type | The params of a transition type. |
| `TransitionRef` | interface | A transition a file declares, as `transition()` returns it. |
| `TypeCard` | function | A card of big type that builds line by line. |
| `TypeCardBack` | function | The card behind the lines. |
| `TypeCardLine` | function | The card's lines, laid out as a whole with one part showing. |
| `useLayer` | function | The layer's clock. |
| `useProgress` | function | `progress` on the clock of the layer this is drawn in. |
| `useSeekable` | function | An animation from another library, played on the video's clock. |
| `useT` | function | Normalised time (0..1) inside a `<Layer>`; `useLayer().t`. |
| `When` | interface | When a part of a diagram happens. |
| `withFrame` | function | Runs `fn` with components placed on a frame of `size`. |

### `@uberscene/kit/schema`

241 exports.

| Export | Kind | |
|---|---|---|
| `Adjustment` | const | The `<Adjustment>` element ([reference](/reference/elements/adjustment)). |
| `Angle` | const | The `<Angle>` element ([reference](/reference/elements/angle)). |
| `Animatable` | type | A value written as a constant, or as keys over time. |
| `AnyEffectSpec` | type | Any effect a file may write. |
| `applyTheme` | function | An element's raw props with its theme applied, before the schema parses them. |
| `Audio` | const | The `<Audio>` element ([reference](/reference/elements/audio)). |
| `BLEND_MODES` | const |  |
| `BlendMode` | type |  |
| `BLOCK_ASPECTS` | const | The frame shapes a block can be laid out for. |
| `BOX_ORIGIN_POINT` | const | Each origin as fractions of the element's width and height from its top left. |
| `BOX_ORIGINS` | const | Which point of an element's box `box.x` and `box.y` place. |
| `BoxOrigin` | type |  |
| `BUILT_IN_SHADERS` | const | The built-in effects drawn by a shader. |
| `BUILT_IN_TRANSITIONS` | const | The built-in transitions drawn by a shader. |
| `builtInShader` | function | The built-in shader of an effect type, if it has one. |
| `builtInTransition` | function | The built-in shader transition of a type, if it has one. |
| `BUNDLED_FONT_WEIGHTS` | const |  |
| `BUNDLED_FONTS` | const |  |
| `BundledFont` | interface | The font families the player ships. |
| `capabilitiesOf` | function |  |
| `Caption` | const | The `<Caption>` element ([reference](/reference/elements/caption)). |
| `CAPTION_ANIMATIONS` | const |  |
| `Captions` | const | The `<Captions>` element ([reference](/reference/elements/captions)). |
| `CatalogFont` | interface | One family to choose from. |
| `CheckedEffects` | type | Each entry of an `effects` list checked against its own type. |
| `Clip` | const | The `<Clip>` element ([reference](/reference/elements/clip)). |
| `ColourFunction` | interface | A built-in colour transform's function, in parts a fused source can combine. |
| `COMPONENT_NAMES` | const | The components' names. |
| `ComponentEntry` | interface |  |
| `COMPONENTS` | const | Every ready-made component by name, with its props schema. |
| `Composition` | const | The `<Composition>` element ([reference](/reference/elements/composition)). |
| `cssOf` | function | The CSS filter a built-in effect draws as. |
| `curveAt` | function | The value of a curve at `t`, keys sorted by `at`. |
| `CurveKey` | interface | One key of a curve. |
| `CurvePoint` | type | A point of a curve. |
| `Cut` | const | The `<Cut>` element ([reference](/reference/elements/cut)). |
| `DECLARED` | const | What every value a file declares (an effect, a transition, a font) carries, so collection can recognise it. |
| `DeclaredFont` | interface | One face a file declares with `font()` or `googleFont()`. |
| `DEFAULT_THEME` | const | The theme tokens resolve against when a file declares none. |
| `defaultTransitionParams` | function |  |
| `defineElement` | function | A vocabulary element is an ordinary React component that also carries its kind, its Zod prop schema and its editing capabilities, so the resolver and the editor can read the element tree without rendering it. |
| `DefineOptions` | interface |  |
| `DERIVED_KINDS` | const |  |
| `DERIVED_SCHEMAS` | const | The resolver's own item kinds. |
| `DerivedKind` | type |  |
| `ease` | function | `name` applied to `x` clamped to 0..1; an unknown or missing name is linear. |
| `Easing` | type |  |
| `EASING_FN` | const |  |
| `EASINGS` | const |  |
| `effect` | function | Declares an effect drawn by a GLSL function, and returns it for an effect's `type`. |
| `EFFECT_FAMILIES` | const | The effects by family, for the reference and the editor's menus. |
| `EffectDraw` | type | How a built-in effect draws. |
| `effectEntry` | function | The built-in effect of a type, if there is one. |
| `EffectEntry` | interface |  |
| `EffectNotRendered` | interface | An effect type an element of `kind` takes in its `effects` but does not draw. |
| `effectParamProblem` | function | Whether `param` is a param of an effect of `type`, and `value` one it takes, by the effect's params schema. |
| `EffectParams` | type | The params a built-in effect takes, as written in an `effects` entry. |
| `EffectParamsOf` | type | The params of an effect type. |
| `EffectRef` | interface | An effect a file declares, as `effect()` returns it. |
| `EFFECTS` | const |  |
| `EFFECTS_NOT_RENDERED` | const |  |
| `EffectSpec` | type | One entry of an element's `effects`. |
| `ElementBox` | type |  |
| `ElementCapabilities` | interface |  |
| `ElementDefinition` | interface |  |
| `ElementKind` | type |  |
| `ELEMENTS` | const |  |
| `ENGINE_LAYERS` | const | The engine Layers by tag, and the schema each is checked against once collected (with its `engine`). |
| `ENGINE_SCHEMAS` | const |  |
| `engineOf` | function | The engine a vocabulary component draws with, if it is an engine Layer. |
| `ENTRANCE_ANIMATIONS` | const |  |
| `findFont` | function | The catalogue's entry for a family, whatever its letter case; undefined for a family the catalogue does not list. |
| `FIT_MODES` | const |  |
| `FitMode` | type |  |
| `font` | function | Declares a face from a font file and returns it (a `FontRef`, standing for its family), to pass as a `font` prop, a theme font or a CSS `fontFamily`. |
| `FONT_CATALOG` | const | The fonts to choose from. |
| `FONT_KEYS` | const |  |
| `FontCategory` | type | The Google Fonts families the catalogue offers, chosen by hand. |
| `fontFaces` | function | Whether a value is a family a file declared, and if so its faces. |
| `fontFamily` | function | A CSS `font-family` value for free code. |
| `FontRef` | type | A family a file declares, as `font()` and `googleFont()` return it. |
| `FontRole` | type | What a family does well in a video. |
| `fontsFor` | function | The catalogue, narrowed to a role, a category, or both. |
| `FontSource` | type | Where a declared face's file comes from. |
| `FontStyle` | type |  |
| `frameAt` | const | The frame a tick falls in. |
| `frameAtSeconds` | const | The frame a time in seconds falls in, never below 0. |
| `FrameRate` | type | What `fps` may be. |
| `frameStart` | const | The first tick of a frame. |
| `frameStartSeconds` | const | When a frame starts, in seconds. |
| `framesUntil` | const | The first frame that starts at or after a time. |
| `fusedColourSource` | function | One effect pass that draws a run of colour transforms in order. |
| `Gap` | const | The `<Gap>` element ([reference](/reference/elements/gap)). |
| `GaussOutside` | type | Past the frame's edge. |
| `gaussScale` | function | The scale a blur of σ frame pixels is drawn at. |
| `gaussSources` | function | Every source a blur of this kind can use, for a definition's `passes`. |
| `gaussSteps` | function | The steps of a blur of σ frame pixels, read from the `param` param. |
| `GaussWhat` | type | What a blur blurs. |
| `googleFont` | function | Declares a Google Fonts family, in each weight and style given (default 400, normal), and returns it (a `FontRef`). |
| `holdLayerFrame` | function | Hold the frame until the returned release is called (once; later calls do nothing). |
| `installLayerClock` | function |  |
| `installLayerEngine` | function | Install (or with `null`, remove) the engine that draws `<Layer engine={name}>` tags such as `<Three>`. |
| `isBuiltInTransition` | function |  |
| `isBundledFont` | function |  |
| `isDropFrame` | const | Whether a rate is shown in drop-frame timecode. |
| `isKeyframeProperty` | function | A property a key list can animate, as the resolver names it (`transform.opacity` for <code v-pre>transform={{ opacity: […] }}</code>). |
| `isNeutral` | function | Whether a built-in effect changes nothing with these params. |
| `isShaderRef` | function | Whether a value is an effect or transition a file declared. |
| `isVocabulary` | function |  |
| `Key` | interface | One key of a value that changes over time. |
| `KEYFRAME_PROPERTIES` | const |  |
| `KIND_CAPABILITIES` | const | What each element kind can do. |
| `kindOf` | function |  |
| `knobsOf` | function | The knobs of a file's `schema`, in the order it lists them, with the value each has in `values` (the file's `defaults` merged with any props given). |
| `Layer` | const | The `<Layer>` element ([reference](/reference/elements/layer)). |
| `layerEngine` | function |  |
| `LayerEngine` | type | What draws an engine Layer (`<Three>`, `<Motion>`). |
| `layerFramesPending` | function | How many holds are open. |
| `Marker` | const | The `<Marker>` element ([reference](/reference/elements/marker)). |
| `Mask` | const | The `<Mask>` element ([reference](/reference/elements/mask)). |
| `MASK_NOT_RENDERED` | const |  |
| `MASK_TYPES` | const |  |
| `MASKED_KINDS` | const | Masks render on these kinds, one per element. |
| `MAX_SECONDS` | const | The longest time ticks hold exactly as a JavaScript number. |
| `monotoneCurve` | function | The curve through `points` (x strictly increasing) as a function on 0..1, clamped to 0..1. |
| `Motion` | const | The `<Motion>` element ([reference](/reference/elements/motion)). |
| `MOTION_NAMES` | const |  |
| `MotionAnimation` | interface |  |
| `MotionBlur` | interface |  |
| `motionBlurOf` | function | The composition's motion blur (`<Composition motionBlur>`), or null when it has none. |
| `MotionName` | type |  |
| `MOTIONS` | const |  |
| `MotionStyle` | interface | What a motion style fills where an element says nothing. |
| `motionStyleSchema` | const |  |
| `Multicam` | const | The `<Multicam>` element ([reference](/reference/elements/multicam)). |
| `nearestFont` | function | The listed family whose name is nearest a misspelt one, when one is near enough to be what was meant. |
| `nearestFrame` | const | The frame nearest a time, for times given by a person (`--at 2.5`) rather than computed. |
| `Nested` | const | The `<Nested>` element ([reference](/reference/elements/nested)). |
| `NoParams` | type | The params of a shader that declares none. |
| `NOT_RENDERED` | const |  |
| `NotRendered` | interface | Accepted but not rendered. |
| `NTSC_RATES` | const | The NTSC rates, written as the strings people say them as. |
| `PALETTE_KEYS` | const | The palette names every built-in theme fills. |
| `parseRate` | function | A frame rate as an exact fraction. |
| `PlacementScope` | type |  |
| `POST_EFFECTS` | const | Effects the painter draws over the element after it. |
| `Presets` | type |  |
| `Rate` | interface | A frame rate as an exact fraction. |
| `rateLabel` | function | The rate as people write it. |
| `rateProblem` | function | Why a rate cannot be used, or null. |
| `rateValue` | const | The rate as frames per second, for display and for code that only needs an approximate number. |
| `RENDERED_VALUES` | const |  |
| `RenderedValues` | interface | An enum prop where only some values render. |
| `ResolvedTheme` | interface | A file's theme with its base theme merged in. |
| `resolveTheme` | function | The theme a composition's raw `theme` prop describes. |
| `sampleAt` | const | The audio sample a tick falls in. |
| `sampleAtSeconds` | const | The audio sample a time in seconds falls in. |
| `sampleRateProblem` | function | Why a sample rate cannot be used, or null. |
| `samplesUntil` | const | The first sample that starts at or after a time. |
| `SCHEMAS_BY_KIND` | const |  |
| `secondsToTicks` | const | Seconds as the nearest tick. |
| `SHADER_ONLY_EFFECTS` | const | Built-in shader effects with no CSS filter to fall back on. |
| `shaderDefinition` | function | Checks a declaration and makes its definition; throws what is wrong with it. |
| `ShaderDefinition` | interface |  |
| `shaderFor` | function | The shader a file declares under this name for an effect or a `<Transition>`, if any. |
| `ShaderStep` | interface | One pass of a built-in as it is drawn. |
| `ShaderTable` | interface | A small picture a built-in effect computes from its params. |
| `ShaderUniform` | interface | How a param reaches the shader, worked out from its schema once. |
| `Shape` | const | The `<Shape>` element ([reference](/reference/elements/shape)). |
| `SHAPE_TYPES` | const |  |
| `shutterTimes` | function | The composition seconds a frame at `t` averages. |
| `springAt` | function | Where a spring released at rest from `from` toward `to` is after `time` seconds. |
| `SpringConfig` | interface | A spring's physics. |
| `Sticker` | const | The `<Sticker>` element ([reference](/reference/elements/sticker)). |
| `STYLED_KINDS` | const | Element kinds a theme can hold named presets for; their elements pick one with `style`. |
| `StyledKind` | type |  |
| `Svg` | const | The `<Svg>` element ([reference](/reference/elements/svg)). |
| `SVG_COLOR_MODES` | const |  |
| `TEXT_ALIGNS` | const |  |
| `TEXT_ANIMATION_PRESETS` | const |  |
| `TEXT_DECORATIONS` | const |  |
| `TEXT_VALIGNS` | const |  |
| `THEME_NAMES` | const | The built-in themes and motion styles a file can name. |
| `themeCss` | function | A theme value for CSS inside a Layer. |
| `Themed` | interface |  |
| `ThemeDefinition` | interface |  |
| `ThemeInput` | type |  |
| `ThemeIssue` | interface |  |
| `ThemeName` | type |  |
| `ThemeOrigin` | type | Where a themed prop's value came from. |
| `ThemeProps` | type |  |
| `THEMES` | const |  |
| `themeSchema` | const |  |
| `themeToken` | function | The value of `$name`, or undefined. |
| `Three` | const | The `<Three>` element ([reference](/reference/elements/three)). |
| `TICKS_PER_SECOND` | const | Ticks in one second. |
| `ticksPerFrame` | const | Ticks in one frame. |
| `ticksToSeconds` | const |  |
| `timecode` | function | SMPTE timecode of a frame, `HH:MM:SS:FF`. |
| `Title` | const | The `<Title>` element ([reference](/reference/elements/title)). |
| `TOKEN_PATTERN` | const | A whole prop value naming a theme value. |
| `tokenSchema` | const |  |
| `Track` | const | The `<Track>` element ([reference](/reference/elements/track)). |
| `TRACK_FLAGS` | const |  |
| `TRACK_LAYOUTS` | const |  |
| `TRACK_ROLES` | const |  |
| `TrackFlag` | type |  |
| `TrackLayout` | type |  |
| `TrackRole` | type |  |
| `Transform` | type |  |
| `transition` | function | Declares a transition drawn by a GLSL function of the two pictures, and returns it for `<Transition type>`. |
| `Transition` | const | The `<Transition>` element ([reference](/reference/elements/transition)). |
| `TRANSITION_FAMILIES` | const | The transitions by family. |
| `TRANSITION_PARAMS` | const | Per-type params schemas of the built-in transitions. |
| `TRANSITION_TYPES` | const | The built-in transition types, in the registry's order. |
| `TransitionComponent` | interface | `<Transition>`. |
| `TransitionEntry` | interface |  |
| `TransitionParams` | type | The params a built-in transition takes, as written in `<Transition params>`. |
| `TransitionParamsOf` | type | The params of a transition type. |
| `TransitionRef` | interface | A transition a file declares, as `transition()` returns it. |
| `TRANSITIONS` | const |  |
| `TransitionType` | type |  |
| `uniformsOf` | function | Each param of a schema that a uniform can carry, and how. |
| `usesShaders` | function | Whether a file draws anything with a shader it declares. |
| `VIDEO_EFFECT_TYPES` | const | The built-in effect types, in the registry's order. |
| `VideoEffectType` | type |  |
| `VocabularyComponent` | type |  |
| `VocabularyMeta` | interface | What a vocabulary component carries besides being one. |
| `VocabularyProps` | type |  |
| `zBlendMode` | const |  |
| `zCaptionAnimation` | const |  |
| `zEasing` | const |  |
| `zEntranceAnimation` | const |  |
| `zFitMode` | const |  |
| `zKeyframeProperty` | const |  |
| `zShapeType` | const |  |
| `zTextAnimationPreset` | const |  |
| `zTrackLayout` | const |  |
| `zTrackRole` | const |  |
| `zTransitionType` | const |  |
| `zVideoEffectType` | const |  |

### `@uberscene/sdk`

201 exports.

| Export | Kind | |
|---|---|---|
| `Action` | interface |  |
| `ActionError` | interface |  |
| `ActionErrorCode` | type |  |
| `ActionHandler` | interface | The four faces of an action. |
| `ActionHistory` | class | Undo/redo stacks of invertible actions. |
| `ActionInput` | type |  |
| `ActionMap` | type |  |
| `ActionResult` | interface |  |
| `actionTarget` | function | The element an action is about, by its handler's `targets`, or undefined for an action that is about none. |
| `ActionType` | type |  |
| `affordances` | function | What can be done to the element `id` in `state`, or undefined when there is no such element. |
| `Affordances` | interface | What an editor or an agent may do to one element, before trying anything. |
| `ALLOWED_IMPORTS` | const | The modules a cut file may import. |
| `applyEdits` | function | Splice edits into the text, last range first, refusing overlaps. |
| `aroundMoments` | function | Five moments around one thing. |
| `asJson` | function |  |
| `AssetEntry` | interface |  |
| `assetIdOf` | function |  |
| `AssetManifest` | interface | What the ingest service knows about an asset. |
| `assetPlay` | function | The play of one clip or audio placement. |
| `AssetPlay` | interface | Where an asset plays on the timeline. |
| `attributeOf` | function | The tag's attribute of that name. |
| `AudioActions` | interface |  |
| `AUTO_GROUP_TYPES` | const | Rapid repeats of these on the same target collapse into one undo step (OpenReel's rule). |
| `bake` | function | Replace the helper call that produced a generated element with the literal elements that call produced, so the editor can address them. |
| `buildSourceIndex` | function | Index every vocabulary JSX element with a literal id so patches can be written back as text edits. |
| `CanResult` | interface | What `can()` answers. |
| `CaptionActions` | interface |  |
| `ClipActions` | interface |  |
| `collect` | function | Walk the element tree the file's default export returned and index every vocabulary element by id. |
| `CollectedNode` | interface | One vocabulary element as collected from the React element tree, before schema parsing and before placement. |
| `CollectedTree` | interface |  |
| `collectModule` | function |  |
| `CollectOptions` | interface |  |
| `CompositionActions` | interface |  |
| `createPatchLog` | function |  |
| `CubeLut` | interface |  |
| `Cue` | interface |  |
| `cueNodes` | function | Generated `<Caption>` nodes for the cues, as children of the captions node. |
| `CueOptions` | interface |  |
| `CutModule` | interface | What a cut file exports. |
| `CutRow` | interface |  |
| `DEFAULT_CUE_OPTIONS` | const |  |
| `Dependent` | type | Something whose place or length is given by another element. |
| `dependentsOf` | function | The elements that depend on `id`, in timeline order of the file, each once per way it depends. |
| `Deprecation` | interface | An old spelling of a prop and what replaced it. |
| `DEPRECATIONS` | const | Every respelling the kit knows how to move a file across. |
| `describeAction` | function |  |
| `Diagnostic` | interface |  |
| `Editable` | type |  |
| `EffectActions` | interface |  |
| `EffectRow` | interface |  |
| `elementName` | function |  |
| `ElementRow` | interface |  |
| `ElementSite` | interface |  |
| `EMPTY_MANIFEST` | const |  |
| `Executor` | class | Runs actions against `{ tree, patches }`. |
| `ExecutorOptions` | interface |  |
| `findParentOf` | function |  |
| `FixResult` | interface |  |
| `fixSource` | function | Lints the file and applies every fix the diagnostics carry, then lints again, until none applies. |
| `fold` | function | Turn the patch log's net effect into text edits against the index. |
| `FoldResult` | interface |  |
| `foldToSource` | function | Fold with baking. |
| `FreezeActions` | interface |  |
| `FreezeHold` | interface | A hold. |
| `freezeHoldsOf` | function | A clip's holds (from `freezes`), sorted by `start`. |
| `freezeShift` | function | Element-relative `rel` with the holds before it taken out, or the held source second when `rel` is inside a hold. |
| `freezeUnshift` | function | Element-relative time of clip time `u`. |
| `gatherLocalFiles` | function | The texts of every local module a video file imports, and of the modules they import in turn, keyed by path from the video file's folder. |
| `GatherOptions` | interface |  |
| `heldWithin` | function | Seconds of holds inside the first `length` seconds of a clip. |
| `HelperCallSite` | interface |  |
| `HelperSite` | interface |  |
| `HistoryEntry` | interface |  |
| `HistorySnapshot` | interface |  |
| `holdTotal` | function | Total seconds the holds add to a clip. |
| `indentOf` | function |  |
| `insertLayer` | function | The text with the component imported (unless the file already imports that name) and a `<Layer>` holding it at the end of the track. |
| `InstalledBlock` | interface | A block copied into the project. |
| `INTERIOR_PREFIX` | const | Prop keys under this prefix address a Layer's handles rather than the Layer's own props. |
| `invalid` | function |  |
| `isResolveError` | function |  |
| `isTimeRefString` | function |  |
| `Json` | type |  |
| `jsxTags` | function | Every JSX opening tag in the file, in source order; with `name`, only the tags of that name. |
| `KeyActions` | interface |  |
| `KeyframeRow` | interface |  |
| `KeyJson` | interface | One key as a file writes it. |
| `LayerActions` | interface |  |
| `LayerInterior` | interface |  |
| `LayerPlacement` | interface |  |
| `lineRange` | function | Widen an element range to swallow its own line(s). |
| `lint` | function | Static checks on a video file. |
| `LintOptions` | interface |  |
| `LintRule` | type |  |
| `listenRange` | function | A stretch of the finished video to listen to. |
| `listHandlers` | function |  |
| `literalOf` | function | Evaluate a literal expression (numbers, strings, booleans, null, arrays and objects of literals, template strings without holes). |
| `loadModule` | function |  |
| `LoadOptions` | interface |  |
| `lookupAsset` | function |  |
| `MarkerActions` | interface |  |
| `MaskActions` | interface |  |
| `MAX_RANGE_MOMENTS` | const | The most moments one range may ask for. |
| `Moment` | interface | One moment of the finished video. |
| `MOMENT_FORMS` | const | The forms a moment is written in, for an error or a usage text. |
| `MoveOptions` | interface |  |
| `movePropInto` | function | Moves one prop into an object prop, under `key` (its own name when left out). |
| `movePropsInto` | function | Moves props into an object prop. |
| `MulticamActions` | interface |  |
| `Namespace` | type |  |
| `NetPatch` | interface | The reduced effect of every patch on one element. |
| `nodeOfSpec` | function |  |
| `nodesEqual` | function |  |
| `NodeSpec` | interface | A serialisable element to insert. |
| `nodeSpecOf` | function |  |
| `ok` | const |  |
| `onTimeline` | function | Composition time of an asset second, through the first play that covers it; null when it is not on the timeline. |
| `OverlayActions` | interface |  |
| `parseCube` | function | Parses a `.cube` file's text; throws a message naming the line where it is wrong. |
| `ParsedMoment` | type |  |
| `ParsedTimeRef` | type |  |
| `ParsedTranscript` | interface |  |
| `parseMoment` | function | Parses one moment. |
| `parseMoments` | function | Parses a comma-separated list of moments. |
| `parseSource` | function |  |
| `parseTimeRef` | function |  |
| `parseTranscript` | function | Reads a transcript into the manifest's word list (`assets.<id>.transcript.words`), sniffing the format when it is not given. |
| `Patch` | type | One change recorded by an action. |
| `PatchLog` | interface |  |
| `PatchLogOptions` | interface |  |
| `Placement` | interface |  |
| `PlacementSpec` | type | Where a new element goes. |
| `planCues` | function | Group timeline words into cues. |
| `playOf` | function | The play of one clip or audio placement, or null for an element that plays no asset. |
| `playsKey` | function | A stable key for the plays of one asset, so an unchanged timeline reuses the generated nodes. |
| `playsOf` | function | The clips and audio on visible tracks that play an asset, in start order. |
| `Presence` | type |  |
| `printElement` | function | A whole element as JSX text, indented with `indent`, children on their own lines. |
| `printLiteral` | function | JavaScript source for a JSON value, compact, double-quoted. |
| `printProp` | function | One JSX attribute. |
| `printValue` | function | A JSON value as source that starts `column` characters into a line indented by `indent`. |
| `PropAccess` | type | How a prop can be written. |
| `propAt` | function | Follows `path` (`"animation.preset"`) from the tag's attribute into object literals; undefined when it is not written out. |
| `PropSite` | interface |  |
| `rampAdvance` | function | Source seconds played in `rel` clip seconds. |
| `rampInverse` | function | Clip seconds that play `advance` source seconds. |
| `RampKey` | interface | A speed key. |
| `rampSpeed` | function | Speed at clip time `u` under keys sorted by `at`. |
| `Range` | type |  |
| `rangeOf` | function |  |
| `reachedHolds` | function | The holds a clip reaches when, without any hold, it would last `played` seconds. |
| `reduceInto` | function | Keep `net` reduced. |
| `removedElement` | function | What became of `<Keyframe>`, `<Effect>`, `<SpeedKey>` and `<Freeze>`, told from the props of an element whose component is undefined. |
| `renameProp` | function | Gives a prop a new name. |
| `renameValue` | function | Respells a string value. |
| `resolve` | function | Absolute placements for every element, computed from the tree, the manifests and the patch log. |
| `ResolvedState` | interface |  |
| `ResolvedTrack` | interface |  |
| `ResolveError` | interface |  |
| `ResolveErrorCode` | type |  |
| `resolveMoments` | function | Turns parsed moments into times of the finished video, in the order asked. |
| `resolveScene` | function | Resolve a `<Nested of={Scene}>` interior. |
| `resolveTimeRef` | function | Turn a reference into seconds. |
| `rules` | const |  |
| `sameAsset` | function |  |
| `samePlacement` | function | Whether two placements would render and edit the same; used to hand back the previous object. |
| `SceneFn` | type |  |
| `Shot` | interface |  |
| `Silence` | interface |  |
| `skimMoments` | function | The moments an editor skims a cut by. |
| `SourceActions` | interface |  |
| `SourceEdit` | type |  |
| `SourceIndex` | interface |  |
| `SourceIndexLike` | interface |  |
| `speedKeysOf` | function | A clip's speed keys (from `speed={[…]}`), sorted by `at`. |
| `spokenWords` | function | Every transcript word the timeline plays, at the time it plays, in timeline order. |
| `stableJson` | function |  |
| `SubjectBox` | interface | A subject's box at source second `t`, as fractions of the source picture (0..1 from its top left). |
| `SubtitleOptions` | interface |  |
| `subtitles` | function | The captions the cut plays, as an SRT or WebVTT file. |
| `tagName` | function | The tag's name as written. |
| `TARGET_PARAM_KEYS` | const |  |
| `targetIdOf` | function |  |
| `timelineRows` | function | The flat rows of a resolved timeline. |
| `TimelineRows` | interface |  |
| `TimelineWord` | interface | A transcript word at the composition time it plays. |
| `timelineWords` | function | The asset's words at the times they play, in timeline order; words outside every play are left out. |
| `TimeRef` | type |  |
| `TrackActions` | interface |  |
| `TranscriptFormat` | type |  |
| `TranscriptWord` | interface |  |
| `TransformActions` | interface |  |
| `TransitionActions` | interface |  |
| `ValidationResult` | interface |  |
| `VideoModule` | interface |  |
| `walk` | function |  |
| `WaveformSummary` | interface |  |
| `withoutEffects` | function | A patch log that turns these effects off (`enabled: false`), each named by the id the resolver gave it (`pour.effects.1`). |
| `WordRow` | interface |  |

### `@uberscene/sdk/resolver`

77 exports.

| Export | Kind | |
|---|---|---|
| `AssetEntry` | interface |  |
| `assetIdOf` | function |  |
| `AssetManifest` | interface | What the ingest service knows about an asset. |
| `assetPlay` | function | The play of one clip or audio placement. |
| `AssetPlay` | interface | Where an asset plays on the timeline. |
| `collect` | function | Walk the element tree the file's default export returned and index every vocabulary element by id. |
| `CollectedNode` | interface | One vocabulary element as collected from the React element tree, before schema parsing and before placement. |
| `CollectedTree` | interface |  |
| `collectModule` | function |  |
| `CollectOptions` | interface |  |
| `CubeLut` | interface |  |
| `Cue` | interface |  |
| `cueNodes` | function | Generated `<Caption>` nodes for the cues, as children of the captions node. |
| `CueOptions` | interface |  |
| `DEFAULT_CUE_OPTIONS` | const |  |
| `Dependent` | type | Something whose place or length is given by another element. |
| `dependentsOf` | function | The elements that depend on `id`, in timeline order of the file, each once per way it depends. |
| `Editable` | type |  |
| `EMPTY_MANIFEST` | const |  |
| `findParentOf` | function |  |
| `FreezeHold` | interface | A hold. |
| `freezeHoldsOf` | function | A clip's holds (from `freezes`), sorted by `start`. |
| `freezeShift` | function | Element-relative `rel` with the holds before it taken out, or the held source second when `rel` is inside a hold. |
| `freezeUnshift` | function | Element-relative time of clip time `u`. |
| `heldWithin` | function | Seconds of holds inside the first `length` seconds of a clip. |
| `holdTotal` | function | Total seconds the holds add to a clip. |
| `InstalledBlock` | interface | A block copied into the project. |
| `INTERIOR_PREFIX` | const | Prop keys under this prefix address a Layer's handles rather than the Layer's own props. |
| `isResolveError` | function |  |
| `isTimeRefString` | function |  |
| `Json` | type |  |
| `LayerInterior` | interface |  |
| `lookupAsset` | function |  |
| `NetPatch` | interface | The reduced effect of every patch on one element. |
| `onTimeline` | function | Composition time of an asset second, through the first play that covers it; null when it is not on the timeline. |
| `parseCube` | function | Parses a `.cube` file's text; throws a message naming the line where it is wrong. |
| `ParsedTimeRef` | type |  |
| `ParsedTranscript` | interface |  |
| `parseTimeRef` | function |  |
| `parseTranscript` | function | Reads a transcript into the manifest's word list (`assets.<id>.transcript.words`), sniffing the format when it is not given. |
| `Patch` | type | One change recorded by an action. |
| `PatchLog` | interface |  |
| `Placement` | interface |  |
| `planCues` | function | Group timeline words into cues. |
| `playsKey` | function | A stable key for the plays of one asset, so an unchanged timeline reuses the generated nodes. |
| `Presence` | type |  |
| `rampAdvance` | function | Source seconds played in `rel` clip seconds. |
| `rampInverse` | function | Clip seconds that play `advance` source seconds. |
| `RampKey` | interface | A speed key. |
| `rampSpeed` | function | Speed at clip time `u` under keys sorted by `at`. |
| `reachedHolds` | function | The holds a clip reaches when, without any hold, it would last `played` seconds. |
| `removedElement` | function | What became of `<Keyframe>`, `<Effect>`, `<SpeedKey>` and `<Freeze>`, told from the props of an element whose component is undefined. |
| `resolve` | function | Absolute placements for every element, computed from the tree, the manifests and the patch log. |
| `ResolvedState` | interface |  |
| `ResolvedTrack` | interface |  |
| `ResolveError` | interface |  |
| `ResolveErrorCode` | type |  |
| `resolveScene` | function | Resolve a `<Nested of={Scene}>` interior. |
| `resolveTimeRef` | function | Turn a reference into seconds. |
| `sameAsset` | function |  |
| `samePlacement` | function | Whether two placements would render and edit the same; used to hand back the previous object. |
| `SceneFn` | type |  |
| `Shot` | interface |  |
| `Silence` | interface |  |
| `SourceIndexLike` | interface |  |
| `speedKeysOf` | function | A clip's speed keys (from `speed={[…]}`), sorted by `at`. |
| `SubjectBox` | interface | A subject's box at source second `t`, as fractions of the source picture (0..1 from its top left). |
| `SubtitleOptions` | interface |  |
| `subtitles` | function | The captions the cut plays, as an SRT or WebVTT file. |
| `TimelineWord` | interface | A transcript word at the composition time it plays. |
| `timelineWords` | function | The asset's words at the times they play, in timeline order; words outside every play are left out. |
| `TimeRef` | type |  |
| `TranscriptFormat` | type |  |
| `TranscriptWord` | interface |  |
| `VideoModule` | interface |  |
| `walk` | function |  |
| `WaveformSummary` | interface |  |

### `@uberscene/player`

22 exports.

| Export | Kind | |
|---|---|---|
| `addFontFaces` | function | Adds faces to `document.fonts` and resolves once every one has loaded. |
| `backdropTracks` | function | The tracks whose overlays draw beneath the footage. |
| `CaptureSheetOptions` | interface |  |
| `captureWarnings` | function |  |
| `Controls` | function | Play/pause, scrubber, time readout, mute and rate. |
| `devWarn` | function | Warn once per key. |
| `FontFaceSource` | interface | A face to add to the page's fonts, from a URL or the file's bytes. |
| `MediaHandle` | type | Where an asset's bytes come from. |
| `MediaResolver` | interface |  |
| `Player` | const | Canvas for media, DOM for overlays, controls below. |
| `PlayerCore` | class | The framework-free player. |
| `PlayerErrorEvent` | interface |  |
| `PlayerEvents` | interface |  |
| `PlayerOptions` | interface |  |
| `PlayerProps` | interface |  |
| `PlayerRef` | type |  |
| `TimeSnapshot` | interface |  |
| `useCompositionFrame` | function |  |
| `useCompositionTime` | function |  |
| `useLayerClock` | function | What the kit's `useLayer()` and `useT()` delegate to while a Player is mounted. |
| `useLayerT` | function | 0..1 progress through the enclosing Layer. |
| `usePlayer` | function |  |

### `@uberscene/player/engine`

44 exports.

| Export | Kind | |
|---|---|---|
| `animatedBox` | function | The box with `box.x` and `box.y` evaluated at element-relative time `rel`; an axis with no value and no keys stays out. |
| `animatedTransform` | function | The transform with its keyframed properties evaluated at element-relative time `rel`. |
| `AssetSources` | class | One FrameSource per asset, shared by every clip of that asset and by nested compositors. |
| `AUDIO_PREROLL_SECONDS` | const | How much earlier than a range decoding starts, the start then dropped. |
| `AudioOccurrence` | interface |  |
| `blockGrid` | function | The grid of a stream, from its first two blocks decoded from the start, where their times are exact. |
| `BlockGrid` | interface | The samples where a stream's blocks start. |
| `blockStart` | function | The sample a decoded block starts at. |
| `boundsOf` | function | The upright box around `rect` after `m`. |
| `buildAudioPlan` | function | Every audio-bearing chunk that overlaps [from, to). |
| `buildFramePlan` | function | Everything the painter needs to draw composition time `t`, in draw order. |
| `buildGainEnvelope` | function | Gain over [winFrom, winTo] in composition seconds. |
| `CanvasPainter` | class | Executes a FramePlan on a 2D context of composition size. |
| `captionBox` | function | The captions' default box in a frame. |
| `captureWarnings` | function |  |
| `Compositor` | class | One tick. |
| `copyFrame` | function | Copies any frame into a canvas we own. |
| `coversCanvas` | function | Whether a draw op puts its picture over the whole canvas as it is. |
| `CreateCanvas` | type |  |
| `Ctx2D` | type |  |
| `DecoderPool` | class | Keeps a ClipDecoder for every media placement near the play head and drops the rest. |
| `defaultCreateCanvas` | function |  |
| `devWarn` | function | Warn once per key. |
| `DrawOp` | interface |  |
| `DrawRect` | interface |  |
| `Frame` | interface | One decoded picture. |
| `frameIndex` | function | The frame a composition time falls in, counted in exact ticks. |
| `FrameSource` | interface |  |
| `FrameSourceFactory` | type |  |
| `FrameSourceInfo` | interface |  |
| `GainPoint` | type | A gain breakpoint in composition seconds. |
| `isVisibleAt` | function |  |
| `makeNestedResolver` | function | Resolves `<Nested of={Helper}>` through the kit's `resolveScene`, once per helper. |
| `ManualClock` | class |  |
| `mediabunnyFrameSourceFactory` | function |  |
| `MediabunnyInputs` | class | One mediabunny `Input` per asset, shared by the video and audio sources of that asset. |
| `MediaHandle` | type | Where an asset's bytes come from. |
| `MediaResolver` | interface |  |
| `OVERLAY_KINDS` | const | Kinds the overlay plane draws (as DOM, in the preview and the export) rather than the canvas. |
| `paramsAt` | function | An effect's params, with the ones its keys animate evaluated at element-relative `rel`. |
| `PICK_EPS` | const | Container timestamps are often rounded to the millisecond, so the frame for the exact time n/fps can sit a fraction of a millisecond after it. |
| `placementSourceTime` | function | Source seconds a media placement shows at composition time `t`. |
| `SETTLE_MS` | const | Quiet time after the last setState before a paused preview fetches its exact frame. |
| `visiblePlacements` | function | Visual, timed placements that show at `t`. |

### `@uberscene/render`

84 exports.

| Export | Kind | |
|---|---|---|
| `addAsset` | function | Probes the media file, reads its transcript, and writes its entry into the manifest. |
| `AddOptions` | interface |  |
| `AddResult` | interface |  |
| `BlockFilter` | interface |  |
| `BlockInfo` | interface | One block, as `uberscene blocks` lists it. |
| `blockSheet` | function | Pastes the blocks' previews into one image, in the listing's order. |
| `BlockSheetResult` | interface |  |
| `browserCacheDir` | function | Where downloaded browsers live. |
| `checkLayout` | function | Samples the composition and reports every overlay (titles, shapes, SVG, stickers, layers, and captions), and every part a layer's code named with `data-name`, that leaves the frame, leaves the safe zone, covers captions (not captions themselves), or covers the subject, as runs of consecutive offending samples. |
| `CHROME_MILESTONE` | const | The Chrome milestone UberScene downloads. |
| `codecModes` | function | The codecs `UBERSCENE_CODECS` asks for; unset or empty is the browser's. |
| `CodecModes` | interface |  |
| `Container` | type | MP4, WebM and MOV hold video and sound; MP3 and WAV the soundtrack alone. |
| `containerOf` | function | The container a file name asks for. |
| `DEFAULT_SKILL_DIR` | const | Claude Code reads a project's skills from here; other agents take `--dir`. |
| `describeAt` | function | What is on screen and heard at one moment. |
| `describeThings` | function | What was measured at one moment, as rows. |
| `directoryResolver` | function | Finds each asset's file in a directory, or the first of several that has it. |
| `draftPath` | function | Where a draft of `out` is written. |
| `ExportSource` | interface | The file an export loads in its page. |
| `findChrome` | function | The binary the export launches. |
| `findManifest` | function | The nearest `uberscene.json` from `from` upward; failing that, a `manifest.json` in `from` itself. |
| `FontFilter` | interface |  |
| `fontSheet` | function | Draws the families as one image, each setting the same words. |
| `FontSheetOptions` | interface |  |
| `FontSheetResult` | interface |  |
| `formatAt` | function | Each moment as text. |
| `formatBlocks` | function | The blocks as text to read. |
| `formatFonts` | function | The catalogue as a table to read. |
| `formatLayout` | function | The result as a compiler prints it. |
| `formatLint` | function | One line per diagnostic, as a compiler prints them. |
| `formatTimeline` | function | The timeline as text. |
| `formatWhere` | function | The report as text. |
| `FoundManifest` | interface |  |
| `HeardElement` | interface | One sound playing at a moment. |
| `Insets` | interface | Margins as fractions of the frame's height (top, bottom) and width (left, right). |
| `inspect` | function | The timeline of a resolved file, or its moments, as text or JSON. |
| `InspectOptions` | interface |  |
| `InspectResult` | interface |  |
| `installChrome` | function | Downloads Chrome for Testing of `CHROME_MILESTONE` into the cache and returns its binary. |
| `installSkill` | function | Writes the skill into a project. |
| `LayoutCheckOptions` | interface |  |
| `LayoutCheckResult` | interface |  |
| `LayoutIssue` | interface | One element breaking one rule over a run of consecutive samples, described for a reader who cannot see the frame. |
| `LayoutRule` | type |  |
| `LintedFile` | interface |  |
| `lintErrors` | function | How many error diagnostics are left in all the files. |
| `lintFiles` | function | Lints each file; with `fix`, applies every fix and writes the files that changed. |
| `LintFilesOptions` | interface |  |
| `listBlocks` | function | Every block, or those the filter keeps, in name order. |
| `listFonts` | function | The catalogue's families for a role, a category, or both; a name that is neither is an error naming the choices. |
| `LoadedVideo` | interface |  |
| `LoadOptions` | interface |  |
| `loadVideo` | function | Evaluates a cut file the way the browser does, with the kit's `loadModule`, and resolves it against its manifest. |
| `LookCell` | interface |  |
| `LookOptions` | interface |  |
| `LookResult` | interface |  |
| `LookSound` | interface |  |
| `Loudness` | interface |  |
| `MAX_LOOK_CELLS` | const | The most cells one sheet holds. |
| `MomentView` | interface |  |
| `PlacedDiagnostic` | interface | A diagnostic with its place as an editor shows it. |
| `QUALITIES` | const | Mediabunny's quality presets by name; the name travels to the export page. |
| `QualityName` | type |  |
| `renderLook` | function | Draws the moments asked for, or the ones an editor would skim, onto one sheet. |
| `RenderOptions` | interface |  |
| `RenderResult` | interface |  |
| `renderStill` | function | Draws one frame of the composition, as the export draws it, to a PNG or JPEG. |
| `renderVideo` | function | Exports the composition. |
| `SAFE_ZONES` | const | Where a platform's own UI covers the picture. |
| `SafeZoneName` | type |  |
| `SeenElement` | interface | One element on screen at a moment, with its values there. |
| `SkillInstallOptions` | interface |  |
| `SkillInstallResult` | interface |  |
| `SourceSpot` | interface | A place in the cut file, as a compiler reports it. |
| `StillOptions` | interface |  |
| `StillResult` | interface |  |
| `VideoCodec` | type | H.264 (MP4), VP9 (WebM) and AV1 (either). |
| `WhereMoment` | interface |  |
| `WhereOptions` | interface |  |
| `WhereResult` | interface |  |
| `WhereThing` | interface |  |
| `whereThings` | function | Measures every overlay, the captions and each named part at the moments asked for. |
| `zoneRect` | function | The rectangle a zone leaves clear, in a frame of the given size. |

### `@uberscene/graphics`

13 exports.

| Export | Kind | |
|---|---|---|
| `FREE_CODE_LIBRARIES` | const | The libraries free code in a `<Layer>` may import, by import name. |
| `installFreeCodeLibraries` | function | Make `<Three>` and `<Motion>` draw (installs their layer engines) and return the imports a host passes to `loadModule`. |
| `MotionLayer` | function | What draws `<Motion>`. |
| `ThreeCamera` | interface |  |
| `ThreeFrame` | interface | What `update` gets on every frame. |
| `ThreeLayer` | function | What draws `<Three>`. |
| `ThreeScene` | function | A React Three Fiber canvas on the video's clock. |
| `ThreeSceneProps` | type |  |
| `ThreeSetup` | interface | What `setup` gets once, when the scene is created. |
| `ThreeSetupFn` | type | Return an update function, or `{ update, dispose }`; objects `setup` added to the scene are removed after it. |
| `ThreeUpdate` | type |  |
| `useLayerTime` | function | Seconds since the layer started, as a Motion value. |
| `useTimeline` | function | A Motion sequence (`[selector or element, keyframes, options]`, with `at` for placement) played on the video's clock. |

### `@uberscene/graphics/libraries`

13 exports.

| Export | Kind | |
|---|---|---|
| `FREE_CODE_LIBRARIES` | const | The libraries free code in a `<Layer>` may import, by import name. |
| `installFreeCodeLibraries` | function | Make `<Three>` and `<Motion>` draw (installs their layer engines) and return the imports a host passes to `loadModule`. |
| `MotionLayer` | function | What draws `<Motion>`. |
| `ThreeCamera` | interface |  |
| `ThreeFrame` | interface | What `update` gets on every frame. |
| `ThreeLayer` | function | What draws `<Three>`. |
| `ThreeScene` | function | A React Three Fiber canvas on the video's clock. |
| `ThreeSceneProps` | type |  |
| `ThreeSetup` | interface | What `setup` gets once, when the scene is created. |
| `ThreeSetupFn` | type | Return an update function, or `{ update, dispose }`; objects `setup` added to the scene are removed after it. |
| `ThreeUpdate` | type |  |
| `useLayerTime` | function | Seconds since the layer started, as a Motion value. |
| `useTimeline` | function | A Motion sequence (`[selector or element, keyframes, options]`, with `at` for placement) played on the video's clock. |

### `@uberscene/graphics/three`

8 exports.

| Export | Kind | |
|---|---|---|
| `ThreeCamera` | interface |  |
| `ThreeFrame` | interface | What `update` gets on every frame. |
| `ThreeLayer` | function | What draws `<Three>`. |
| `ThreeScene` | function | A React Three Fiber canvas on the video's clock. |
| `ThreeSceneProps` | type |  |
| `ThreeSetup` | interface | What `setup` gets once, when the scene is created. |
| `ThreeSetupFn` | type | Return an update function, or `{ update, dispose }`; objects `setup` added to the scene are removed after it. |
| `ThreeUpdate` | type |  |

### `@uberscene/graphics/motion`

3 exports.

| Export | Kind | |
|---|---|---|
| `MotionLayer` | function | What draws `<Motion>`. |
| `useLayerTime` | function | Seconds since the layer started, as a Motion value. |
| `useTimeline` | function | A Motion sequence (`[selector or element, keyframes, options]`, with `at` for placement) played on the video's clock. |
