---
name: uberscene
description: Make and edit videos with UberScene, where one TSX file is the video. Use when asked to cut footage on words or shots, add titles, captions, music, transitions, colour, effects or motion graphics, make variants of a video, or render a video, still or subtitles from a UberScene file.
license: MIT
---

# UberScene

UberScene is a video editor as code. One TSX file is the video: tracks of clips, transitions, titles, captions and
music, plus any React drawn on top. You write and edit that file with ordinary file tools. The `uberscene` command line
checks it and renders it. An editor with a timeline may edit the same file, so write it for both of you.

The point of the design: you never count seconds. A cut names a transcript word (`in="word:12"`) or a camera shot
(`in="shot:1"`), a title names the word it belongs to, and UberScene works out the frames through every trim and speed
change.

## What you can do

Reach for an element or a prop before free code. Each row names what does the job; its props are in the
references.

| To | Use |
|---|---|
| Cut on meaning | `in`/`out` as `word:12`, `word:23.end`, `shot:1`, `silence:2`; `at="marker:intro"` with `<Marker>`; `<Gap duration>` for a hole |
| Change speed | `speed`, `reverse`; keys on `speed` ramp it (`speed={[{ at: 0, value: 1, easing: "easeInOutQuad" }, { at: 1.6, value: 0.4 }]}`); `freezes={[{ start, duration, source }]}` holds the source frame at `source` from `start` seconds into the clip. Sound follows |
| Several cameras | `<Multicam sync>` with `<Angle src offset>` per camera and `<Cut at angle>` to switch |
| Reuse a sequence | `<Nested>`: a sequence written once as a component and placed like a clip |
| Place and frame | `box` (`x`, `y`, `width`, `height` in pixels from the frame's top left, `origin`: which point sits at `x`, `y`; left out, the whole frame); `fit` (`contain`, `cover`, `stretch`, `none`) fills the box; `transform` (scale, rotation, opacity, crop, `borderRadius`) after it; `frame={{ focus }}` reframes footage to the composition's shape, a landscape interview into a vertical short |
| Mix layers | `blend` (`multiply`, `screen`, `overlay`…); on a clip, `blendOpacity` for how strongly |
| Show part of a clip | `<Mask>`: a rect, ellipse, polygon or drawn path, with `feather`, `inverted` and `opacity` |
| Animate anything | In place of a value, a list of keys `{ at, value, easing? }` (`at` in seconds into the element): `transform.scale` (one list moves both axes), `rotation`, `opacity`, `anchor.x`/`.y`, `borderRadius`, `crop.*`, `box.x`/`.y`, `volume`, `pan`, `speed` and every effect param. `easing` shapes the move from that key to the next |
| Join clips | `<Transition type duration>` between two clips of a track: `crossfade`, `dipToBlack`, `dipToWhite`, `wipe`, `slide`, `push`, `iris`, `clockWipe`, `blinds`, `filmBurn`, `pixelDissolve`, `zoom`. With `on="pip" edge="in"` it brings one element in, or takes it out with `edge="out"` |
| Correct and grade | `effects={[{ type, ...params }]}` on the element, in order: `exposure`, `whiteBalance`, `brightness`, `contrast`, `saturation`, `vibrance`, `hue`, `levels`, `curves`, `shadowsHighlights`, `lut` (a `.cube` file added with `uberscene add`) |
| Give a look | `grayscale`, `sepia`, `invert`, `duotone`, `vignette`, `grain`, `lightLeak`, `chromaticAberration`, `halftone`, `pixelate`, `scanlines`, `fractalNoise` |
| Fix footage | `colorKey` (green screen), `regionBlur` (hide a face or a plate), `cornerPin` (put a picture on a screen), `blur`, `zoomBlur` |
| Style text and graphics | `glow`, `outline`, `shadow`, `longShadow`, `bevel` on a title, shape or layer |
| Affect everything below | `<Adjustment effects={[…]}>`, for its time, on every track beneath it |
| Words on screen | `<Title>` with a theme `style` and `animation={{ type }}`: `typewriter`, `fade`, `slideUp`, `slideDown`, `slideLeft`, `slideRight`, `scale`, `wordByWord` |
| Captions | `<Captions>` from the transcript, or `<Caption>` cues; `animation`: `wordHighlight`, `wordByWord`, `karaoke`, `typewriter`; `style.highlightBox` boxes the word being said; `box` places them (the lower safe area when left out; each field written replaces that one) |
| Shapes and images | `<Shape>` (rectangle, circle, ellipse, triangle, arrow and more), `<Svg>` (inline markup or an SVG asset), `<Sticker>` (a PNG, SVG, WebP or GIF asset) |
| Ready-made graphics | `LowerThird`, `Callout`, `Badge`, `Counter`, `TypeCard` |
| Ready-made scenes | Blocks: `uberscene blocks --for "<job>"` lists them with when to use each (`--sheet blocks.png` to look); `uberscene blocks add <name> --into video.tsx --track <id> --at hook@word:N` copies one to `blocks/<name>.tsx` and places its component in a `<Layer>`, its props set there; `blocks update` after an upgrade |
| Sound | `<Audio>` for music and voice; `volume` and `pan` (a value, or keys over time), `fade={{ in, out }}`, `duck={{ under, to }}` under a track or a role (`dialogue`) |
| Anything else | `<Layer>` (any React), `<Three>` (three.js), `<Motion>` (Motion), all on the video's clock; see "Free code" under Look and graphics |
| Variants | `schema` and `defaults`, then `--props '{"product":"Pixel"}'` at render |

## The loop

Work in this order, and check after each stage.

1. **Set up** (Node 22.19 or later), in the project folder:
   ```sh
   npm install uberscene @uberscene/kit react zod
   ```
2. **Add each media file to the manifest.** Put a transcript next to a recording with the same name (`talk.json` from
   Whisper or ElevenLabs, or `talk.srt`, `talk.vtt`) to get its words:
   ```sh
   npx uberscene add talk.mp4 broll.mp4 music.mp3
   ```
   This writes `uberscene.json` in the current folder, or updates the nearest one above it: each asset's id (the file
   name without its extension), kind, length, size and, for speech, every word with its time. Read it: the word indexes you cut on come from there.
