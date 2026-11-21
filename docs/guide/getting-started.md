# Quick start

Make a video from one clip, look at it, export it to MP4, then build on it: a second clip, a trim, a name card and
captions.

::: warning Work in progress
UberScene is early. The API is still being shaped and changes between releases, often in breaking
ways, and will keep changing until 1.0. Each release's changelog says how to move a file, and `uberscene lint --fix`
moves most of it for you.
:::

You need Node 22.19 or later. You don't need ffmpeg: the export draws its frames in Chrome, which it downloads the
first time.

## 1. Install

```sh
mkdir my-video && cd my-video
npm install uberscene @uberscene/kit react zod
```

`uberscene` is the command line. `@uberscene/kit` holds the elements the video is written in; `react` and `zod` give
your editor the types.

## 2. Add your footage

Put a clip in the folder, `talk.mp4` say. If you have its transcript, put it beside it with the same name: `talk.json`
from Whisper or ElevenLabs, or a `talk.srt` or `talk.vtt`. Then add it:

```sh
npx uberscene add talk.mp4
# talk: video, 32.0 s, 1920x1080 at 30 fps, with sound, 96 words from talk.json → uberscene.json
#   <Clip id="talk" src="asset:talk" />
```

`uberscene.json` is the manifest. It lists the media the video may use, each by an id (`talk`), with what UberScene reads from the file
once: its length, size, frame rate, sound and the words of its transcript. The video refers to it as `asset:talk`, and
the last line is the element that plays it, ready to paste.

## 3. Write the video

Save this as `video.tsx`:

```tsx [video.tsx]
import { Clip, Composition } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Clip id="talk" src="asset:talk" />
    </Composition>
  );
}
```

The `<Composition>` is the video: 1920×1080 at 30 frames a second. The `<Clip>` plays the whole of `talk`, and the
video is as long as the clip. [Anatomy of a video](./anatomy) explains each piece.

## 4. Look at it

```sh
npx uberscene look video.tsx
```

This writes `look.png`, a sheet of frames from the video: the first frame of each clip, each title and the edges of
every cut, each labelled with its time. It draws the frames with the real player in Chrome for Testing, which the
first run downloads (about a minute); after that it takes a few seconds.

`npx uberscene inspect video.tsx` prints the timeline as text instead: each element with its
start and end, and the words each clip plays.

## 5. Export it

```sh
npx uberscene video.tsx --out video.mp4
```

Each command finds `uberscene.json` in the file's folder or a folder above it, and finds `talk.mp4` beside the file,
beside the manifest or in `media/` next to it. `--manifest` and `--media` point elsewhere.

The export uses the same Chrome as `look`. `--draft` renders
a quick half-size copy beside it (`video.draft.mp4`) to watch while you work, and `--still 3 --out poster.png` writes
one frame.

## 6. Change it

The video is the file, so a change is an edit and another export.

**Add a clip.** Clips written in the composition play one after another, in the order they are written. Add
`intro.mp4` with `npx uberscene add intro.mp4`, then write it first:

```tsx
<Composition fps={30} width={1920} height={1080}>
  <Clip id="intro" src="asset:intro" />
  <Clip id="talk" src="asset:talk" />
</Composition>
```

**Trim it.** `in` and `out` are seconds of the source. This plays seconds 2 to 12 of `talk`; `fit="cover"` fills the
frame when the footage has another shape:

```tsx
<Clip id="talk" src="asset:talk" in={2} out={12} fit="cover" />
```

**Cut on a word.** With a transcript, `in` and `out` can name words instead of seconds, so the cut never lands
mid-word. `in="word:5"` starts on the sixth word; `out="word:30.end"` ends after the 31st:

```tsx
<Clip id="talk" src="asset:talk" in="word:5" out="word:30.end" fit="cover" />
```

**Put a name over it.** Anything that goes over the clips sits in a `<Track>`, written after them. With
`layout="free"` each element in it takes its own `start`. The clips stay as they are:

```tsx
<Composition fps={30} width={1920} height={1080}>
  <Clip id="intro" src="asset:intro" />
  <Clip id="talk" src="asset:talk" in={2} out={12} fit="cover" />
  <Track id="over" layout="free">
    <LowerThird id="name" start={0.5} duration={4} name="Maya Chen" role="Head roaster, Halvard" />
  </Track>
</Composition>
```

**Add captions.** They come from the words the clips play, so they need a transcript:

```tsx
<Captions id="captions" src="asset:talk" animation="karaoke" />
```

**Add music.** Another track, with `layout="free"` so the music can start at 0 and run to the end, however long the
cut becomes:

```tsx
<Track id="music" layout="free">
  <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.3} />
</Track>
```

Add `music.mp3` to the manifest first with `npx uberscene add music.mp3`.

**Draw something of your own.** A `<Layer>` holds any React, and `useLayer()` tells it the time, so it can animate:

```tsx
function Badge() {
  const { t } = useLayer(); // 0 to 1 through the layer
  return <div style={{ position: "absolute", top: 60, right: 60, opacity: t, font: "700 48px Inter", color: "white" }}>LIVE</div>;
}

// in the "over" track:
<Layer id="badge" start={0} duration={3}><Badge /></Layer>
```

Import `Track`, `LowerThird`, `Captions`, `Audio`, `Layer` and `useLayer` from `@uberscene/kit` as you use them. Run `look` again after each change.

## Play it in a page

The same file plays in the browser with `@uberscene/player`, in a React app built with Vite or any bundler that
imports `.tsx` and JSON ([Player](./player) has the details):

```tsx
import { collectModule, resolve } from "@uberscene/sdk";
import { Player } from "@uberscene/player";
import "@uberscene/player/fonts.css";

import manifest from "./uberscene.json";
import * as file from "./video";

const state = resolve(collectModule(file), manifest);

<Player state={state} element={file.default({})} media={{ talk: "/talk.mp4" }} controls />;
```

`media` says where the browser finds each asset. An editor built around the player changes the file through
[actions](./editing): drag the end of `talk` and `out={12}` becomes `out={11}` in `video.tsx`.

## Next

- [Anatomy of a video](./anatomy): the composition, tracks, clips, layers and the rest, one at a time.
- [With your agent](./agents): install the UberScene skill and ask for a video in plain words.
- [Examples](/examples/): finished videos next to the files that made them.
- [Exporting](./exporting) and the [CLI reference](/reference/cli) for every option.
