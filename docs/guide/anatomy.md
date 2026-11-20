# Anatomy of a video

A video is one TSX file. Its default export is a component that returns a `<Composition>`, and inside it are a few
primitives: tracks, clips and layers, and the elements built on them. This page takes them one at a time, from the
three-second card below to footage, music and code of your own.

```tsx [video.tsx]
import { Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="text" layout="free">
        <Shape id="card" start={0} duration={3} shape="rectangle" width={900} height={240} style="card" />
        <Title id="hello" start={0.3} duration={2.7}>Hello, video</Title>
      </Track>
    </Composition>
  );
}
```

## Video properties

A video has three properties, set on `<Composition>`:

- `width` and `height` in pixels;
- `fps`, frames per second.

There is no duration to set. A video lasts until its last element ends, so it grows and shrinks as you edit. Its
first frame is at 0 seconds.

## Tracks

A `<Track>` is a row of the timeline. A track plays its children one after another, in the order the file lists
them, so you never add up start times. A track with `layout="free"` places each child at its own `start` instead.
Here the two clips play back to back, the title comes in at one second, and the music runs from the start to the end
of the video, however long the edit becomes (`duration="fill"`).

The first track is the bottom of the picture and each later one draws on top, so a file reads like a timeline seen
from above: the footage, then what goes over it, then the music.

```tsx
<Composition fps={30} width={1920} height={1080}>
  <Track id="main">
    <Clip id="intro" src="asset:intro" />
    <Clip id="demo" src="asset:demo" in={2} out={9} />
  </Track>
  <Track id="text" layout="free">
    <Title id="name" start={1} duration={3}>Halvard</Title>
  </Track>
  <Track id="music" layout="free">
    <Audio id="bed" src="asset:music" start={0} duration="fill" volume={0.3} />
  </Track>
</Composition>
```

## Clips

A `<Clip>` places a stretch of footage on a track: `src` names a video or image, `in` and `out` trim it. The media a
file may use are listed in a **manifest** by id, so `asset:demo` is the `demo` entry there, with its length, size and
frame rate. `<Audio>` does the same for sound.

`in` and `out` are seconds of the source. They can also name a moment in it: a word of its transcript (`word:12`), a
cut between shots (`shot:3`) or a pause (`silence:2`), which keeps the cut on that moment when the clip is trimmed
or sped up ([Timing](./time)).

## Layers: a blank canvas on the timeline

Anything the elements don't cover, you draw yourself. A `<Layer>` is a blank canvas placed in time like a clip, and
inside it you write ordinary React. `useLayer()` tells it what time it is:

```tsx [video.tsx]
import { Composition, Layer, Track, useLayer } from "@uberscene/kit";

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

The layer counts up for three seconds and fades in as it goes. What it draws is a function of time, so the same
moment always draws the same frame. Change what you draw from moment to moment and you have an animation.

`useLayer()` gives `elapsed` (seconds since the layer started), `t` (progress through it, 0 to 1), `remaining`,
`duration`, `time` (the video's time) and `fps`. CSS, canvas, WebGL, three.js and Motion all work in a layer.
[Free code](./free-code)

## Everything else is built on these

- **Text and graphics:** `<Title>`, `<Shape>`, `<Svg>`, `<Captions>`, and [components](/reference/components/)
  such as lower thirds, callouts and counters, all styled by the file's [theme](./themes).
- **Between and on clips:** `<Transition>` between two clips, `<Effect>` for colour, blur, keying and the rest,
  `<Mask>`, `<Keyframe>`, speed ramps and freeze frames. [All elements](/reference/elements/)
- **Values to change later:** a file can export a `schema` and `defaults`, so the same cut renders with another name
  or colour. [The file](./the-file)

- **Ids:** every element has a literal `id`, which is how an editor finds it to change one value
  ([Introduction](./introduction)). [Editing](./editing)

## Next

- [The file](./the-file): what else a file holds, and the rules that keep it editable.
- [Timing](./time): starts and ends by words, shots, pauses and other elements.
- [Free code](./free-code): what a layer can draw, and three.js and Motion.
- [Elements](/reference/elements/): every element and its props.