3. **Write `video.tsx`** (shape and rules below).
4. **Read it back.** `inspect` prints the timeline as the resolver sees it: every element with its seconds, the words
   each clip plays, effects, keyframes and cuts. It starts no browser, so use it freely, after every edit:
   ```sh
   npx uberscene inspect video.tsx
   npx uberscene inspect video.tsx --at hook.end,x1,word:14,lt.mid
   ```
   `--at` says what is on screen and heard at each moment, with effect values after keyframes and the word being said.
   A moment is an element's id (with `.start`, `.mid` or `.end`), a transition's id (both sides of the cut), `word:14`
   (or `hook@word:14`), `shot:1`, `marker:intro`, seconds (`4.5`), a frame (`90f`) or a range (`2..6/0.5`). `--json`
   prints flat rows for `jq`.
5. **Check it.** Every command prints `warning: <id>: <message>` for each problem in the file; fix them all. `lint`
   reads the file's text for what breaks editing or an export (ids, timing, assets, free code off the clock, props
   spelled an older way); it exits 1 on an error, and `--fix` writes the fixes that have one right answer. The
   layout check reports overlays that leave the frame or the safe zone, or cover the captions or the subject:
   ```sh
   npx uberscene lint video.tsx
   npx uberscene video.tsx --check-layout
   ```
   Exit code 0 is clean, 3 means it found layout issues (listed with their line), 1 is an error, 2 is a bad argument.
   For a vertical video pass `--safe-zone tiktok`, `reels` or `shorts`.
   To the check a `<Layer>` is one box. Put `data-name="lamp-label"` on what its code draws (a label, a group) and
   each is checked on its own, as `<layer id>/lamp-label`. To read where everything is at a moment, in pixels,
   with what is outside each safe zone and what overlaps what:
   ```sh
   npx uberscene where video.tsx --at 2.6,hook.mid
   ```
   For a diagram inside a `<Layer>`, use the kit's parts in an `<svg>`: `DrawnLine` (a line that draws itself),
   `Label` (a word with a line to what it names, which names itself for this check), `CountUp` and `Cells`. Each
   takes `start` (seconds of the video) or `after` (seconds since its layer started) and `over`.
   Place things from those numbers; do not guess from a picture. To see them on the frames, add `--zones tiktok`
   to a `look`: the zone is drawn on every cell and each thing outlined, red where it leaves the zone.
