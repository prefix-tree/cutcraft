# Quick start

You need Node 22.19 or later.

```sh
npm install cutcraft @cutcraft/kit react zod
```

`cutcraft` is the command line that exports a file. The other three give your editor the types for writing one.

## A first file

Put a video next to two new files. Here the video is `talk.mp4`, someone speaking for about ten seconds.

```
my-video/
  talk.mp4
  manifest.json
  video.tsx
```

The manifest lists the assets the file may use, by id. For each one it holds what CutCraft can't work out from the
file name: its length, its size and, for speech, the words and when each is said.

```json
{
  "assets": {
    "talk": {
      "id": "talk", "kind": "video", "duration": 10.2, "fps": 30, "width": 1920, "height": 1080,
      "transcript": { "words": [
        { "i": 0, "text": "Small", "start": 0.42, "end": 0.71 },
        { "i": 1, "text": "software", "start": 0.71, "end": 1.20 },
        { "i": 2, "text": "deserves", "start": 1.24, "end": 1.69 },
        { "i": 3, "text": "a", "start": 1.69, "end": 1.77 },
        { "i": 4, "text": "real", "start": 1.77, "end": 2.02 },
        { "i": 5, "text": "cloud.", "start": 2.02, "end": 2.55 }
      ] }
    }
  }
}
```

CutCraft doesn't make manifests for you yet. `ffprobe` gives the duration, size and frame rate, and a speech-to-text
tool that reports word timings (Whisper does) gives the words.

The file is a React component that returns a `<Composition>`:

```tsx
import { Captions, Clip, Composition, Title, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="line" src="asset:talk" in="word:0" out="word:5.end" />
      </Track>
      <Track id="overlays">
        <Title id="title" anchor="line" at="word:4" duration={1.5}>A real cloud</Title>
      </Track>
      <Captions id="captions" src="asset:talk" animation="karaoke" />
    </Composition>
  );
}
```

The clip plays the sentence from its first word to the end of its sixth. The title appears on "real", and the
captions come from the words the clip plays.

## Export it

```sh
npx cutcraft video.tsx --manifest manifest.json --out video.mp4
```

The media is found by asset id in the file's folder (`talk.mp4` for `asset:talk`); `--media <dir>` points somewhere
else. Change `out="word:5.end"` to `out="word:3.end"` and export again: the clip ends two words earlier and the title
still lands on its word, or the export tells you the word is no longer played.

Two more commands you'll use:

```sh
npx cutcraft video.tsx --manifest manifest.json --still 1 --out poster.png    # one frame
npx cutcraft video.tsx --manifest manifest.json --check-layout                # overlays off the frame or over the captions
```

## Play it in the browser

```tsx
import { collectModule, resolve } from "@cutcraft/kit";
import { Player } from "@cutcraft/player";
import "@cutcraft/player/fonts.css";
import * as file from "./video";
import manifest from "./manifest.json";

const state = resolve(collectModule(file), manifest);

<Player state={state} element={file.default({})} media={{ talk: "/talk.mp4" }} controls />
```

## Next

- [The file](./the-file): what a file holds and the rules that keep it editable.
- [Time by meaning](./time): words, shots, anchors and sequence tracks.
- [Free code](./free-code): any React, three.js or Motion in your video.
- [Exporting](./exporting) and the [CLI reference](/reference/cli) for every option.
