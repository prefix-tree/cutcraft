# Diffusion Studio

[Diffusion Studio](https://github.com/diffusionstudio/editor) is the closest
project to cutcut: an editor whose thesis is "the source is the document",
where an agent writes JSX, the app renders it, and canvas edits are written
back into the file. It ships as a desktop app with real users. This page
records what it does, where cutcut differs, and what cutcut adopts from it.
File references point into their repository at the commit of 2026-10-19;
the conclusions are in [decision 0012](../decisions/0012-what-we-adopt-from-diffusion-studio.md).

## What it is

Two repositories. `diffusionstudio/core` is the earlier product, an
imperative browser engine (`new Composition()`, `new VideoClip(source, { range })`)
shipped as the compiled npm package `@diffusionstudio/core`; its repository
holds docs and a playground. `diffusionstudio/editor` is the current product,
started over on the file-based idea: an Electron app (`apps/desktop`), a web
UI (`apps/web`, about 65k lines), a koota ECS runtime (`packages/runtime`,
about 19k lines), a Solid reconciler that mounts a project's JSX into that
runtime (`packages/reconciler`), the type-only authoring package
(`packages/jsx`), and a tool catalog for agents (`packages/dapi`). MPL-2.0,
24 test files, release workflows but no CI on pull requests.

## Same thesis, different file

Theirs:

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

Ours:

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

Their file is a scene graph: every element has absolute `x y width height`
and absolute `start end sourceIn sourceOut`, and `<sequence>` places nothing
(nothing in the runtime reads `Sequential` for timing; it strips transforms,
allows a `transition` prop and settles overlaps on editor drops by trimming,
deleting or splitting the clip underneath, `packages/runtime/src/actions/overlap.ts`).
There is no ripple and no magnetic track; the menu item "Toggle magnetic
track" has no handler. Ours is an edit: sequence tracks place by order,
overlays anchor, and trims reference the transcript.

| | Diffusion Studio | cutcut |
|---|---|---|
| placement | absolute; `start`/`end`/`sourceIn`/`sourceOut` become `Delay`/`Trim` in whole frames at 30 fps | by order on sequence tracks, `start` on free tracks, anchors for overlays; seconds, not frames |
| trim by meaning | none; the agent greps a transcript JSON and types seconds, with a comment naming the word | `in="word:12"`, `out="shot:1.end"`, `at="marker:x"` resolved against the manifest |
| what runs | the Solid component mounts live into the ECS; signals, effects and `useTicker` keep writing traits | a pure resolve over the file; only `<Layer>` interiors run as React |
| the timeline as data | exists only as `Computed` traits in a live world | `ResolvedState`: a placement per id, diffable, cacheable, testable without a browser |
| tweakable values | `@inspect` consts compiled into signals, written back into the initializer | `schema`/`defaults` exports; bound props fold into `defaults` |
| transitions | a prop on the outgoing clip; partner found by exact frame adjacency; no handles (held frames); audio hard-cuts | a sibling element; the resolver overlaps the clips and checks handles; the player crossfades |
| export determinism | the module is re-executed in a fresh world; the author must avoid `Math.random` in tree shape and wrap async in `hold()` | deterministic by construction: same file, manifest and patches give the same placements and frames |

## The round trip

Theirs (`apps/web/src/engine/editor.ts`, `apps/web/src/projects/edits.ts`,
`apps/desktop/src/edit.ts`): a gesture writes the ECS first, on every pointer
frame. `EditWriter` folds the edits into maps keyed by element and prop with
last write wins and flushes after a 120 ms debounce. In the main process
`SourceWriter` parses the file with ts-morph, finds the element by id, prints
the value, and writes the file atomically; a content hash lets the file
watcher ignore the app's own write, so the canvas never remounts for an edit
it made. Undo replays inverses through the same editor commands and is held
in memory.

Ours: a gesture dispatches an action; `apply` appends patches; the resolver
applies the net patches over the file (about a microsecond per element); the
fold writes one-token edits at the sync point. History is the list of
actions, each with an inverse.

The two are closer than they look: their `EditWriter` is a patch log with a
fold and no resolver, because the live ECS is the overlay. The differences
are policy:

| | Diffusion Studio | cutcut |
|---|---|---|
| ids | stamped into the user's file before every compile (6 base-36 characters) when missing | required; a lint error when missing |
| an expression prop (`x={MARGIN}`) | overwritten by the literal ("the user wins") | locked unless it references a `schema` prop, in which case the fold writes `defaults` |
| an element inside a loop | the first edit unrolls the whole `<For>` in the source, irreversibly | generated elements bake to literals on the first gesture, as an action with an inverse |
| a component used twice | no guard; both copies share one `__source` | both copies are `generated`; a gesture bakes first |
| view state | selection, active scene, playhead, camera and timeline zoom are written into the file | never in the file |
| when the file is written | 120 ms after the last edit; a long drag writes several times | at a sync point; the recommended policy is once per gesture (decision 0012) |
| skipped writes | silent (duplicate ids, non-unrollable loops, an `@inspect` initializer that became an expression) | reported in `foldToSource().skipped` |
| undo across a reload | lost; any external change clears history | the log and history are data and can be persisted with the revision |

## Playback

Their preview (`packages/runtime/src/media/video.ts`) shares a mediabunny
`Input` and keyframe index per asset, with a decoder and a frame atlas per
clip, scrub-to-keyframe while dragging and an exact seek after the drag
settles, idle disposal after 10 s, and a warm handoff of the decoder when a
clip is split. Export opens a new `Input` and `CanvasSink` per clip. Audio is
scheduled about 15 frames ahead with WSOLA time stretch at other rates, but
the video playhead advances on `requestAnimationFrame` wall-clock deltas and
nothing corrects drift against the AudioContext; shuttling is silent.

Ours shares one `Input` per asset across clips and nested compositions, keeps
a per-clip decoder with a short forward queue, makes Web Audio the master
clock, and gives every chunk an offset, duration and rate on the output. We
do not have scrub-to-keyframe, decoder handoff on split, WSOLA, or their
`syncTo` cross-correlation (`packages/runtime/src/media/audio-sync.ts`); the
first and last are worth taking later.

Their `check` (`apps/web/src/dapi/handlers/check.ts`) is a structural lint
that finds black frames, never-visible nodes, zero durations and source
errors without rendering. Their `capture` renders export-equivalent frames
as labelled contact sheets. Both are the agent's verification loop, and both
are cheap to provide over `ResolvedState` and `renderFrame`.

## The agent

Their agent gets eighteen tools (`packages/dapi/src/catalog.ts`) and none of
them edits. They split into evidence (`probe`, `transcribe` to a word-timed
JSON the agent greps, `waveform` with silences, `filmstrip`, `grab` with
settled-frame detection, `listen`, segmentation through `generate`) and
verification (`check`, `capture`); the agent edits the file and saving is the
edit. Our manifest is their evidence precomputed; what we lack is
verification, which decision 0012 adds.

Their skill (`docs/skills/editor.md` and the walkthroughs) carries editing
policy that is independent of the file model and worth adopting almost
verbatim: write a brief first; lay down the A-roll, then B-roll, captions
last; with no target length make no editorial cuts, drop only silences and
retakes, keep the last take; pauses live inside clips, not as gaps; leave
0.3–0.5 s between sentences, at most 0.8 s of tail, never cut mid-word; move
`start` and `sourceIn` together; verify after every stage, scaled to the
change, with `check` then `capture`, never by exporting.

## Verdict

Keep cutcut's file model. Their design confirms the write-back idea works
for real users and shows the cost of absolute placement: every trim is
arithmetic the agent does by hand, a transition breaks on a one-frame gap,
and captions drift unless two props move together. Our resolver, sequence
tracks and transcript references exist to remove exactly that work.

Adopt their editing policy, their verification loop (a `check` over the
resolved state, a `capture` over `renderFrame`), and fold-per-gesture as the
write policy. Watch their preview tricks (scrub-to-keyframe, handoff on
split) and `syncTo` for a later player round.
