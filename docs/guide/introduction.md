# A whole multimedia pipeline written as code.

::: warning Work in progress
UberScene is early. The API is still being shaped and changes between releases, often in breaking
ways, and will keep changing until 1.0. Each release's changelog says how to move a file, and `uberscene lint --fix`
moves most of it for you.
:::

<p class="doc-lead">A video is a file. One TSX file is the project, the edit and the code. The player plays it, an editor changes it, the export renders it, and you and your agent work on that same text.</p>

```tsx [video.tsx]
import { Captions, Clip, Composition, LowerThird, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="talk" src="asset:talk" in={2} out={12} />
      </Track>
      <Track id="over" layout="free">
        <LowerThird id="name" start={0.5} duration={4} name="Maya Chen" role="Head roaster, Halvard" />
      </Track>
      <Captions id="captions" src="asset:talk" animation="karaoke" />
    </Composition>
  );
}
```

Ten seconds of an interview with a name card and captions. Every element has a literal `id`, which is how an editor
finds it: drag the end of `talk` on a timeline, and UberScene changes one value in the file, `out={12}` to `out={11}`,
and nothing else. There is no project file beside it, so whoever opens the file next, you or a model, reads the edit
as code. Where the elements stop, a `<Layer>` holds any React, CSS, canvas or WebGL, on the video's clock.

## What you get

**To write a video with:**

- [Elements](/reference/elements/) for footage, sound, tracks, transitions, titles, shapes, SVG, masks, keyframes,
  speed ramps, freeze frames and multicam.
- [Captions](./captions-and-sound) from a transcript that follow the clips through every trim, word by word or as
  karaoke, and narration timed from a script.
- [Effects and transitions](/reference/effects/), from exposure, curves and LUTs to keying, glow and film burn, run
  as shaders in the preview and the export. Or write your own in GLSL.
- [Components](/reference/components/) such as lower thirds, callouts, counters and badges, and parts for
  drawing diagrams in a layer.
- [Themes and fonts](./themes): a palette, type and motion style set once in the file.
- [Free code](./free-code): any React in a `<Layer>`, and three.js and Motion on the timeline.

**To play, check and export it:**

- A React [`<Player>`](./player) that plays the file in your app, and [editor actions](./editing) (trim, move,
  retime, restyle) that are undoable and written back to the file.
- A [command line](/reference/cli) that exports MP4, WebM, audio, stills and subtitles, and checks a cut without
  watching it: the timeline as text, sheets of frames, and the layout against a platform's safe zone.
- The [UberScene skill](./agents), which teaches a coding agent all of the above.

## How it fits together

```
video.tsx      ┐                                       ┌─▶ <Player>   plays it in a page
uberscene.json  ├─▶ resolve ─▶ every element in seconds ├─▶ actions    edit it; each edit is written back to video.tsx
media files    ┘                                       └─▶ export     MP4, WebM, a still or subtitles
```

**Resolving** reads the file and the manifest and gives every element its start and end in seconds. The player, the
editor and the export all work from that one result, so the preview and the export agree.

In practice:

1. `npx uberscene add talk.mp4` lists the media in `uberscene.json`, the manifest.
2. You write `video.tsx`, or your agent does with the [UberScene skill](./agents).
3. `npx uberscene look video.tsx` draws a sheet of its frames, and `uberscene inspect` prints the timeline as text,
   so a cut can be checked without watching it.
4. The [`<Player>`](./player) plays it in your app, and an editor around it changes the file by hand.
5. `npx uberscene video.tsx --out video.mp4` exports it, through the same player in headless Chrome.

It comes as six npm packages, free under the MIT licence:

| Package | What it does |
|---|---|
| [`uberscene`](https://www.npmjs.com/package/uberscene) | The command line: export, check and look at a file, and add media to its manifest. |
| [`@uberscene/kit`](https://www.npmjs.com/package/@uberscene/kit) | What a video file imports: the elements, components, hooks, helpers and theme. |
| [`@uberscene/sdk`](https://www.npmjs.com/package/@uberscene/sdk) | What a tool is built with: the resolver that places everything in time, the editor actions, the lint, and the tools that write edits back into the file. |
| [`@uberscene/player`](https://www.npmjs.com/package/@uberscene/player) | A React `<Player>` and a framework-free `PlayerCore` for the browser. |
| [`@uberscene/render`](https://www.npmjs.com/package/@uberscene/render) | The export from your own code: from Node, through the player in headless Chrome. |
| [`@uberscene/graphics`](https://www.npmjs.com/package/@uberscene/graphics) | three.js and Motion on the video's clock, for `<Three>` and `<Motion>`. |

## Next

- [Quick start](./getting-started): make a video, look at it and export it.
- [Anatomy of a video](./anatomy): the composition, tracks, clips and layers, one at a time.
- [With your agent](./agents): install the skill and ask for a video.
- [Examples](/examples/): finished videos next to the files that made them.
- [Core principles](./principles): why UberScene is built this way.
