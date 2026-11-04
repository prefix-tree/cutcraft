# Captions and sound

**See it in:** [Kinetic type](/examples#kinetic-type) and [Captions and key points](/examples#captions-and-key-points)
(karaoke captions), [Vertical clip from a podcast](/recipes/vertical-podcast) (short lines in 9:16),
[Talking-head cut](/recipes/talking-head) (a music bed that ducks under speech).

## Getting a transcript

Captions, [word cuts and anchors](./time) read their words from the asset's transcript in the manifest. Put the
transcript next to the media under the same name, then add the media with
[`cutcraft add`](/reference/cli#adding-media):

```sh
npx cutcraft add founder.mp4     # reads founder.json, founder.vtt or founder.srt from the same folder
```

| File | Written by | Word times |
| --- | --- | --- |
| `.json` with `words` | OpenAI (`verbose_json` with word timestamps), ElevenLabs | measured |
| `.json` with `segments[].words` | openai-whisper `--word_timestamps`, faster-whisper, WhisperX | measured |
| `.json` with `transcription[].tokens` | whisper.cpp `-ojf` | measured |
| `.vtt` | any captioning tool; `<v Name>` sets the speaker | estimated, or measured where the file has inline timestamps |
| `.srt` | any captioning tool | estimated |

Subtitle files time whole lines, not words. Each word gets a share of its line's time by its length and is marked
`estimated`, so a cut on that word lands near it rather than exactly on it.

If more than one transcript sits next to the media, `cutcraft add` takes the JSON first, then the VTT, then the SRT.
`--transcript other.vtt` names a different file. Running `cutcraft add` again refreshes the entry and keeps the fields
it does not write, such as shots and silences.

App code that already has the text can use the same parser, [`parseTranscript()`](/reference/api#cutcraft-kit):

```ts
import { parseTranscript } from "@cutcraft/kit";

const { words } = parseTranscript(await (await fetch("/founder.vtt")).text());
manifest.assets.founder = { ...manifest.assets.founder, transcript: { words } };
```

Either way the words end up in the manifest, so the preview and the export agree on every `word:N`.

## Captions follow the clips

`<Captions src="asset:founder" />`, left empty, makes captions from the transcript: every word the timeline plays,
grouped into lines. A line breaks at the end of a sentence, at a pause longer than `maxGap` (0.8 s), at a clip
boundary, or when it would pass `maxChars` (42 characters) or `maxDuration` (5 s). Trim a clip and its captions
change with it.

```tsx
<Captions id="captions" src="asset:founder" style={{ position: "bottom", size: 44 }} animation="karaoke" />
```

`animation` colours the words as they are said: `word-highlight`, `word-by-word`, `karaoke`, `bounce` or
`typewriter`. `style` sets the font, size, colours, background, stroke and position.

`breakAfter` ends a line after each word you name, whatever the limits above would do:

```tsx
<Captions id="captions" src="asset:founder" breakAfter={["word:5", "word:12"]} />
```

To write a line by hand, add `<Caption>` children. A caption timed with words means where those words play:

```tsx
<Captions id="captions" src="asset:founder">
  <Caption id="cap-1" start="word:12" end="word:18.end" text="Small software still deserves a real cloud." />
</Captions>
```

CutCraft finds the clip that plays word 12 and puts the caption there, so moving or trimming the clip moves the
caption. A word no clip plays is an error. Numbers still mean seconds in the video, and `marker:` references name
markers.

Generated captions show as generated in an editor. The first edit to one of them writes all of them into the file as
`<Caption>` children and then applies the edit; undoing it removes them again and generation resumes.

## Subtitle files

`--srt` and `--vtt` write the captions the cut plays as a subtitle file, timed like the export. With `--from`, the
times count from that point, so they line up with a partial export
([CLI](/reference/cli#export)):

```sh
npx cutcraft video.tsx --out video.mp4 --srt video.srt
npx cutcraft video.tsx --vtt video.vtt            # only the subtitles, no video
```

In code, [`subtitles(state, { format: "srt" })`](/reference/api#cutcraft-kit) from `@cutcraft/kit` returns the same
text, for example behind an editor's download button.

## Sound

A clip plays its own sound. For music and voice-over, use `<Audio>`, usually on a free track:

```tsx
<Track id="music" layout="free">
  <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.35}
    fade={{ in: 0.5, out: 1.5 }} duck={{ under: "main", to: 0.15 }} />
</Track>
```

| Prop | |
|---|---|
| `volume` | Loudness, 0 to 4 (1 is as recorded). |
| `fade` | Seconds to fade `in` and `out`. |
| `duck` | Lower the volume `to` this level while the track named `under` has sound, with `attack` and `release` times. |
| `automation` | Volume and pan changing over time. |
| `in`, `out`, `speed` | Trim and speed, as on a clip; `word:N` references work too. |

`duration="fill"` runs the music to the end of the video, however long the edit becomes. Speed ramps and freezes on
a clip apply to its sound as well.

There are no audio effects: a clip's sound plays with its volume, fades, automation, ducking and speed.
