# Quick start

Four steps, each adding one thing: a video with no footage at all, then your own footage cut in seconds, then cut on
words, then three.js and Motion. You need Node 22.19 or later.

```sh
mkdir my-video && cd my-video
npm install cutcraft @cutcraft/kit react zod
```

`cutcraft` is the command line that exports a file. The other three give your editor the types for writing one.

## 1. A video with no footage

A video is a React component that returns a `<Composition>`. Save this as `hello.tsx`:

```tsx
import { Composition, Shape, Title, Track } from "@cutcraft/kit";

// No footage yet, so the manifest lists no assets.
export const manifest = { assets: {} };

export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720}>
      <Track id="text" layout="free">
        <Shape id="card" start={0} duration={3} shape="rectangle" width={760} height={220} style="card" />
        <Title id="hello" start={0.3} duration={2.5} style="h1" animation={{ preset: "word-by-word" }}>
          Hello, video
        </Title>
      </Track>
    </Composition>
  );
}
```

```sh
npx cutcraft hello.tsx --out hello.mp4
```

Three seconds of a card with a title that builds word by word. Every element has a literal `id`: that is how an editor
finds it when you drag it on a timeline ([The file](./the-file) explains why).

## 2. Your own footage, cut in seconds

Put a video next to the file, `talk.mp4` say, and list it in a `manifest.json`. The manifest names each asset the file
may use and holds what CutCraft can't read from a file name: its length, size and frame rate (`ffprobe talk.mp4` shows
them). A font the file names, beyond the five that ship, goes in the manifest
too ([Fonts](./themes#fonts)).

```json
{
  "assets": {
    "talk": { "id": "talk", "kind": "video", "duration": 10.2, "fps": 30, "width": 1920, "height": 1080 }
  }
}
```

Now a clip plays seconds 1 to 5 of it, under the title:

```tsx
import { Clip, Composition, Title, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720}>
      <Track id="main">
        <Clip id="line" src="asset:talk" in={1} out={5} fit="cover" />
      </Track>
      <Track id="text" layout="free">
        <Title id="hello" start={0.5} duration={2.5} style="h1">Hello, video</Title>
      </Track>
    </Composition>
  );
}
```

```sh
npx cutcraft video.tsx --manifest manifest.json --out video.mp4
```

`src="asset:talk"` finds `talk.mp4` (or `talk.webm`, `talk.mov`…) in the file's folder; `--media <dir>` points
somewhere else. The `main` track lays its clips end to end; the `text` track places each element where you say.

## 3. Cut on words

Seconds are fine until the cut has to land between two words. Give the asset its transcript, with when each word is
said. A speech-to-text tool that reports word timings (Whisper does) gives you this:

```json
"transcript": { "words": [
  { "i": 0, "text": "Small", "start": 0.42, "end": 0.71 },
  { "i": 1, "text": "software", "start": 0.71, "end": 1.20 },
  { "i": 2, "text": "deserves", "start": 1.24, "end": 1.69 },
  { "i": 3, "text": "a", "start": 1.69, "end": 1.77 },
  { "i": 4, "text": "real", "start": 1.77, "end": 2.02 },
  { "i": 5, "text": "cloud.", "start": 2.02, "end": 2.55 }
] }
```

Then the clip, the title and captions all speak in words:

```tsx
<Track id="main">
  <Clip id="line" src="asset:talk" in="word:0" out="word:5.end" />
</Track>
<Track id="overlays">
  <Title id="title" anchor="line" at="word:4" duration={1.5}>A real cloud</Title>
</Track>
<Captions id="captions" src="asset:talk" animation="karaoke" />
```

The clip plays from the first word to the end of the sixth, the title appears on "real", and the captions come from
the words the clip plays. Change `out="word:5.end"` to `out="word:3.end"` and export again: the clip ends two words
earlier and the title still lands on its word, or the export tells you the word is no longer played.
[Time by meaning](./time) covers words, shots and anchors.

## 4. three.js and Motion

Anything you draw can be code. `<Motion>` animates its HTML or SVG children with a Motion sequence, `<Three>` holds a
three.js scene, and both run on the video's clock:

```tsx
<Motion id="name" anchor="line" at="word:4" duration={2}
  sequence={[["h1", { opacity: [0, 1], y: [40, 0] }, { duration: 0.5 }]]}>
  <h1 style={{ position: "absolute", left: 80, bottom: 80, color: "white" }}>A real cloud</h1>
</Motion>
```

These need a browser to export: the export runs the real player in headless Chromium. Install `playwright-core` and
point `CUTCRAFT_CHROMIUM` at Chrome or Chromium 153 or later:

```sh
npm install playwright-core
CUTCRAFT_CHROMIUM=/path/to/chrome npx cutcraft video.tsx --manifest manifest.json --out video.mp4
```

A file without `<Three>` or `<Motion>` still exports without a browser. [Free code](./free-code) covers both tags, and
the [examples](/examples) show four complete videos built with them.

## More commands

```sh
npx cutcraft video.tsx --manifest manifest.json --still 1 --out poster.png    # one frame
npx cutcraft video.tsx --manifest manifest.json --check-layout                # overlays off the frame or over the captions
```

## Play it in a page

The same file plays in the browser with `@cutcraft/player` ([Player](./player) has the details):

```tsx
import { installFreeCodeLibraries } from "@cutcraft/graphics/libraries";
import { collectModule, resolve } from "@cutcraft/kit";
import { Player } from "@cutcraft/player";
import "@cutcraft/player/fonts.css";

import manifest from "./manifest.json";
import * as file from "./video";

installFreeCodeLibraries(); // only if the file uses <Three> or <Motion>
const state = resolve(collectModule(file), manifest);

<Player state={state} element={file.default({})} media={{ talk: "/talk.mp4" }} controls />;
```

## Next

- [Examples](/examples): finished videos next to the files that made them, and where to start for what you're making.
- [The file](./the-file): what a file holds and the rules that keep it editable.
- [Time by meaning](./time): words, shots, anchors and sequence tracks.
- [Exporting](./exporting) and the [CLI reference](/reference/cli) for every option.
