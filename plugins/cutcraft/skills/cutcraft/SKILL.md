---
name: cutcraft
description: Make and edit videos with CutCraft, where one TSX file is the video. Use when asked to cut footage on words or shots, add titles, captions, music, transitions, colour, effects or motion graphics, make variants of a video, or render a video, still or subtitles from a CutCraft file.
license: MIT
---

# CutCraft

CutCraft is a video editor as code. One TSX file is the video: tracks of clips, transitions, titles, captions and
music, plus any React drawn on top. You write and edit that file with ordinary file tools. The `cutcraft` command line
checks it and renders it. An editor with a timeline may edit the same file, so write it for both of you.

The point of the design: you never count seconds. A cut names a transcript word (`in="word:12"`) or a camera shot
(`in="shot:1"`), a title names the word it belongs to, and CutCraft works out the frames through every trim and speed
change.

## The loop

Work in this order, and check after each stage.

1. **Set up** (Node 22.19 or later), in the project folder:
   ```sh
   npm install cutcraft @cutcraft/kit react zod
   ```
2. **Add each media file to the manifest.** Put a transcript next to a recording with the same name (`talk.json` from
   Whisper or ElevenLabs, or `talk.srt`, `talk.vtt`) to get its words:
   ```sh
   npx cutcraft add talk.mp4 broll.mp4 music.mp3
   ```
   This writes `manifest.json`: each asset's id (the file name without its extension), kind, length, size and, for
   speech, every word with its time. Read it: the word indexes you cut on come from there.
3. **Write `video.tsx`** (shape and rules below).
4. **Check it.** Every command prints `warning: <id>: <message>` for each problem in the file; fix them all. The layout
   check also reports overlays that leave the frame or the safe zone, or cover the captions or the subject:
   ```sh
   npx cutcraft video.tsx --manifest manifest.json --check-layout
   ```
   Exit code 0 is clean, 3 means it found layout issues (listed with their line), 1 is an error, 2 is a bad argument.
   For a vertical video pass `--safe-zone tiktok`, `reels` or `shorts`.
5. **Look at it.** Render stills at the moments that matter (the first frame of each clip, the frames around each cut,
   each graphic fully in) and read the images:
   ```sh
   npx cutcraft video.tsx --manifest manifest.json --still 4.5 --out frame.png
   ```
6. **Render.**
   ```sh
   npx cutcraft video.tsx --manifest manifest.json --out video.mp4
   npx cutcraft video.tsx --manifest manifest.json --props '{"product":"Pixel"}' --out pixel.mp4
   npx cutcraft video.tsx --manifest manifest.json --srt captions.srt
   ```
   `.mp4` is H.264 and AAC, `.webm` VP9 and Opus, `.mp3` or `.wav` the sound alone. The first export downloads a
   Chrome to draw with. Media is found in the file's folder, or in `--media <dir>`.

Scale the check to the change: a one-word trim needs no still; new graphics always do.

## The file

```tsx
import { z } from "zod";
import { Captions, Clip, Composition, LowerThird, Title, Track, Transition } from "@cutcraft/kit";

// What a person may change without touching the edit.
export const schema = z.object({ product: z.string(), who: z.string() });
export const defaults = { product: "Shed", who: "Maya Chen" };

export default function Video({ product, who }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} theme={{ extends: "midnight" }}>
      <Track id="main">
        <Clip id="hook" src="asset:talk" in="word:3" out="word:14.end" fit="cover" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        <Clip id="broll" src="asset:broll" in="shot:1" out="shot:1.end" fit="cover" />
      </Track>
      <Track id="text">
        <Title id="name" anchor="hook" at="word:5" duration={2.5} style="h1">
          {product}
        </Title>
        <LowerThird id="lt" anchor="hook" at="word:8" duration={3} name={who} role="Founder" />
      </Track>
      <Captions id="captions" src="asset:talk" animation="karaoke" />
    </Composition>
  );
}
```

- The default export returns one `<Composition fps width height>`. There is no duration: the video lasts until its
  last element ends.
- `schema` and `defaults` are optional. `defaults` is a plain JSON object literal, because the editor rewrites it.
- A file may import only `react`, `zod` and `@cutcraft/kit` (three.js and Motion come through `<Three>` and
  `<Motion>`).
- Helpers are plain functions of their props: no state, no effects, and no hooks except `useLayer()` and `useT()`
  inside a `<Layer>`.
- Add a one-line comment where a choice is not obvious.

## Rules the editor relies on

1. **Every element has a literal, unique `id`**, a short noun (`hook`, `broll`, `lt`). Edits find elements by id. An
   id written as an expression cannot be edited.
2. **Timing props are literals or schema props.** `in`, `out`, `duration`, `start`, `offset`, `anchor` and `at` are
   numbers, strings, time references, or a plain schema prop (`out={closeOut}`). A computed value (`start + 2`) is
   locked in the editor.
3. **Cut by meaning when there is a transcript.** `in="word:12"`, `out="word:23.end"`, `in="shot:1"`,
   `out="silence:2"`, `at="marker:intro"`. Never cut inside a word.
4. **Give `in`/`out` or `duration`, not both.** Footage takes its length from the source; an image or an overlay takes
   `duration`; a music bed takes `duration="fill"`.
