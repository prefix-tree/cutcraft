# API

The functions, components and options you call from code: the player in the browser, the renderer in Node, and the kit entry points both build on.

## @cutcraft/player

```tsx
import { Player, type PlayerRef } from "@cutcraft/player";
import "@cutcraft/player/fonts.css";
import { collectModule, resolve } from "@cutcraft/kit";
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

Import `@cutcraft/player/fonts.css` once in the app. It loads the bundled font families, so the preview sets text in the same faces as the export.

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
import { PlayerCore } from "@cutcraft/player";

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
  | { kind: "path"; path: string }; // a file on disk, for the Node renderer
```

A map passed as `media` is turned into a resolver that answers a string with `url` and a Blob with `blob`, and rejects an id it does not hold.

## @cutcraft/render

Renders a file to a video, a still image or a layout report in Node.

```ts
import { directoryResolver, loadVideo, renderVideo } from "@cutcraft/render";

const video = await loadVideo("video.tsx", { manifest: "manifest.json" });
const result = await renderVideo({
  state: video.state,
  media: directoryResolver("media", video.manifest),
  interiors: video.interiors,
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
| `interiors` | `ReadonlyMap<string, ReactNode>` | The children of each `<Layer id>`, for `renderVideo`, `renderStill` and `checkLayout`. |

### directoryResolver

`directoryResolver(dir: string, manifest: AssetManifest, overrides?: Record<string, string>): MediaResolver`

Finds each asset's file in `dir`: `<dir>/<id>` with no extension or with one of the usual media extensions (`.webm`, `.mp4`, `.mov`, `.mkv`, `.m4v`, `.ogg`, `.opus`, `.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`). An entry in `overrides` gives the path for that asset id instead.

### renderVideo

`renderVideo(options: RenderOptions): Promise<RenderResult>`

Renders the composition to a file one frame at a time, through the same plan and painter as the preview.

| Option | Type | Default | |
|---|---|---|---|
| `state` | `ResolvedState` | | The resolved composition. |
| `media` | `MediaResolver` | | Where each asset's file is. Usually `directoryResolver`. |
| `out` | `string` | | The file to write. Its extension picks the container unless `container` is given. |
| `container` | `"webm" \| "mp4" \| "mov" \| "mp3" \| "wav"` | from `out` | `.mp4`, `.mov`, `.mp3` and `.wav` by extension, WebM otherwise. MP3 and WAV hold only the soundtrack. |
| `videoCodec` | `"vp9" \| "vp8" \| "av1" \| "avc" \| "hevc" \| "prores"` | VP9 in WebM, AVC in MP4, ProRes in MOV | The video codec. It must fit the container. |
| `bitrate` | `number` | about 0.1 bits per pixel per frame | Video bits per second. |
| `quality` | `"very-low" \| "low" \| "medium" \| "high" \| "very-high"` | | An encoder quality preset, in place of `bitrate`. |
| `keyFrameInterval` | `number` | `2` | Seconds between keyframes. |
| `from` | `number` | `0` | Start of the part to render, in composition seconds. |
| `to` | `number` | the composition's duration | End of the part to render, in composition seconds. |
| `interiors` | `ReadonlyMap<string, ReactNode>` | | The children of each `<Layer id>`, from `loadVideo`. Without them layers draw nothing. |
| `fonts` | `OverlayFont[]` | | Fonts beyond the bundled Inter, picked by a title's `font` prop. `{ name, data: Buffer \| ArrayBuffer, weight?, style?: "normal" \| "italic" }`. |
| `speed` | `"quality" \| "balanced" \| "fast"` | `"balanced"` | Compression against speed for the software H.264 and HEVC encoders. |
| `hardware` | `boolean` | `true` | H.264 and HEVC use the machine's hardware encoder when it has one that works. `false` keeps software. |
| `parallel` | `ParallelOptions` | | Render in worker threads. See below. |
| `smartCopy` | `boolean` | | Copy encoded pictures from the source where a stretch shows only one file (VP8 or VP9, at the composition's size and frame rate, no overlay or effect), and render only the ends. |
| `silent` | `boolean` | | Skip the soundtrack. |
| `audioBitrate` | `number` | `128000` | Audio bits per second. |
| `onProgress` | `(p: { frame: number; frames: number }) => void` | | Called as frames are done. |
| `signal` | `AbortSignal` | | Stops the render when aborted. |
| `onAssetError` | `"throw" \| "continue"` | `"throw"` | When an asset cannot be opened or decoded: stop, or draw the grey placeholder and go on. |

`ParallelOptions`. Each worker loads the file itself, because a React tree cannot cross threads. One thread is the default, because workers measured no faster.

| Option | Type | Default | |
|---|---|---|---|
| `file` | `string` | | The cut file, as given to `loadVideo`. |
| `load` | `LoadOptions` | | The options for `loadVideo` in each worker. |
| `mediaDir` | `string` | | The folder of media files, as for `directoryResolver`. |
| `overrides` | `Record<string, string>` | | Per asset paths, as for `directoryResolver`. |
| `workers` | `number` | `defaultWorkers()`, which is 1 | Threads. One means no workers. |
| `segmentFrames` | `number` | about a third of an even split | Frames per run, in whole keyframe intervals. |

`RenderResult`:

| Field | Type | |
|---|---|---|
| `frames` | `number` | Pictures written; 0 for MP3 or WAV. |
| `audio` | `boolean` | Whether the file has an audio track. |
| `fps`, `width`, `height` | `number` | The composition's frame rate and size. |
| `wallMs` | `number` | Time the render took. |
| `workers` | `number` | Threads that rendered; 1 when it ran in this one. |
| `copiedFrames` | `number` | Frames copied from a source instead of rendered. |
| `stagesMs` | `{ composite, overlays, readback, encode, audio }` | How long the frame loop waited on each stage, summed over frames. |
| `warnings` | `string[]` | What was left out and why. |
| `errors` | `PlayerErrorEvent[]` | Assets that could not be opened or decoded. |

`containerOf(out)` returns the container a file name asks for, by the same rule as `container`.

### renderStill

`renderStill(options: StillOptions): Promise<StillResult>`

Draws one frame through the same pipeline as `renderVideo` to a PNG or a JPEG.

| Option | Type | Default | |
|---|---|---|---|
| `state` | `ResolvedState` | | The resolved composition. |
| `media` | `MediaResolver` | | Where each asset's file is. |
| `out` | `string` | | The image to write. `.jpg` or `.jpeg` writes a JPEG, anything else a PNG. |
| `time` | `number` | | Composition seconds. The frame showing at that time is drawn. It must be within the composition. |
| `interiors` | `ReadonlyMap<string, ReactNode>` | | As for `renderVideo`. |
| `fonts` | `OverlayFont[]` | | As for `renderVideo`. |
| `onAssetError` | `"throw" \| "continue"` | | As for `renderVideo`. |

`StillResult` has `frame`, `width`, `height`, `warnings` and `errors`.

### checkLayout

`checkLayout(options: LayoutCheckOptions): Promise<LayoutCheckResult>`

Samples the composition and reports every overlay (titles, shapes, graphics, stickers, layers and captions) that leaves the frame, leaves the safe zone, covers captions, or covers the subject. Each issue is a run of consecutive samples. Overlays beneath the footage, ones whose ink fills the frame, and moments where an element is fainter than 10% are not checked.

| Option | Type | Default | |
|---|---|---|---|
| `state` | `ResolvedState` | | The resolved composition. |
| `media` | `MediaResolver` | | Where each asset's file is. |
| `interiors` | `ReadonlyMap<string, ReactNode>` | | As for `renderVideo`. |
| `fonts` | `OverlayFont[]` | | As for `renderVideo`. |
| `safeZone` | `SafeZoneName \| Insets` | `"title-safe"` | A named zone from `SAFE_ZONES`, or your own margins. |
| `subject` | `{ x, y, w, h }` | | Where the subject is, as fractions of the frame, while footage shows whose manifest entry has no `subjects`. |
| `step` | `number` | one frame | Seconds between samples. |
| `from` | `number` | `0` | Start, in composition seconds. |
| `to` | `number` | the composition's duration | End, in composition seconds. |
| `source` | `{ file: string; text: string }` | | The cut file's path and text, so each issue points at its place in the JSX. |

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
const { entry, manifest } = await addAsset("media/talk.mp4", { manifest: "manifest.json" });
```