6. **Look at it.** `look` draws many frames in one go, on one contact sheet, and prints what each cell is. With no
   moments it shows what an editor skims: each clip's first frame, both sides of every cut, each overlay. Read the
   image after each stage:
   ```sh
   npx uberscene look video.tsx --out look.png
   npx uberscene look video.tsx --around lt --out lt.png
   npx uberscene look video.tsx --at hook.mid,close.mid --without grade --out grade.png
   ```
   `--around <id>` follows the thing you just changed: a transition from before to after, or an element coming in, in
   and going out. `--without <id>` shows each frame with and without an effect or an overlay, side by side.
   `--at` takes the same moments as `inspect`. For one frame at full size: `--still 4.5 --out frame.png`.
   To show a person the whole video on one sheet, list the moments that matter in seconds, one per beat, and set
   the row length. Each cell is printed with its time and frame, so they can point at one:
   ```sh
   npx uberscene look video.tsx --at 1.2,12,20,26.5,31,36,44,52.5 --columns 4 --out sheet.png
   ```
   Send that sheet when you report on a video, and before rendering one that takes minutes: it is drawn in seconds.
   To judge a move (an entrance, a transition, easing), read it as a strip of small frames at even steps:
   ```sh
   npx uberscene look video.tsx --motion 0.3..1.3 --out move.png
   ```
   `--motion` takes a range or an element's id; `--step 0.05` sets the seconds between frames (twelve frames without it).
   `--listen all` (or `2..6`, or an element's id) adds the sound under the frames: the mix's level over time, the
   words where they are said, silences shaded, and `peakDb`, `rmsDb` and `silences` in the printed legend. Use it
   after any change to volume, music or the order of clips.
   Frames are kept in `.uberscene/cache` beside the file, so looking again after an edit only draws what changed:
   look as often as you like. Add `.uberscene/` to `.gitignore`. The cache does not see code brought in with
   `--import`: after changing such a module, pass `--no-cache` once.
7. **Render.**
   ```sh
   npx uberscene video.tsx --out video.mp4
   npx uberscene video.tsx --props '{"product":"Pixel"}' --out pixel.mp4
   npx uberscene video.tsx --srt captions.srt
   ```
   `.mp4` is H.264 and AAC, `.webm` VP9 and Opus, `.mp3` or `.wav` the sound alone. The first export downloads a
   Chrome to draw with. Commands find `uberscene.json` in the file's folder or a folder above it. Media is found in the file's folder,
   beside the manifest, in `media/` beside it, or in `--media <dir>`.

Scale the check to the change: a one-word trim needs no still; new graphics always do.

## The file

```tsx
import { z } from "zod";
import { Captions, Clip, Composition, LowerThird, Title, Track, Transition } from "@uberscene/kit";

// What a person may change without touching the edit.
export const schema = z.object({
  product: z.string().describe("Product name in the title"),
  who: z.string().describe("Name on the lower third"),
});
export const defaults = { product: "Halvard", who: "Maya Chen" };

export default function Video({ product, who }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} theme={{ extends: "midnight" }}>
      <Track id="main">
        <Clip id="hook" src="asset:talk" in="word:3" out="word:14.end" fit="cover" />
        <Transition id="x1" type="crossfade" duration={0.4} />
        {/* A slow push-in, and a warm grade that comes in. */}
        <Clip
          id="broll"
          src="asset:broll"
          in="shot:1"
          out="shot:1.end"
          fit="cover"
          transform={{ scale: [{ at: 0, value: 1, easing: "easeInOutSine" }, { at: 5, value: 1.1 }] }}
          effects={[{ type: "vibrance", amount: [{ at: 0, value: 0 }, { at: 1, value: 0.3 }] }]}
        />
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
- NTSC frame rates are strings: `fps="29.97"` (also `"23.976"`, `"59.94"`). The number `fps={29.97}` is not NTSC and
  is an error; `uberscene lint --fix` rewrites it.
- `schema` and `defaults` are optional. `defaults` is a plain JSON object literal, because the editor rewrites it.
  Describe each schema value by what it means on screen (`.describe("Name on the lower third")`): that is the
  editor's label. Mark a colour, font or image with `knob.color()`, `knob.font()` or `knob.image()`, so it gets a
  picker; a choice is `z.enum([...])`. `uberscene inspect` lists them first.
- A file may import only `react`, `zod`, `@uberscene/kit` and its own `.ts`/`.tsx` modules inside the project
  (`./blocks/chat-reveal`); three.js and Motion come through `<Three>` and `<Motion>`. Put a component shared by
  several videos in a module of its own and use it in a `<Layer>`.
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
7. **Transitions sit between two clips** of the same track, and the clips overlap by its duration. To bring one
   element in or take it out with nothing on the other side, give the transition `on="<id>"` and `edge="in"` or
   `"out"`; it then plays inside that element's own time.
8. **Captions follow the clips.** `<Captions src="asset:talk">` with no children makes cues from the words the
   timeline plays (`maxChars`, `maxDuration`, `maxGap` tune them). Or write
   `<Caption start="word:N" end="word:M.end" text="…">` cues. At most one `<Captions>`.
   For a film told by a voice with no speaker in it, write the script as one string and time it with `narrate`:
   `[word]` is a cue, `(1.5)` a pause in seconds, `{name}` a cue with no word. Use `story.at("word")` for `start`
   props and in free code, and map `story.lines` to `<Caption>` children with their `words`. Give it the voice's
   transcript when there is one and every time follows the recording.
9. **Sound.** Dialogue on the first track, music on a free track with `duck={{ under: "main", to: 0.2 }}` so it dips
   under speech.
10. **Everything about an element is a prop.** A value that changes is a list of keys in its place, effects are the
    `effects` list, a speed ramp is keys on `speed`, holds are `freezes`. Edits find a key by the element's id, the
    prop's path (`transform.scale`, `effects.0.amount`) and its `at`. A key list built by code is locked in the
    editor, so write keys out as literals.
11. **Helpers used once stay editable.** A helper used twice makes generated elements the editor must bake before
    one copy can be edited, so write elements out when there are only two.

Full props of every element: [references/elements.md](references/elements.md).

## Look and graphics

Give the video one look and say it once.

- **Theme first.** `theme={{ extends: "midnight" }}` on the composition (`midnight`, `paper`, `neon`, `pastel`,
  `mono`, `bold`) gives a palette, fonts, a radius, a motion style and presets. Brand it with
  `palette: { primary: "#ff5a1f" }`, `fonts: { heading: "Playfair Display" }` and
  `motion: "calm" | "snappy" | "bouncy" | "editorial" | "none"`.
- **Choose a font by looking.** `uberscene fonts --for headline` lists families with what each suits and its weights
  (`--category condensed|serif|display|…` narrows it). `uberscene fonts --for headline --sheet fonts.png --text "YOUR
  WORDS"` draws them; read the image, then pick. A starred family is bundled: use its name. Any other is declared at
  the top of the file, `const bebasNeue = googleFont("Bebas Neue", { weights: [400] })`, and passed as the value:
  `fonts: { heading: bebasNeue }` or `style={{ font: bebasNeue }}`. Ask only for weights the list shows.
- **Tokens, not literals.** Colours: `$primary`, `$secondary`, `$accent`, `$background`, `$surface`, `$text`,
  `$muted`, `$onPrimary`. Fonts: `$heading`, `$body`, `$mono`. Corners: `$radius`.
- **Presets for text.** `<Title style="h1">`, also `h2`, `kicker`, `body`, `caption`, `quote`, `label`, `code`,
  `note`. A title's whole look is its `style`, a preset's name or an object of `font`, `size`, `weight`, `italic`,
  `color`, `background`, `stroke`, `shadow`, `align`, `valign`, `lineHeight`, `letterSpacing` and `decoration`, whose
  fields override the preset it names: `style={{ preset: "h1", size: 64, color: "$primary" }}`. Its text box is
  `box.width` and `box.height`. A preset is look only. `<Shape style="card">`, `<Captions style="boxed">`, and
  `style={{ preset: "boxed", align: "left" }}` on captions.
- **Leave entrances to the motion style.** Write `enter` or `exit` only where one element should differ.
- **Components** for the common graphics: `LowerThird`, `Callout`, `Badge`, `Counter` and
  `TypeCard`, imported from `@uberscene/kit`. They take the timing props any element takes.
  `box`, with `x` and `y`, is the component's centre in pixels from the frame's top left; an axis left out is
  centred on the frame, except the defaults of `LowerThird` and `Callout`, set for 1920x1080. See
  [references/components.md](references/components.md).
- **Colour and effects** are the `effects` list of a clip, a title, a shape, a layer or an `<Adjustment>` (which
  affects everything beneath it for its time): `effects={[{ type: "exposure", stops: 0.4 }, { type: "lut", src:
  "asset:warm", amount: [{ at: 0, value: 0 }, { at: 1, value: 1 }] }]}`. Each param is a value or keys over time;
  `enabled: false` turns one off. They run in the order of the list: correct, then shape the tones, then the look.
  A file written with the older effect and key children fails with an error; `uberscene lint --fix` moves it. See [references/effects.md](references/effects.md).
- **Check the blocks before hand-building a scene.** A chat, a terminal, a ranking that reorders, bars that race, a
  quote that builds, a grid that counts: run `uberscene blocks --for "<job>"`, then `--sheet blocks.png` and read the
  image. Place one with `uberscene blocks add <name> --into video.tsx --track <id> --at <moment>`, then set what this
  video needs as props on the tag it wrote, not by editing the copy in `blocks/`, so `blocks update` can still bring
  it forward. Two placements of one block differ by their props. Every block and its props:
  [references/blocks.md](references/blocks.md).
- **Free code where nothing fits.** A `<Layer>` holds any React, CSS, canvas or WebGL. Inside it, `useLayer()` gives
  `elapsed`, `t` (0 to 1), `remaining`, `duration`, `time` and `fps`. Draw everything as a function of that time,
  never from timers or `Date`. The kit's helpers are pure functions: `interpolate()` and `spring()` shape a value,
  `progress(clock, { after, over })` gives 0 to 1 for one item of many (stagger them in a loop), `random("star", i)`
  is the same number every frame, `stepAt(times, t)` says which step a moment has reached, and `grid({ columns,
  rows, width, height })` gives the box of every cell of a board. Give the
  layer one component child with literal or schema props: those props are the editor's handles. `<Motion>` and
  `<Three>` put Motion and three.js on the video's clock; `useSeekable((el) => timeline)` does the same for any
  library that can seek (a paused GSAP timeline as it is; Anime.js and Lottie in a two-line wrapper).

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
- **Backgrounds go on the lowest track**, beneath the footage. A layer that other things sit on but that is drawn
  above footage (a scrim under a title, the wall of a game) takes `ground`: `<Layer id="scrim" ground>`. The layout
  check then treats it as a background.

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
6. Put what someone will want to change (a name, a colour, a call to action) in `schema`, described, and read it
   from props.

## Before you hand it over

- Every command runs with no `warning:` lines, `lint` exits 0, and `--check-layout` exits 0, or 3 only for issues
  you chose to keep and said so.
- Ids are literal and unique, no sequence track has `start`, there is at most one `<Captions>`, and every `src` is in
  the manifest.
- Each clip has `in`/`out` or `duration`, not both. Every `$token` and `style` exists in the theme.
- You looked at stills of every graphic and every cut you made.

## References

- [references/elements.md](references/elements.md): every element and its props.
- [references/effects.md](references/effects.md): every effect and transition, its params, and the units.
- [references/components.md](references/components.md): the ready-made components.
- [references/blocks.md](references/blocks.md): the blocks, what each is for, and their props.
- [references/rendering.md](references/rendering.md): what renders.
- [references/cli.md](references/cli.md): every command and option.
- The documentation: https://uberscene.prefixtree.xyz/