5. **Tracks.** The first track is the bottom of the picture, and later tracks draw on top. A track plays its children
   back to back (`<Gap duration>` makes a hole) and never takes `start`. A `layout="free"` track takes a literal
   `start` on every child.
6. **Overlays anchor.** `anchor="hook" at="word:12"` starts an element where clip `hook` says word 12;
   `anchor="hook" offset={0.4}` starts it 0.4 s into `hook`. Anchored elements follow their clip when the edit
   changes.
7. **Transitions sit between two clips** of the same track, and the clips overlap by its duration.
8. **Captions follow the clips.** `<Captions src="asset:talk">` with no children makes cues from the words the
   timeline plays (`maxChars`, `maxDuration`, `maxGap` tune them). Or write
   `<Caption start="word:N" end="word:M.end" text="…">` cues. At most one `<Captions>`.
9. **Sound.** Dialogue on the first track, music on a free track with `duck={{ under: "main", to: 0.2 }}` so it dips
   under speech.
10. **Helpers used once stay editable.** A helper used twice makes generated elements the editor must bake before
    one copy can be edited, so write elements out when there are only two.

Full props of every element: [references/elements.md](references/elements.md).

## Look and graphics

Give the video one look and say it once.

- **Theme first.** `theme={{ extends: "midnight" }}` on the composition (`midnight`, `paper`, `neon`, `pastel`,
  `mono`, `bold`) gives a palette, fonts, a radius, a motion style and presets. Brand it with
  `palette: { primary: "#ff5a1f" }`, `fonts: { heading: "Playfair Display" }` and
  `motion: "calm" | "snappy" | "bouncy" | "editorial" | "none"`.
- **Tokens, not literals.** Colours: `$primary`, `$secondary`, `$accent`, `$background`, `$surface`, `$text`,
  `$muted`, `$onPrimary`. Fonts: `$heading`, `$body`, `$mono`. Corners: `$radius`.
- **Presets for text.** `<Title style="h1">`, also `h2`, `kicker`, `body`, `caption`, `quote`, `label`, `code`,
  `note`. Own props override a preset. `<Shape style="card">`, `<Captions style="boxed">`.
- **Leave entrances to the motion style.** Write `enter` or `exit` only where one element should differ.
- **Components** for the common graphics: `LowerThird`, `Callout`, `Badge`, `Counter`, `ProgressBar`, `Arrow`,
  `Highlight`, `Background`, imported from `@cutcraft/kit`. They take the timing props any element takes.
  Positions are pixels from the frame's centre, with defaults set for 1920x1080. See
  [references/components.md](references/components.md).
- **Colour and effects** are `<Effect type params>` children of a clip, a title, a shape, a layer or an
  `<Adjustment>` (which affects everything beneath it for its time). They run in the order written: correct, then
  shape the tones, then the look. See [references/effects.md](references/effects.md).
- **Free code where nothing fits.** A `<Layer>` holds any React, CSS, canvas or WebGL. Inside it, `useLayer()` gives
  `elapsed`, `t` (0 to 1), `remaining`, `duration`, `time` and `fps`. Draw everything as a function of that time
  (`interpolate()`, `spring()` and `random(seed)` from `@cutcraft/kit` help), never from timers or `Date`. Give the
  layer one component child with literal or schema props: those props are the editor's handles. `<Motion>` and
  `<Three>` put Motion and three.js on the video's clock.

  ```tsx
  function Count({ to }: { to: number }) {
    const { t } = useLayer();
    return <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 160 }}>{Math.round(to * t)}</div>;
  }
  // …in a free track:
  <Layer id="count" start={2} duration={3}>
    <Count to={1200} />
  </Layer>
  ```
- **Backgrounds go on the lowest track**, beneath the footage.

What each element and prop actually draws, and the few it does not:
[references/rendering.md](references/rendering.md).

## Editing a cut

1. Write the brief down first, as a short note: the length, the story order, and what must be tweakable. Check every
   revision against it.
2. Lay down the spine: the interview or voice clips on the first track, cut on words.
3. Then b-roll and screen recordings, then overlays and music, then captions last.
4. With no target length, make no editorial cuts: keep every good take, drop silences and retakes, and keep the last
   take of a line.
5. Pauses live inside clips, not as gaps: 0.3 to 0.5 s between sentences (`out="word:N.end"` already lands after the
   word), at most 0.8 s of tail.
6. Put what someone will want to change (a name, a colour, a call to action) in `schema` and read it from props.

## Before you hand it over

- Every command runs with no `warning:` lines, and `--check-layout` exits 0, or 3 only for issues you chose to keep
  and said so.
- Ids are literal and unique, no sequence track has `start`, there is at most one `<Captions>`, and every `src` is in
  the manifest.
- Each clip has `in`/`out` or `duration`, not both. Every `$token` and `style` exists in the theme.
- You looked at stills of every graphic and every cut you made.

## References

- [references/elements.md](references/elements.md): every element and its props.
- [references/effects.md](references/effects.md): every effect and transition, its params, and the units.
- [references/components.md](references/components.md): the ready-made components.
- [references/rendering.md](references/rendering.md): what renders.
- [references/cli.md](references/cli.md): every command and option.
- The documentation: https://prefix-tree.github.io/cutcraft/