What `cutcraft add` does: probes the media (kind, duration, fps, size, sound), reads the transcript beside it
(`talk.json`, `talk.vtt`, `talk.srt`) or `transcript`, and writes the entry into the manifest. Options: `manifest`,
`id`, `transcript`. The result also has `transcript` (the file read), `estimated` and `warnings`.

### Constants

`QUALITIES` maps each quality name (`very-low`, `low`, `medium`, `high`, `very-high`) to mediabunny's preset. Its keys are the values of `quality`.

`Speed` is `"quality" | "balanced" | "fast"`, the type of `speed`.

### Lower-level exports

Plumbing for the CLI, the workers and other packages: `OverlayPlane`, `mixBlock`, `mixPlan`, `envelopeAt`, `MediabunnyPcm`, `planSegments`, `defaultWorkers`, `subjectRects`, `frameSourceHooks`, `DecodedFrame`, `RgbaFrame`, `makeDecodedFrame`, `inlineSvgImages`, `safeSvgFonts`, `treeKey`, `createCanvas`, `initEnv`.

## @cutcraft/kit

The kit has no DOM. It turns a file into a resolved state, edits it with actions, and writes edits back to the text. See [Editing](/guide/editing) for how these fit together and [Actions](/reference/actions) for every action.

From `@cutcraft/kit`:

