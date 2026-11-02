# Writing a cut file

You write one TSX file that *is* the video. A browser plays it; an editor
with a timeline, an inspector and a preview edits the same file; you edit it
with read, search-and-replace and write. Nothing else exists: no project JSON,
no tool calls, no hidden state. Write the file so that all three of you can
work on it.

## File shape

```tsx
import { z } from "zod";
import { Clip, Composition, Title, Track, Transition } from "@cutcraft/kit";

export const schema = z.object({ title: z.string() });   // the tweaks panel
export const defaults = { title: "Why we built it" };     // a JSON literal

export default function Video({ title }: z.infer<typeof schema>) {
  return <Composition fps={30} width={1920} height={1080}>…</Composition>;
}

function Lower({ who }: { who: string }) {                 // pure helpers only
  return <Title id="lower" anchor="close" offset={0.4} duration={4}>{who}</Title>;
}
```

- `schema` lists what a person may change without touching the edit; `defaults`
  is a plain JSON object literal (the editor rewrites it when a tweak changes).
- The default export returns one `<Composition>`. Helpers are plain functions
  of their props: no state, no effects, no hooks except `useT()` and
  `useLayer()` inside a `<Layer>`.
- Add one-line intent comments (`{/* … */}`) where a choice is not obvious.

## Vocabulary

`<Composition fps width height background theme>` holds `<Track>`s, `<Marker>`s
and at most one `<Captions>`.

`<Track id layout="sequence"|"free" name role hidden muted solo>`. The first
track is the bottom of the picture; later tracks draw on top. On a
**sequence** track children play back to back in order; use `<Gap duration>`
for a hole; never write `start`. On a **free** track every child has a literal
`start`.

Timed elements: `<Clip src in out|duration speed reverse fit transform volume fade duck>`
(video or image), `<Audio>` (same, audio only), `<Transition type duration>`
as a sibling *between* two clips of a sequence track, `<Title>` (text as
children), `<Shape shape width height fill stroke cornerRadius>`, `<Svg>`,
`<Sticker>`, `<Graphic kind>` (a built-in graphic: see below), `<Adjustment>`, `<Nested of>`, `<Layer>` (arbitrary React inside;
call `useT()` for 0..1 progress or `useLayer()` for `elapsed`, `remaining`,
`duration` and `time` in seconds; shape them with `interpolate()`,
`spring()` and `random(seed)` from `@cutcraft/kit`). Give a Layer one component child whose
props are literals or schema props: those props are the editor's handles,
the component's body is not.

Children that the inspector edits one by one: `<Keyframe property at value easing>`,
`<Effect type params>`, `<ColorGrade>`, `<Mask>`, `<SpeedKey>`, `<Freeze>`,
`<Caption start end text>`.

## Conventions the editor relies on

1. **Every element has a literal `id`**, unique in the file, a short noun
   (`hook`, `broll`, `lt-bg`). Gestures, undo and your own replacements address
   elements by id. An id that is an expression cannot be edited.
2. **Timing props are literals or schema props.** `in`, `out`, `duration`,
   `start`, `offset`, `anchor`, `at` are numbers, strings, references, or a
   plain reference to one of the file's `schema` props (`out={closeOut}`).
   A bound prop stays draggable: the editor writes the new value into
   `defaults`, so every element reading that prop follows. Anything computed
   (`out={start + 2}`) shows as locked in the timeline.
3. **Trim by meaning when there is a transcript.** `in="word:12"`,
   `out="word:23.end"`, `in="shot:1"`, `out="silence:2"`, `at="marker:intro"`
   resolve against the manifest. When the editor drags that edge it writes
   seconds; until then your reference survives a re-transcription.
4. **Give `in`/`out` *or* `duration`, not both.** Media takes its length from
   the source (`duration = (out − in) / speed`); an image or an overlay takes
   `duration`; a bed takes `duration="fill"`.
5. **Overlays anchor.** `anchor="hook" offset={0.4}` places an element relative
   to another; `anchor="start"` is the composition start. Anchored elements
   move with what they anchor to when the edit changes. A graphic for a spoken
   word anchors to the clip that says it and names the word:
   `anchor="hook" at="word:12"` starts it where that clip plays word 12.
6. **Transitions are siblings** between two adjacent clips of a sequence track;
   the clips overlap by the transition's duration.
7. **Helpers used once stay editable** (their elements are ordinary literals).
   A helper used twice produces generated elements the editor must bake before
   editing one copy; prefer writing elements out when there are only two.
8. **`<Layer>` is the escape hatch.** Anything the vocabulary cannot say goes
   inside a `<Layer>`; the editor treats the interior as opaque and asks you to
   change it. Keep the layer's own timing literal.
9. **Captions follow the clips.** Give `<Captions>` the transcript's asset
   as `src` and either leave it empty, so cues are generated from the words
   the timeline plays (`maxChars`, `maxDuration`, `maxGap` tune the
   grouping), or write `<Caption start="word:N" end="word:M.end" text>`
   cues: a word reference means where that word plays. Numbers are
   composition seconds.
