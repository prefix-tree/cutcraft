# Remotion

[Remotion](https://www.remotion.dev) is a React framework for making video in
code. A composition is a React component plus `fps`, a size and
`durationInFrames`, and the picture at a frame is whatever the component
renders for that frame. It ships a Player, a Studio, a server renderer on
headless Chrome, and `@remotion/web-renderer` for rendering in the browser.
Its licence has a paid tier for companies.

Both Remotion and CutCraft keep a video in a TSX file. They differ in what the
file describes and in how it becomes an MP4.

## What the file describes

In Remotion the whole video is free code: React decides every pixel of every
frame ([the core idea](https://www.remotion.dev/docs/idea)). In CutCraft the
timeline is a set of elements (`<Composition>`, `<Track>`, `<Clip>`,
`<Audio>`, `<Transition>`, `<Captions>`, `<Marker>`, `<Keyframe>` and others)
with literal ids, and anything visual on top of it can be free code. A
`<Layer>` holds any React, hooks, CSS, canvas or WebGL. `<Three>` and
`<Motion>` put three.js and Motion on the timeline. All of it runs on the
video's clock, so scrubbing and seeking show the exact frame. See
[Free code](/guide/free-code).

| | Remotion | CutCraft |
|---|---|---|
| Placement | `<Sequence from durationInFrames>`, in absolute frames ([composition](https://www.remotion.dev/docs/terminology/composition)) | sequence tracks place clips by order; free tracks by `start`; overlays anchor to another element |
| Trimming footage | `<Video>` or `<OffthreadVideo>` from `@remotion/media` | `<Clip>` trimmed by seconds, or by meaning: `in="word:12"`, `out="shot:3.end"` |
| Overlay timing | frame numbers | `anchor="hook" at="word:14"`, so a graphic follows the word through every trim |
| Animation | `interpolate()` and `spring()` inline | `<Keyframe>` children, `<SpeedKey>`, `<Freeze>`; inside a Layer, `useT()`, `useLayer()` or any animation library |
| Inputs | `defaultProps` with a Zod schema; `calculateMetadata()` for dynamic metadata | `schema` and `defaults` exports |
| Effects | `@remotion/effects`, about 90 GPU effects passed as `effects={[...]}` | CSS filters, vignette and grain today; other effects are accepted but not drawn yet ([what renders](/reference/rendering)) |
| Ready-made graphics | none built in; you write components | a library of titles, shapes and graphics, next to free code |

## Editing and the round trip

Remotion Studio edits the composition's top-level input props through their
Zod schema. Its interactive mode goes further: you can select sequences, drag
to move, scale or rotate them, and edit keyframes, and the change is written
back to the source with undo
([interactivity](https://www.remotion.dev/docs/studio/interactivity)). What it
cannot read as a literal value it greys out. Its
[best practices](https://www.remotion.dev/docs/studio/interactivity-best-practices)
ask for one JSX node per editable item and literal values, which are close to
the rules CutCraft's lint checks.

CutCraft's editor edits a timeline rather than a component tree. Trims ripple
the clips after them, transitions overlap their neighbours, and captions and
overlays follow the words they are anchored to. There are 131 editor actions,
each with validation and undo. A gesture is written back into the file as the
smallest text change, usually one token:

```diff
-<Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
+<Clip id="hook" src="asset:founder" in="word:12" out="word:22.end" />
```

In short, Remotion's Studio edits what a component draws. CutCraft's editor
edits the cut. See [Editing](/guide/editing).

## Rendering

Remotion draws everything with Chrome. Its server renderer takes a screenshot
of the page for every frame, or draws through HTML-in-Canvas with
`<HtmlInCanvas>`. `@remotion/web-renderer` encodes in the browser with
WebCodecs and Mediabunny and supports a subset of tags and CSS
([client-side rendering](https://www.remotion.dev/docs/web-renderer)). Long
renders can be split across machines with Remotion Lambda.

CutCraft's player runs in the browser: footage decodes through WebCodecs (via
Mediabunny) onto a canvas, overlays are DOM, and Web Audio is the clock. The
export runs in Node with no browser, on the same engine. It draws Layers with
Satori, which supports a subset of CSS, and leaves out `<Three>` and
`<Motion>` for now with a warning. An export through headless Chrome
(HTML-in-Canvas and WebCodecs) that draws everything is on the roadmap. Until
then, a video made mostly of free code exports completely from Remotion and
only partly from CutCraft. See [Exporting](/guide/exporting).

On speed, CutCraft is about ten times faster than Remotion on plain cuts and
faster on drawn frames too, measured on one machine. The numbers and method
are on [Export speed](/comparisons/export-speed).

## A model as the author

Both work with a model that writes TSX. In Remotion the model writes
components and the frame numbers it computed itself. In CutCraft the model
writes `<Clip in="word:12" out="word:23.end">` against a transcript and shot
list, and CutCraft computes the seconds. The lint and the layout check
(`--check-layout`, which reports overlays that leave the frame or safe zone or cover the captions or subject, with the smallest fix)
give the model something to verify against without exporting.

## When to pick which

Pick Remotion if your video is mostly motion graphics or templated data
video, if you need every CSS and browser feature in the export today, if you
want its GPU effects, or if you render at volume and want Lambda.

Pick CutCraft if your video is cut from footage (talking heads, podcasts,
product demos) and the cuts should follow the transcript. It also fits if a
model writes the file and a person refines it in a timeline editor, with
every edit landing back in the file, or if you need to export on a server
without a browser.
