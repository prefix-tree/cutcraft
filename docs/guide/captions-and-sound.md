# Captions and sound

This page covers what the viewer reads and hears: captions made from a transcript, narration timed from a script,
subtitle files, and music and voice-over. Captions come first; [Sound](#sound) is at the end.

**See it in:** [Kinetic type](/examples#kinetic-type) and [Captions and key points](/examples#captions-and-key-points)
(karaoke captions), [A talking head with a diagram](/examples#a-talking-head-with-a-diagram) (captions placed off the
speaker's face), [An interview that changes layout](/examples#an-interview-that-changes-layout-with-the-story) (a box
behind the word being said), [One pixel](/examples#one-pixel) (narration timed from a script),
[Vertical clip from a podcast](/recipes/vertical-podcast) (short lines in 9:16), [Talking-head cut](/recipes/talking-head)
(a music bed that ducks under speech).

Add the media with its transcript beside it, then add one `<Captions>`:

```sh
npx cutcraft add founder.mp4     # reads founder.json, founder.vtt or founder.srt from the same folder
```

```tsx
<Captions id="captions" src="asset:founder" style={{ position: "bottom", size: 44 }} animation="karaoke" />
```

## Getting a transcript

Captions, [word cuts and anchors](./time) read their words from the asset's transcript in the manifest. Put the
transcript next to the media under the same name, then add the media with
[`cutcraft add`](/reference/cli#adding-media).

| File | Written by | Word times |
| --- | --- | --- |
| `.json` with `words` | OpenAI (`verbose_json` with word timestamps), ElevenLabs | measured |
| `.json` with `segments[].words` | openai-whisper `--word_timestamps`, faster-whisper, WhisperX | measured |
| `.json` with `transcription[].tokens` | whisper.cpp `-ojf` | measured |
| `.vtt` | any captioning tool; `<v Name>` sets the speaker | estimated, or measured where the file has inline timestamps |
| `.srt` | any captioning tool | estimated |

::: tip Subtitle files give estimated word times
Subtitle files time whole lines, not words. Each word gets a share of its line's time by its length and is marked
`estimated`, so a cut on that word lands near it rather than exactly on it.
:::

If more than one transcript sits next to the media, `cutcraft add` takes the JSON first, then the VTT, then the SRT.
`--transcript other.vtt` names a different file. Running `cutcraft add` again refreshes the entry and keeps the fields
it does not write, such as shots and silences.

::: details From code: parseTranscript()
App code that already has the text can use the same parser, [`parseTranscript()`](/reference/api#cutcraft-kit):

```ts
import { parseTranscript } from "@cutcraft/kit";

const { words } = parseTranscript(await (await fetch("/founder.vtt")).text());
manifest.assets.founder = { ...manifest.assets.founder, transcript: { words } };
```

Either way the words end up in the manifest, so the preview and the export agree on every `word:N`.
:::

## Add captions

`<Captions src="asset:founder" />`, left empty, makes captions from the transcript: every word the timeline plays,
grouped into lines. Trim a clip and its captions change with it.

```tsx
<Captions id="captions" src="asset:founder" style={{ position: "bottom", size: 44 }} animation="karaoke" />
```

| Prop | Does |
|---|---|
| `animation` | Colours the words as they are said: `word-highlight`, `word-by-word`, `karaoke` or `typewriter`. |
| `style` | Sets the font, size, colours, background, stroke and position. |
| `style.position` | `top`, `center` or `bottom`, or a number from 0 to 1 for the height the captions' middle sits at. |

Over a talking head in a vertical video, `position: 0.6` puts them under the chin, clear of the mouth and above the
part of the frame the platforms cover.

::: details How lines are made
A line breaks at the end of a sentence, at a pause longer than `maxGap` (0.8 s), at a clip boundary, or when it would
pass `maxChars` (42 characters) or `maxDuration` (5 s).
:::

## Place captions

For an exact place, give the captions numbers, as you would a card or a badge.

```tsx
<Captions id="captions" src="asset:founder" x={-200} y={192} width={520} align="left" />
```

| Prop | Does |
|---|---|
| `x`, `y` | The middle of the captions, in pixels right of the frame's centre and below it. |
| `width` | The widest a line may be. |
| `align` | The side of that width the lines sit against: `left`, `center`, `right` or `justify`. |

`y` takes the place of `style.position`. `x`, `width` and `align` work with either. The layout check measures the
captions where these put them.

## Highlight the word being said

With a word animation, `highlight` is the colour of the word being said, and `highlightBox` puts a filled, rounded
box behind it.

```tsx
<Captions
  id="captions"
  src="asset:founder"
  animation="word-highlight"
  style={{ color: "#111111", highlight: "#111111", highlightBox: "#4aa3ff" }}
/>
```

## Choose where lines break

`breakAfter` ends a line after each word you name, whatever the [line limits](#add-captions) would do.

```tsx
<Captions id="captions" src="asset:founder" breakAfter={["word:5", "word:12"]} />
```

## Write lines by hand

Add `<Caption>` children to write a line yourself. A caption timed with words means where those words play.

```tsx
<Captions id="captions" src="asset:founder">
  <Caption id="cap-1" start="word:12" end="word:18.end" text="Small software still deserves a real cloud." />
</Captions>
```

CutCraft finds the clip that plays word 12 and puts the caption there, so moving or trimming the clip moves the
caption. A word no clip plays is an error. Numbers still mean seconds in the video, and `marker:` references name
markers.

::: tip Editing generated captions
Generated captions show as generated in an editor. The first edit to one of them writes all of them into the file as
`<Caption>` children and then applies the edit; undoing it removes them again and generation resumes.
:::

## Narration from a script

A film with no speaker in it, such as an explainer told by a voice, starts from its words. `narrate` turns the script
into times: when each word is said, the subtitles a phrase at a time, and the moments the picture listens for.

```tsx
import { Caption, Captions, Composition, Layer, narrate, Track } from "@cutcraft/kit";

const story = narrate(`
A game has no real [light]. (0.5)
For every dot it asks one question: is this surface [facing] the lamp? {answer}
`);

export default function Video() {
  return (
    <Composition fps={30} width={1080} height={1920}>
      <Track id="picture" layout="free">
        <Layer id="room" start={0} duration={story.duration}>
          <Room />
        </Layer>
        <Layer id="lamp" start={story.at("light")} duration={2}>
          <Lamp />
        </Layer>
      </Track>
      <Captions id="said" animation="karaoke">
        {story.lines.map((line, i) => (
          <Caption key={line.start} id={`said-${i + 1}`} start={line.start} end={line.end} text={line.text} words={line.words} />
        ))}
      </Captions>
    </Composition>
  );
}
```

### Writing the script

| Write | Means |
|---|---|
| `[light]` | A cue at the start of that word, named by the word: `story.at("light")`. |
| `(0.5)` | A pause of that many seconds with nothing said. It ends the subtitle line. |
| `{answer}` | A cue at that moment, with no word. |

### Using the times

| Field | Is |
|---|---|
| `story.at(name)` | The cue's time in seconds. |
| `story.cues` | All the cues. |
| `story.words` | Every word, with its start and end. |
| `story.lines` | The subtitles. |
| `story.duration` | When the narration is over. In the example, it is how long the layer behind everything lasts. |
| `story.warnings` | Words the recording did not say as written (see [Timing from a recording](#timing-from-a-recording)). |

A name the script does not have is an error when the file loads, listing the names it does have. So a mistyped cue
cannot leave an animation that never runs.

::: details How subtitle lines are made
A line ends with its sentence, at a pause, at a comma once the line is 18 characters long, or at `lineLength` (44)
characters. A line of one or two words left over from a long sentence takes words back from the line before it.
Each line stays for `hold` (0.12 s) after its last word, and never into the next one.
:::

### Timing without a voice

With no recording, the times come from a speaking pace. Every option has a default you can change:

```ts
narrate(script, { start: 0.5, pace: { letter: 0.05 }, lineLength: 36, hold: 0.2 });
```

::: details The default pace
Every word takes 0.09 s and 0.04 s more for each letter, with a breath of 0.11 s after a comma and 0.25 s after a
full stop. `start` (0.3 s) is the time before the first word.
:::

### Timing from a recording

When the voice is recorded, give `narrate` its transcript and every time comes from the recording:

```ts
const story = narrate(script, { transcript: manifest.assets.voice.transcript });
```

The script's words are matched to the transcript's in order, ignoring case and punctuation. A word the voice did not
say as written is timed between the words either side of it and listed in `story.warnings`. A transcript with fewer
than half the script's words is refused as the wrong recording.

::: details Pauses and cues with a recording
A written pause is not added, because the voice's own silence is already in its times. A cue in curly brackets sits
after the word before it by the pause written between them, and never later than the next word.
:::

## Subtitle files

`--srt` and `--vtt` write the captions the cut plays as a subtitle file, timed like the export.

```sh
npx cutcraft video.tsx --out video.mp4 --srt video.srt
npx cutcraft video.tsx --vtt video.vtt            # only the subtitles, no video
```

With `--from`, the times count from that point, so they line up with a partial export ([CLI](/reference/cli#export)).

::: details From code: subtitles()
[`subtitles(state, { format: "srt" })`](/reference/api#cutcraft-kit) from `@cutcraft/kit` returns the same text,
for example behind an editor's download button.
:::

## Sound

A clip plays its own sound. For music and voice-over, use `<Audio>`, usually on a free track.

```tsx
<Track id="music" layout="free">
  <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.35}
    fade={{ in: 0.5, out: 1.5 }} duck={{ under: "main", to: 0.15 }} />
</Track>
```

`duration="fill"` runs the music to the end of the video, however long the edit becomes.

| Prop | Does |
|---|---|
| `volume` | Loudness, 0 to 4 (1 is as recorded). |
| `fade` | Seconds to fade `in` and `out`. |
| `duck` | Lowers the volume `to` this level while `under` has sound (a track id, or a [track role](#track-roles)), with `attack` and `release` times. |
| `automation` | Volume and pan changing over time. |
| `in`, `out`, `speed` | Trim and speed, as on a clip; `word:N` references work too. |

Speed ramps and freezes on a clip apply to its sound as well.

### Track roles

A track's `role` says what it holds: `general` (the default), `captions`, `dialogue`, `music`, `effects` or
`ambience`. A track with `role="effects"` keeps sound effects apart from dialogue and music in the mix, and a `duck`
with `under: "dialogue"` turns sound down under every track of that role. To time a sound effect to a cut, see
[Transitions](./transitions#over-a-cut-light-leaks-flashes-and-whooshes).

::: warning No audio effects
There are no audio effects: a clip's sound plays with its volume, fades, automation, ducking and speed.
:::

## Next

- [Timing](./time): word references, which captions and cuts share.
- [Transitions](./transitions): sound effects and flashes at a cut.
- [Checking a cut](./checking): the layout check, which sees the captions.
- [Exporting](./exporting): the video and its subtitle file.