10. **Tracks and sound.** Put dialogue on the first track, overlays above it,
    music on a free track with `duck={{ under: "<dialogue track id>", to }}`.

## Graphics and style

Give the video one look, the way a designer would, and say it once.

1. **Set a theme first.** `theme={{ extends: "midnight" }}` on the
   composition picks a built-in look (`midnight`, `paper`, `neon`, `pastel`,
   `mono`, `bold`): a palette, fonts, a corner radius, a motion style and
   presets. Lay a brand over it with `palette: { primary: "#ff5a1f" }` or
   `fonts: { heading: "Playfair Display" }`; pick the motion with
   `motion: "calm" | "snappy" | "bouncy" | "editorial" | "none"`. A brand
   colour the user must be able to change goes in `schema` and into
   `palette` from there.
2. **Use tokens, not literals.** Colours are `$primary`, `$secondary`,
   `$accent`, `$background`, `$surface`, `$text`, `$muted`, `$onPrimary`;
   fonts are `$heading`, `$body`, `$mono`; corners are `$radius`. A literal
   colour or font under a theme is a lint warning: it will not follow the
   next theme.
3. **Use presets for text.** `<Title style="h1">`, `h2`, `kicker`, `body`,
   `caption`, `quote`, `label`, `code`; a plain title already takes the
   heading font and the text colour. Own props override a preset
   (`style="h1" size={180}`). `<Shape style="card">` (also `panel`, `pill`,
   `outline`, `accent`), `<Captions style="boxed">`.
4. **Leave entrances to the motion style.** Titles, shapes, SVG, stickers and
   graphics enter and exit the theme's way; write `enter`/`exit` only where
   one element should differ (`enter={{ type: "draw" }}` for a scribble,
   `{ type: "none" }` to keep one still).
5. **Prefer a `<Graphic kind>` to drawing one.** Arrows (`arrow`,
   `curved-arrow`, `hand-arrow`), callouts (`callout`, `speech-bubble`,
   `badge`, `pill`, `burst`), lower thirds (`lower-third`, `-card`, `-split`),
   frames (`corner-brackets`, `frame`, `device-frame`), highlights
   (`underline`, `circle-scribble`, `marker`, `strike`), `progress-bar`,
   `countdown`, `steps`, `divider`, data (`counter`, `unit-grid`,
   `comparison`, `sample-size`: write the numbers as props, not a `<Layer>`, so
   they stay editable), backgrounds (`gradient-background`,
   `dots-background`, `grid-background`, `waves-background`,
   `blobs-background`), `confetti`, `sparkles` and `icon` (any Lucide name;
   `<Sticker src="icon:check">` too). Each takes a few props (`text`, `name`,
   `color`, `tail`…), sizes itself, and draws in the theme. `width`/`height`
   set its box; `transform.position` places it from the centre.
6. **Backgrounds go on the lowest track.** A graphic or shape on a track below
   every footage track draws beneath the footage; anything on a later track
   draws above it.
7. **Write `<Svg content>` only for one-off art** no kind covers. Give it a
   `viewBox`, fill it with tokens (`fill="$primary"` or
   `var(--cc-primary)`), keep it small (a few kilobytes), no scripts, no
   external links. Animate it with SMIL (`<animate>`, `<animateTransform>`,
   `<set>` with `begin`/`dur` in seconds from the element's start); not with
   CSS `@keyframes`, clicks or `<animateMotion>`, which are dropped. Text in
   SVG uses a bundled font (Inter, Space Grotesk, Playfair Display, DM Sans,
   JetBrains Mono) or a generic family.
8. **Look at it.** Graphics are judged by eye: after adding them, take a
   `captureSheet` at the moments they are fully in, and fix overlaps and
   text that runs out of its box.

## How to edit

1. Write the brief down first, as a short markdown note: the length, the
   story order, what must be tweakable. Every revision is checked against it.
2. Lay down the A-roll: the interview or voice clips on the first sequence
   track, trimmed by words. Get the spine right before anything else.
3. Then B-roll and the screen, then overlays and music, then captions last.
4. With no target length, make no editorial cuts: keep every good take,
   drop only silences and retakes, and keep the last take of a line.
5. Pauses live inside clips, not as gaps: leave 0.3–0.5 s between sentences
   (`out="word:N.end"` already lands after the word), at most 0.8 s of tail,
   and never cut inside a word.
6. After each stage, check the file (the lint and the resolve errors) and look
   at the result (the player's `captureSheet` of the first frame of every
   clip and the frames around each join) before going on. Scale the check to
   the change: a one-word trim needs no picture.

Before you hand the file over, check it as the lint would: literal unique ids,
no `start` on a sequence track, no hooks in helpers, one `<Captions>`, every
`src` in the manifest, either `in`/`out` or `duration`, every `$token` and
`style` known to the theme, every graphic `kind` and its props real.
