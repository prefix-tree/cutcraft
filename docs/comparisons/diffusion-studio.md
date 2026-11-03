# Diffusion Studio

[Diffusion Studio](https://github.com/diffusionstudio/editor) is the project
closest to CutCraft. It is an editor built on the idea that the source file is
the document: an agent writes JSX, the app renders it, and edits on the canvas
are written back into the file. It ships as a desktop app. File references
below point into its repository as of October 2026.

## What it is

There are two repositories. `diffusionstudio/core` is the earlier product, an
imperative browser engine (`new Composition()`,
`new VideoClip(source, { range })`) published as the compiled npm package
`@diffusionstudio/core`. Without a licence key it stamps a watermark on every
frame. `diffusionstudio/editor` is the current product, built around the
file: an Electron app, a web UI, an ECS runtime (koota), a Solid reconciler
that mounts a project's JSX into that runtime, and a catalog of tools for
agents. The editor is MPL-2.0.

## The file

A Diffusion Studio project:

```tsx
export default function Project() {
  return (
    <stage background="#161616">
      <scene name="Intro" width={1920} height={1080} active>
        <sequence>
          <video id="hook" src="founder.mp4" start={0} end={5.2} sourceIn={5.6} sourceOut={10.8} transition={{ type: "dissolve", duration: 0.4 }} />
          <video id="broll" src="product.mp4" start={5.2} end={11.2} sourceIn={6} sourceOut={12} />
        </sequence>
        <text id="title" y={140} start={0.4} end={3.2} fontSize={120}>Shed</text>
      </scene>
    </stage>
  );
}
```

The same cut in CutCraft:

```tsx
<Composition fps={30} width={1920} height={1080}>
  <Track id="main">
    <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
    <Transition id="x1" type="crossfade" duration={0.4} />
    <Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" />
  </Track>
  <Track id="overlays">
    <Title id="title" anchor="start" offset={0.4} duration={2.8}>{product}</Title>
  </Track>
</Composition>
```

Diffusion Studio's file is a scene graph. Every element has absolute
`x y width height` and absolute `start end sourceIn sourceOut`. `<sequence>`
does not place anything: when you drop a clip in the editor, overlaps are
settled by trimming, deleting or splitting the clip underneath
(`packages/runtime/src/actions/overlap.ts`). There is no ripple and no
magnetic track. CutCraft's file describes an edit: sequence tracks place
clips by order, overlays anchor to other elements, and trims reference the
transcript and shot list.

| | Diffusion Studio | CutCraft |
|---|---|---|
| Placement | absolute; `start`/`end`/`sourceIn`/`sourceOut` become whole frames at 30 fps | by order on sequence tracks, `start` on free tracks, anchors for overlays; in seconds |
| Trim by meaning | none; the agent searches a transcript JSON and types seconds | `in="word:12"`, `out="shot:1.end"`, `at="word:14"`, resolved against the transcript and shot list |
| What runs | the Solid component mounts live into the ECS, and signals and effects keep writing to it | the timeline resolves without running code; `<Layer>`, `<Three>` and `<Motion>` interiors run as React on the video's clock |
| The timeline as data | exists only inside the live runtime | a placement per id that can be diffed, cached and tested without a browser |
| Tweakable values | `@inspect` constants compiled into signals and written back into the initializer | `schema` and `defaults` exports |
| Transitions | a prop on the outgoing clip; the partner must be exactly adjacent; no handles; audio hard-cuts | a sibling element; the clips overlap and both must have the handles; the player crossfades |
| Export determinism | the author must avoid `Math.random` in the tree and wrap async work in `hold()` | the same file and media give the same frames |

## The round trip

In Diffusion Studio a gesture writes to the runtime on every pointer frame.
The edits are collected per element and prop, last write wins, and flushed
after a 120 ms pause. The desktop app parses the file with ts-morph, finds the
element by id, writes the new value and saves the file atomically. Undo
replays inverse commands and lives in memory.

In CutCraft a gesture is one of 131 editor actions. Each action records its
inverse, and the change is written back to the file as the smallest text
edit at a sync point, usually once per gesture.

The two designs are close. The differences are in policy:

| | Diffusion Studio | CutCraft |
|---|---|---|
| Ids | added to your file automatically when missing | required; a lint error when missing |
| A prop set from an expression (`x={MARGIN}`) | overwritten by the literal | locked, unless it refers to a `schema` prop, in which case `defaults` is updated |
| An element inside a loop | the first edit unrolls the whole loop in the source, and this cannot be undone | generated elements become literals on the first gesture, as an action that can be undone |
| View state (selection, playhead, zoom) | written into the file | never in the file |
| When the file is written | 120 ms after the last edit; a long drag writes several times | at a sync point, once per gesture |
| Edits that could not be written | skipped silently | reported back to the caller |
| Undo after a reload | lost; any outside change to the file clears history | history is data and can be saved with the file |

## Playback and export

Diffusion Studio's preview has some things CutCraft does not: scrubbing snaps
to keyframes while you drag and seeks exactly after you stop, a clip's decoder
is handed over when the clip is split, audio plays at other speeds with WSOLA
time stretch, and `syncTo` lines up audio by cross-correlation. On the other
hand its video playhead runs on `requestAnimationFrame` time and nothing
corrects drift against the audio clock. CutCraft uses Web Audio as the master
clock and shares one decoder input per media file across clips.

Diffusion Studio exports in Chrome, drawing on a GPU canvas. CutCraft exports
in Node with no browser. On one machine the two are level on plain cuts, and
Diffusion Studio is faster on crossfades and graphics, where CutCraft draws on
the CPU. See [Export speed](/comparisons/export-speed). CutCraft's Node export
also draws Layers with a subset of CSS and leaves out `<Three>` and
`<Motion>` for now ([Exporting](/guide/exporting)).

## The agent

Diffusion Studio gives its agent eighteen tools, and none of them edits: the
agent edits the file, and saving is the edit. The tools gather evidence
(probe, transcribe, waveform, filmstrip, grab a frame, listen) and verify the
result: `check` finds black frames, invisible nodes and zero durations without
rendering, and `capture` renders labelled contact sheets. In CutCraft the
transcript and shot list are prepared before the model writes, and the model
verifies with the lint and the layout check (`--check-layout`).

## When to pick which

Pick Diffusion Studio if you want a desktop editor today with an agent built
in, if your videos are graphics-heavy and export speed matters, or if you
prefer placing everything at absolute positions and times.

Pick CutCraft if your cuts should follow a transcript, so trims, transitions
and captions keep working when the edit changes. It also fits if you want the
timeline as plain data you can test without a browser, edits that land in the
file as one-token changes with undo you can keep, or export on a server with
no browser.
