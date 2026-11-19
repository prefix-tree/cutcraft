# Footage and sound

## eclipse.webm

Ernie Wright, of NASA's Scientific Visualization Studio, answering questions about the total lunar eclipse of
14 March 2025.

- Source: NASA's Scientific Visualization Studio, "NASA Interview Opportunity: Watch A Red Moon Dance Across The Sky
  THIS Friday", item 14791, <https://svs.gsfc.nasa.gov/14791/>, file `Ernie_Wright_lunar_eclipse.mp4`.
- Licence: public domain, as a work of NASA. NASA does not endorse this project; its name and insignia are not used
  here beyond what the footage itself shows.
- What was done to it: 79 seconds cut from the eight minute interview (from 5 min 14 s), cropped to a square around
  the speaker, and encoded as VP9 with Opus sound.

`eclipse.json` is the transcript of those 79 seconds with a time for every word, made with the open-source Whisper
model (`small.en`) and corrected by hand for capital letters. `uberscene add media/eclipse.webm` reads it into
`uberscene.json`.

## hundred-videos.webm

MrBeast (Jimmy Donaldson) and Lex Fridman, talking about how to get better at making videos.

- Source: Lex Fridman Podcast #351, "MrBeast: Future of YouTube, Twitter, TikTok, and Instagram",
  <https://www.youtube.com/watch?v=Z3_PwvvfxIU>, from 1 h 3 min 25 s to 1 h 4 min 9 s.
- Licence: none. The episode is the copyright of the Lex Fridman Podcast. This is a 44 second excerpt, credited here,
  used to show an edit. It is not covered by this repository's MIT licence, and neither speaker has anything to do
  with this project or endorses it. If you hold rights in it and want it removed, open an issue.
- What was done to it: 44 seconds cut from the episode and encoded as VP9 with Opus sound, at the source's 1920 by
  1080. The framing is done in `hundred-videos.tsx`, not in the file.

`hundred-videos.json` is the transcript of those 44 seconds with a time for every word, made with the open-source
Whisper model (`small.en`) and corrected by hand in four places. `uberscene add media/hundred-videos.webm` reads it
into `uberscene.json`.

## Sound cues

`tick.wav`, `click.wav`, `pop.wav`, `whoosh.wav`, `swish.wav`, `riser.wav`, `thud.wav` and `chime.wav`.

- Source: made in this repository by `sounds.ts`, a small synth of sine partials and seeded noise. Nothing was
  recorded or downloaded.
- Licence: the repository's MIT licence, like the code that makes them.
- What they are: 48 kHz mono 16-bit WAV, each peaking at -3 dBFS. `pnpm --filter @uberscene/example-shorts sounds`
  writes any that are missing, and `--force` writes them all again; the shorts test fails if a committed file is not
  what the script makes. `uberscene add media/<name>.wav` put each in `uberscene.json`.
