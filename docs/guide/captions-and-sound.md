# Captions and sound

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

Audio effects (`<AudioEffect>`) and pitch correction are accepted but not played yet, and the lint says so.
