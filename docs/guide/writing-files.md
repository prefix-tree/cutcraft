# Writing a file

This page follows one file from brief to pixels: the launch recap in
[`examples/launch-recap`](https://github.com/bsnisar/cutcut/tree/main/examples/launch-recap).
The brief is a paragraph a person wrote; the prompt is what the model was
given; the file is what it wrote. Every convention in the file exists for a
reason, and this page gives the reason, the alternative we rejected, and what
goes wrong without it.

## The brief

> Make a 25–30 second launch recap for Shed, a cloud for small software. Open
> on the founder's key sentence from the interview. Cut to product b-roll with
> a slow push-in, then the screen demo, then back to the founder for the close.
> Put the product name and tagline on a title card at the top, a lower third
> when the founder comes back, captions for everything the founder says, and a
> music bed that ducks under speech. End on a card with the call to action.
> The product name, the tagline, the accent colour and the call to action must
> be tweakable afterwards without touching the edit.

With it came `manifest.json`: five assets, the founder interview with sixty
timed words, three shots and four silences; product b-roll with three shots;
a screen recording; a music track; the logo.

## The prompt

The model receives [`prompt.md`](https://github.com/bsnisar/cutcut/blob/main/examples/launch-recap/prompt.md):
the file shape, the vocabulary, ten conventions and the instruction to check
its own work the way the lint will. It is short enough to read in a minute,
and it explains what the editor will do with each construct rather than
listing rules.

## The file

```tsx
export const schema = z.object({
  product: z.string().describe("Product name on the title card"),
  tagline: z.string().describe("One line under the title"),
  accent: z.string().describe("Accent colour for the lower third and the call to action"),
  cta: z.string().describe("Call to action on the closing card"),
});
export const defaults = { product: "Shed", tagline: "A cloud for small software", accent: "#ff5a1f", cta: "getshard.sh" };

export default function Video({ product, tagline, accent, cta }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#0b0d12" }}>
      <Marker id="m-hook" at={0} label="hook" />
      <Track id="main" name="Story">
        {/* The sentence the whole recap hangs on; trimmed by words so a re-transcription keeps it. */}
        <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        <Clip id="broll" src="asset:product" in="shot:1" out="shot:1.end" fit="cover">
          <Keyframe id="broll-sx0" property="transform.scale.x" at={0} value={1} easing="easeInOutSine" />
          <Keyframe id="broll-sx1" property="transform.scale.x" at={6} value={1.08} />
          …
        </Clip>
        <Clip id="demo" src="asset:screen" in={2} duration={7} />
        <Transition id="x2" type="crossfade" duration={0.4} />
        <Clip id="close" src="asset:founder" in="word:40" out="word:52.end" />
        <Clip id="outro" src="asset:logo" duration={3} fit="contain" transform={{ scale: 0.35 }} />
      </Track>
      <Track id="overlays" name="Overlays">
        <Title id="title" anchor="start" offset={0.4} duration={2.8} size={120} …>{product}</Title>
        <Title id="tagline" anchor="title" offset={0.5} duration={2.3} …>{tagline}</Title>
        <LowerThird who="Bohdan Snisar" what="Founder, Shed" accent={accent} />
        <Layer id="cta" anchor="outro" offset={0.3} duration={2.5}>
          <CallToAction text={cta} accent={accent} />
        </Layer>
      </Track>
      <Track id="music" layout="free" role="music">
        <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.35} fade={{ in: 0.5, out: 1.5 }} duck={{ under: "main", to: 0.15 }} />
      </Track>
      <Captions id="captions" style={{ position: "bottom", size: 44 }}>
        <Caption id="cap-1" start={0} end={3} text="Small software still deserves a real cloud." />
        …
      </Captions>
    </Composition>
  );
}
```

The whole file is 95 lines. It resolves to 29 addressable elements and
25.6 seconds. Now the choices, one at a time.

## The file is the video

There is no project JSON beside this file. The resolver reads it, the editor
edits it, the player plays it, the model rewrites it. The alternative, a
document with a code export, means two sources of truth and a model that
cannot see what the user changed. See [decision 0001](../decisions/0001-the-file-is-the-video.md).

What goes wrong without it: a user drags a clip, the document changes, the
model's next edit is based on the file it wrote an hour ago, and one of the two
edits is lost.

## A fixed vocabulary, not free React

`<Clip>`, `<Title>`, `<Track>` are components with Zod schemas that render
nothing. The resolver reads their props without running anything but pure
helpers. Free React (`<div>`s with styles) would be more expressive and
impossible to edit from a timeline: nothing says which `div` is the clip or
where its timing lives.

The model keeps React where React is needed: inside `<Layer>` (below).

## Every element has a literal id

`hook`, `broll`, `lt-bg`, `cap-3`. A gesture on the timeline finds its target
by id; a patch names its target by id; the preview puts `data-el="hook"` on
the DOM; the model replaces `out="word:23.end"` on the element whose id it
knows. An expression as an id (`id={`clip-${i}`}`) cannot be addressed and is
a lint error (`literal-ids`), except as the generated pattern inside a helper.

Diffusion Studio stamps missing ids into the file on first save. We prefer
that the author write them, so that the file the model handed over is the
file that runs.

## `schema` and `defaults` are the tweaks contract

The brief asked for four things to be tweakable "without touching the edit".
They are `z.object` fields with descriptions; the inspector grows a control
for each (the example app's form). Changing one re-resolves the file with
overrides; saving rewrites the `defaults` literal and nothing else. This is
Claude Design's `EDITMODE` literal done as a typed export, and Diffusion
Studio's `@inspect` consts done as a schema.

## Schema props bind, expressions lock

`out={closeOut}` where `closeOut` is a `schema` prop is *bound*: the index
records which key the prop reads, the timeline drags it like a literal, and
the fold writes the new value into `defaults` so every element reading
`closeOut` follows. `out={start + 2}` is an *expression*: nothing in the file
says what a new value should become, so the prop shows locked and the editor
offers to bake it into a literal first. The lint warns on the second, not the
first.

## Trim by meaning: time references

`in="word:12" out="word:23.end"` is the sentence "Small software still deserves
a real cloud. It should take one file." The resolver turns it into 5.6–10.8 s
against the manifest. `in="shot:1"` is the second shot of the b-roll. The
screen recording has no transcript, so `demo` uses numbers.

Why: the model reasons in words and shots, not in seconds, and a
re-transcription or a re-ingest must not move the cut. When the user drags that
edge in the timeline, the editor writes seconds, because that is what the
gesture said. See [decision 0006](../decisions/0006-time-references-against-a-manifest.md).

## Sequence tracks place by order

`main` is a sequence track: `hook`, then `broll`, then `demo`, then `close`,
then `outro`, back to back, with the two crossfades overlapping their
neighbours by 0.4 s. No clip has a `start`; writing one is a lint error
(`no-start-on-sequence`). Trim `hook` and everything after it moves.

A `<Gap>` on this track is black unless another track covers it, so the lint
warns (`sequence-gap`); pauses belong inside clips, as trailing silence kept
in the trim. A numeric trim that lands inside a transcript word gets a
warning too (`cut-inside-word`), with the `word:N` reference to use instead.
So does a cut within 0.3 s of one of the source's own shot changes on the
side that flashes the other shot (`cut-near-shot`, naming the `shot:N` edge),
and a crop over a range the camera cuts inside (`shot-change-inside-crop`).

`music` is a free track: the bed has `start={0}` and `duration="fill"`, so it
runs to the end of whatever the sequence became.

What goes wrong without it: every trim becomes arithmetic across the file, and
the model gets it wrong.

## Overlays anchor

The title anchors to `"start"`, the tagline to the title, the lower third to
`close`, the call to action to `outro`. Move the close and the lower third
follows; the file holds no absolute times for overlays at all. An anchor that
points at nothing or forms a cycle is a resolve error.

A graphic that belongs to a spoken word anchors to the clip that says it and
names the word with `at`:

```tsx
<Title id="ten-outputs" anchor="make-1" at="word:14655" duration={3}>10× output</Title>
```

`anchor` picks the clip occurrence (the same footage may play twice), `at` a
word, shot or silence of that clip's source, and the resolver starts the
graphic where the clip plays it: clip start + (word time − clip in) / speed,
plus `offset` if there is one (a drag in the editor writes `offset`, so the
graphic stays tied to its word). Move the clip and the graphic follows; trim
before the word and it adjusts. A word the clip no longer plays is an
`INVALID_ANCHOR` error, and the graphic is held to the nearest part the clip
plays. Reversed clips and clips with speed keys or freezes are not supported
yet (`UNSUPPORTED_ANCHOR`): use `offset` there.

## Transitions are siblings

`<Transition>` sits between the two clips it joins. The resolver overlaps them
by the transition's duration and checks both have the handles. The player
fades the incoming clip over the outgoing one, which stays opaque, so the
crossfade never dips to black.

## Children for collections

The push-in is four `<Keyframe>` children on `broll`, not a `keyframes={[…]}`
prop. Captions are `<Caption>` children. Effects, masks, speed keys and freezes
work the same way. The reason is the inspector: it edits one keyframe, moves
one caption, toggles one effect, and each needs an id and a place in the file.

## Helpers used once stay editable

`LowerThird` is a function returning a `<Shape>` and two `<Title>`s with literal
ids and literal timing. It is used once, so its three elements are ordinary
literals in the resolved state and the editor edits them directly. Used twice,
they would be `generated`, and the editor would bake the helper's output into
the file before the first gesture on one copy. The prompt tells the model to
prefer writing elements out when there are only two.

Helpers must be pure: no state, no effects, no hooks except `useT()` and
`useLayer()`. The lint checks (`pure-helpers`). The resolver expands them by calling them, so a helper
that reads the clock would resolve differently every time.

## `<Layer>` is the escape hatch

The call to action is a `<div>` with a progress bar, inside `<Layer id="cta">`.
`useT()` returns 0..1 over the layer's duration; `useLayer()` returns the
clock in full: `t`, `elapsed` and `remaining` in seconds, the layer's
`duration`, the composition `time` and `fps`. A countdown is one line:

```tsx
function Countdown() {
  const { remaining } = useLayer();
  return <div>{Math.ceil(remaining)}</div>;
}
```

Both hooks read the player's time, so scrubbing shows the right value and
pausing freezes it; a `setInterval` would drift and ignore seeks.

To shape that time, `@cutcut/kit` exports three pure helpers. `interpolate(x,
inputRange, outputRange, { easing, extrapolateLeft, extrapolateRight })` maps a
value piecewise across ranges, extending past the ends unless told to
`"clamp"`, with any keyframe easing inside. `spring({ time, from, to, mass,
damping, stiffness, overshootClamping })` is a physical spring `time` seconds
after it is let go (mass 1, damping 10, stiffness 100 by default). `random(seed)`
is a number in [0, 1) fixed by its seed, so scattered things stay put from frame
to frame. They are plain functions, so they run in the export too:

```tsx
function Badge() {
  const { elapsed, remaining } = useLayer();
  const scale = spring({ time: elapsed, damping: 12 });
  const opacity = interpolate(remaining, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  return <div style={{ transform: `scale(${scale})`, opacity }}>New</div>;
}
```

A `<Keyframe>` can ease with `"spring"` too: the default spring, settling as
the next key arrives.

The interior's body is opaque to the editor, but its props are not. A Layer
whose interior is exactly one component gets *handles*: that component's
literal props are editable (`layer/setProps`), props that reference a
`schema` prop are bound and fold into `defaults`, and expressions are
locked. `<Layer id="cta"><CallToAction text={cta} accent={accent} /></Layer>`
gives the inspector `text` and `accent` without reading `CallToAction`. Wrap
the component in a `<div>` or give the Layer two children and there are no
handles; the editor can still move, trim and anchor the layer, and to change
what is inside it asks the model. The layer's own timing stays literal so it
remains a timeline item.

## Captions follow the clips

`<Captions src="asset:founder">` names the transcript. A literal
`<Caption start="word:12" end="word:18.end">` then means *where those words
play*: the resolver finds the clip that shows word 12 (`hook`, trimmed to
start there) and puts the cue at 0–3.0 s. Trim or move the clip and the cue
follows. A word that no clip plays is an `UNKNOWN_REF` error. Numbers are
still composition seconds, and `marker:` references still name markers.

Leave the element empty, `<Captions src="asset:founder" />`, and the
resolver generates the cues: every word the timeline plays, grouped into
cues that break at a sentence end (`.`, `?`, `!`), at a pause longer than
`maxGap` (0.8 s), at a clip boundary, or when a cue would pass `maxChars`
(42) or `maxDuration` (5 s). Generated cues carry `words` with composition
times, so karaoke colouring works, and they show as generated in the
editor. The first edit to one of them (a text change, a move, a delete)
writes all of them into the file as literal `<Caption>` children and then
applies the edit; undo removes the literals and generation resumes.

## What the player does with it

The resolver places everything: 29 elements with absolute start and end. The
player draws `main`'s clips on a canvas (bottom track first), the overlays as
DOM above it, the captions above those, and schedules the bed on Web Audio
with a gain envelope that ducks to 15 % under the two interview segments and
fades in and out. `data-el` on every DOM element and `data-time` on the root
make the preview addressable from the editor.

## How a drag becomes a diff

Drag the out edge of `hook` one word earlier. The timeline dispatches:

```ts
exec.execute({ type: "clip/trim", params: { id: "hook", edge: "out", value: "word:22.end" } });
```

`validate` checks the clip is unlocked and the value is inside the source;
`invert` records `clip/restoreTiming` with the old `out`; `apply` appends one
patch, `{ op: "set", id: "hook", prop: "out", value: "word:22.end" }`. The
resolver applies the net patches over the file: `hook` ends 0.6 s earlier,
`broll`, `demo`, `close` and `outro` move with it, the title anchored to
`start` does not, the lower third anchored to `close` does. The player repaints.

At the sync point, `foldToSource` turns the net patch into a source edit:

```diff
-        <Clip id="hook" src="asset:founder" in="word:12" out="word:23.end" />
+        <Clip id="hook" src="asset:founder" in="word:12" out="word:22.end" />
```

One token. The example's test asserts exactly this: one edit, one changed line.
The model reads the new file and sees what the user did.
