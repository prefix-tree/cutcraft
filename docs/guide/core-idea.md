# The core idea

The idea of CutCraft is to let you write a video as a timeline of React elements, where every piece says when it
happens the way a person would say it ("on the twelfth word", "at the second shot"), and CutCraft works out the
seconds.

This is a whole video. It cuts an interview down to one sentence and puts a title on the word it belongs to:

```tsx [video.tsx]
import { Clip, Composition, Title, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="talk" src="asset:interview"
          in="word:12" out="word:30.end" />
      </Track>
      <Track id="text">
        <Title id="point" anchor="talk" at="word:16" duration={2}>
          Ship small
        </Title>
      </Track>
    </Composition>
  );
}
```

The clip starts on the 12th word of the interview and ends after the 30th. The title appears when the clip says its
16th word, and stays for 2 seconds. No line names a second of the finished video. Trim the clip and the title stays
on its word; give the clip a speed change and both still land where they should.

The words come from the asset's transcript in the **manifest**, the list of media a file may use. A shot boundary or
a silence works the same way: `in="shot:1"`, `at="silence:2"`. See [Time by meaning](./time).

CutCraft includes elements for footage, sound, transitions, titles, shapes, SVG, captions, colour and effects. A video
is footage and sound placed in time, with pictures drawn over them.

## A blank canvas on the timeline

Anything the elements don't cover, you draw yourself. A `<Layer>` is a blank canvas placed in time like any other
element, and inside it you write ordinary React. `useLayer()` tells it what time it is:

```tsx [video.tsx]
import { Composition, Layer, Track, useLayer } from "@cutcraft/kit";

function Clock() {
  const { elapsed, t } = useLayer();
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 120, opacity: t }}>
      {elapsed.toFixed(1)} s
    </div>
  );
}

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="fx" layout="free">
        <Layer id="clock" start={0} duration={3}>
          <Clock />
        </Layer>
      </Track>
    </Composition>
  );
}
```

The layer counts up for three seconds and fades in as it goes. What it draws is a function of the time, so the same
moment always draws the same picture. That is why the preview can jump to any frame and why the export can capture
each frame exactly. Change what you draw from moment to moment and you have an animation.

`useLayer()` gives:

- `elapsed`: seconds since the layer started;
- `t`: progress through the layer, 0 to 1;
- `remaining` and `duration`, in seconds;
- `time`: the composition's time;
- `fps`.

CSS, canvas, WebGL, three.js and Motion all work in a layer: see [Free code](./free-code).

## Video properties

A video has three properties, set on `<Composition>`:

- `width` and `height` in pixels;
- `fps`, frames per second.

There is no duration to write. A video lasts until its last element ends, so it grows and shrinks as you cut. The
first frame is at 0 seconds.

## Tracks

A `<Track>` plays its clips one after another, in the order the file lists them, so you never add up start times. A
track with `layout="free"` takes a `start` on each element instead. An element can also hang off another one with
`anchor`, as the title above hangs off the clip.

The first track is the bottom of the picture, and each later track draws on top. A file reads the way a brief is
written: the main footage, then what goes over it, then the music.

## The file

A video is one TSX file. Its default export is a component that returns the `<Composition>`. Two optional exports,
`schema` and `defaults`, declare the values you want to change later without touching the edit. The component takes
them as props:

```tsx [video.tsx]
import { z } from "zod";
import { Clip, Composition, Title, Track } from "@cutcraft/kit";

export const schema = z.object({ product: z.string() });
export const defaults = { product: "Shed" };

export default function Video({ product }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1080} height={1920}>
      <Track id="main">
        <Clip id="talk" src="asset:interview"
          in="word:12" out="word:30.end" />
      </Track>
      <Track id="text">
        <Title id="name" anchor="talk" at="word:14" duration={2}>
          {product}
        </Title>
      </Track>
    </Composition>
  );
}
```

`npx cutcraft video.tsx --props '{"product":"Pixel"}' --out pixel.mp4` renders the same cut with another name.

There is no project file beside it. The player plays this file, an editor changes it, and the export renders it. When
you drag the end of `talk` in an editor, CutCraft finds the element by its `id` and changes one value in the file, so
whoever reads it next, you or a model, sees the edit as code.

## Next

- [Quick start](./getting-started) takes you from `npm install` to an exported file.
- [The file](./the-file) covers everything a file can hold.
- [Core principles](./principles) explains why CutCraft is built this way.