| Export | Signature | |
|---|---|---|
| `collectModule` | `(mod: VideoModule, overrides?: Record<string, unknown>, options?: CollectOptions) => CollectedTree` | Calls the file's default component with `defaults` and `overrides` and collects the element tree. |
| `resolve` | `(tree: CollectedTree, manifest: AssetManifest, log?: PatchLog) => ResolvedState` | Absolute placements by id, with the patch log applied. |
| `Executor` | `new Executor({ tree, manifest, log?, history? })` | Runs actions: `execute(input)`, `undo()`, `redo()`, `state()`, `log()`, `history()`, `beginGroup()`, `endGroup()`, `replaceTree(tree)`. |
| `useT` | `() => number` | Progress through the enclosing `<Layer>`, 0 to 1. Needs a mounted player. |
| `useLayer` | `() => LayerClock` | The layer's clock: `t`, `elapsed`, `remaining`, `duration`, `time`, `fps`. Needs a mounted player. |
| `interpolate` | `(input, inputRange, outputRange, options?: { easing?, extrapolateLeft?, extrapolateRight? }) => number` | Piecewise map from one range onto another. Extends past the ends unless `"clamp"`. |
| `spring` | `({ time, from?, to?, mass?, damping?, stiffness?, overshootClamping? }) => number` | A physical spring at `time` seconds. Defaults: `from` 0, `to` 1, mass 1, damping 10, stiffness 100. |
| `random` | `(seed: string \| number) => number` | A number in [0, 1) fixed by `seed`, the same every frame in the preview and the export. |
| `parseTranscript` | `(text: string, format?: "srt" \| "vtt" \| "json") => { words, estimated }` | Reads SRT, WebVTT or speech-to-text JSON (OpenAI, whisper, whisper.cpp, ElevenLabs) into the manifest's word list ([Getting a transcript](/guide/captions-and-sound#getting-a-transcript)). |
| `subtitles` | `(state: ResolvedState, { format: "srt" \| "vtt", from?, to? }) => string` | The captions the cut plays, as a subtitle file. |
| `font` | `({ family, src: "asset:<id>", weight?, style? }) => string` | Declares a face from a font file and returns its family ([Fonts](/guide/themes#fonts)). The file's faces are on `state.fonts`. |
| `googleFont` | `(family, { weights?, styles? }?) => string` | Declares a Google Fonts family, one face per weight and style, and returns it. The export downloads it once into a local cache. |

From `@cutcraft/kit/source`:

| Export | Signature | |
|---|---|---|
| `loadModule` | `(source: string, options?: { imports?: Record<string, unknown> }) => CutModule` | Evaluates a file's text. It may import `react`, `zod` and `@cutcraft/kit`, plus `imports`. |
| `lint` | `(text: string, options?: { manifest?, rules? }) => Diagnostic[]` | Static checks that keep a file editable. Each `Diagnostic` has `rule`, `severity`, `message`, `range`, and `id` and `prop` when known. |
| `foldToSource` | `(text: string, log: PatchLog, state: ResolvedState, maxRounds?: number) => FoldResult` | Writes the patch log's net effect back into the text. `FoldResult` has `text`, `edits`, `baked` and `skipped`. |
| `buildSourceIndex` | `(text: string) => SourceIndex` | Where each element, prop and helper sits in the text. |
