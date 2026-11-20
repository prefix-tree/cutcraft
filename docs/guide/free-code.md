# Free code

When the ready-made elements don't draw what you want, draw it yourself. The timeline part of a file uses
UberScene's elements, so an editor can trim and move things, but what you draw is up to you. A `<Layer>` holds any
React component: hooks, CSS 3D transforms, filters and blend modes, a canvas, WebGL, a chart library. `<Three>` and
`<Motion>` bring three.js and Motion onto the timeline.

**See it in:** [How game lighting fakes it](/examples/game-lighting) (a `<Three>` room lit from the
layer's time), [One pixel](/examples/one-pixel) (diagrams drawn with the diagram parts),
[Product launch](/examples/launch) (`<Three>` and `<Motion>`), [Kinetic type](/examples/kinetic)
(`<Motion>` phrases on their words), [Data story](/examples/data) (SVG in `<Motion>`, React counters in a
`<Layer>`), [Logo reveal](/examples/logo) (three.js particles), [Stats with handles](/recipes/stats) (a
component in a `<Layer>` with editable props).

## A Layer holds any React

A Layer sits on the timeline like any overlay. It has an id and a start or an anchor, and it can be trimmed, moved and
pinned to a word. Inside it, write whatever you like:

```tsx
<Track id="overlays">
  <Layer id="cta" anchor="outro" offset={0.3} duration={2.5}>
    <CallToAction text="getshed.sh" accent="#ff5a1f" />
  </Layer>
</Track>
```

```tsx
function CallToAction({ text, accent }: { text: string; accent: string }) {
  const t = useT();   // 0 at the layer's start, 1 at its end
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={{ fontSize: 72, fontWeight: 700, color: "white" }}>{text}</div>
      <div style={{ width: 480, height: 8, background: "#ffffff22" }}>
        <div style={{ width: `${t * 100}%`, height: "100%", background: accent }} />
      </div>
    </div>
  );
}
```

A Layer without a `transform` covers the whole frame, so a full-screen scene is just a Layer.

## The video's clock

Free code has to show the right picture for any moment, because the player seeks, scrubs backwards and plays at
different speeds, and the export renders frames one by one. So time comes from the video, not the wall clock.

| Hook | Gives |
|---|---|
| `useT()` | The layer's progress, from 0 at its start to 1 at its end. |
| `useLayer()` | `elapsed` and `remaining` in seconds, the layer's `duration`, the video's `time` and `fps`. |

```tsx
function Countdown() {
  const { remaining } = useLayer();
  return <div>{Math.ceil(remaining)}</div>;
}
```

Scrub and the countdown shows the right number; pause and it stops. CSS animations inside a Layer are held at the
layer's time as well, so they start when the layer starts and scrub with the video. So is an animation a component
makes with `element.animate()` as it mounts.

The rule of thumb: compute what you draw from the time. Code that builds up state frame by frame, or runs on
`setTimeout` or `setInterval`, shows something different after a seek, and in an export in several pieces.

::: details CSS transitions and later animations
A CSS transition, or an `element.animate()` made later, is held from the frame that started it. It plays right when
the video plays through and in an export, and scrubs within its run. A seek that jumps over its start misses it, and
an export in several pieces (`tabs`) can cut one short, so prefer a CSS animation or `useT()` for anything that
matters.
:::

::: details The browser's clock in an export
In an export, the file's own code also gets the video's clock where it asks the browser for time:

- `requestAnimationFrame` callbacks run once per frame, with the frame's time as their timestamp;
- `performance.now()` is the frame's time in milliseconds, and `Date.now()` and `new Date()` move with it;
- `Math.random()` gives the same numbers in every export.

So a loop written the usual way exports at the right speed on any machine. This goes by name: write
`requestAnimationFrame(...)`, not `window.requestAnimationFrame(...)`, which is still the browser's own. A library
the file imports keeps the browser's clock too; `<ThreeScene>` and `useTimeline` put three.js and Motion on the
video's. The live preview runs these on the browser's clock, which agrees with the video while it plays.
:::

The lint warns about what goes off the video's clock:

- timers (`setTimeout`, `setInterval`);
- `Math.random()`: use `random(seed)` from `@uberscene/kit`, which is the same number in the preview too;
- clock globals reached through `window`;
- `<video>` and `<audio>` elements: use `<Clip>` and `<Audio>`;
- canvases created with `willReadFrequently`.

## Animation helpers

`@uberscene/kit` exports four pure functions for shaping time:

| Function | Does |
|---|---|
| `interpolate(x, inputRange, outputRange, options)` | Maps a value across ranges, with easing. It extends past the ends unless you pass `extrapolateLeft` or `extrapolateRight: "clamp"`. |
| `spring({ time, from, to, mass, damping, stiffness })` | Where a spring is `time` seconds after it is let go (mass 1, damping 10 and stiffness 100 by default). |
| `random(...keys)` | A number from 0 to 1, always the same for the same keys, so scattered things stay put from frame to frame. Several keys name one number among many: `random("star", i)`. |
| `stepAt(times, t)` | Which step a moment has reached: the index of the last of `times` (seconds, increasing) that is not after `t`, or -1 before the first. For anything that happens in steps. |

```tsx
function Badge() {
  const { elapsed, remaining } = useLayer();
  const scale = spring({ time: elapsed, damping: 12 });
  const opacity = interpolate(remaining, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  return <div style={{ transform: `scale(${scale})`, opacity }}>New</div>;
}
```

A `<Keyframe>` can use `easing="spring"` too.

## Diagram parts

A diagram in a layer is mostly the same few things: a line that draws itself, a word with a line to what it names,
a number that counts, a row of cells. The kit has each as a part. They are React components that render SVG and
read the layer's clock; they go inside an `<svg>` and take the SVG props of what they draw.

```tsx
import { Cells, CountUp, DrawnLine, Label, Layer } from "@uberscene/kit";

<Layer id="lamp" anchor="hook" at="word:14" duration={{ until: "hook" }}>
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, color: "white" }}>
    <DrawnLine from={[300, 640]} to={[620, 1100]} over={0.6} stroke="gold" strokeWidth={6} strokeLinecap="round" />
    <Label text="LAMP" x={470} y={600} to={[330, 632]} after={0.2} fontSize={40} letterSpacing={4} />
    <CountUp to={60} x={540} y={1300} after={0.8} over={1.2} fontSize={62} textAnchor="middle" />
    <Cells values={[78, 92, 96, 90]} x={240} y={1400} size={72} lit={2} litFill="gold" fill="#444" highlight={3} />
  </svg>
</Layer>
```

Each part says when it happens one of two ways, and how long it takes. These props are shared by every part:

| Prop | Means |
|---|---|
| `at` | Seconds of the video, which is what a [narration](/guide/captions-and-sound#narration-from-a-script)'s cue gives: `at={story.at("lamp")}`. |
| `after` | Seconds since the layer started, for a layer that itself starts on a word, as above. With neither `at` nor `after`, the part starts with its layer. |
| `over` | How long it takes; 0.4 s unless you say. |
| `easing` | One of the kit's easing names; `ease-in-out` unless you say. |
| `progress` | A number from 0 to 1, in place of the others, to drive the part from your own arithmetic. |

| Part | Draws | Props of its own |
|---|---|---|
| `DrawnLine` | A line that draws itself from one point to another. Nothing before it starts. | `from`, `to` (each `[x, y]`), and a line's props. |
| `Label` | A word that fades in, with a line from beside the word to the point it names. | `text`, `x`, `y` (the word's middle), `to`, `side`, `gap`, `textWidth`, `lineStroke`, `lineWidth`, `name`, and a text's props. |
| `CountUp` | A number that counts. | `from` (0), `to`, `format`, and a text's props. |
| `Cells` | A row of cells, each with a value under it if you give them. | `values` or `count`, `x`, `y`, `size`, `height`, `gap`, `radius`, `fill`, `litFill`, `lit`, `highlight`, `highlightStroke`, `valueProps`, `valueGap`, `name`. |

A label's line leaves from the edge of the word that faces the point, so it never runs through the letters; `side`
picks the edge when the guess is wrong. A label names itself for the layout check (its text in lower case, or
`name`), and `Cells` takes a `name`, so `uberscene where` and `--check-layout` see them as parts of the layer.

`useProgress({ at, after, over, easing })` is the arithmetic the parts share, for your own drawing: 0 before, 1
after, eased between. `progress(clock, when)` is the same for a clock you already hold.

## A grid

`grid()` is geometry and draws nothing. Give it the columns, the rows and the size of the whole, and it hands back
every cell with its `index`, `column`, `row` and box, and `rect(column, row)` for one cell. What goes in a cell is
yours, in a `div`, an SVG or a canvas:

```tsx
import { grid, random, useT } from "@uberscene/kit";

const board = grid({ columns: 8, rows: 15, width: 1080, height: 2025, y: -52 });
const LETTERS = [..."ABCDEFGHJKLMNPRSTUVWXYZ"];

function Wall() {
  const t = useT();
  return board.cells.map((cell) => {
    // Each cell keeps its own time, so the wall never changes all at once.
    const every = 0.3 + 2 * random("pace", cell.index);
    const turn = Math.floor((t + random("late", cell.index)) / every);
    const letter = LETTERS[Math.floor(random("letter", cell.index, turn) * LETTERS.length)];
    return (
      <div key={cell.index} style={{ position: "absolute", ...board.rect(cell.column, cell.row) }}>
        {letter}
      </div>
    );
  });
}
```

For many things that start one after another, `progress(clock, { after: start + i * 0.05 })` in a loop gives each
its own 0 to 1; it is `useProgress` without the hook, so it can be called once for each item. The
[snake short](/examples/snake-heart) is built from these: a `grid` for its board, `stepAt`
for which step the game has reached, and `random` for its wall.

## Naming what you draw

Give an element a `data-name` and the tools can tell it from the rest of the layer: the layout check reports it by
that name, and `uberscene where` lists it with its place on the frame
([Where things are](/guide/checking#where-things-are-at-a-moment)).

```tsx
<text data-name="lamp-label" x={470} y={624}>LAMP</text>
```

## Editing what's inside

An editor treats the inside of a Layer as code: to change it, you or a model edit the text. There is one shortcut.
When a Layer holds exactly one component, that component's literal props become editable in the inspector:

```tsx
<Layer id="cta" anchor="outro" duration={2.5}>
  <CallToAction text={cta} accent={accent} />
</Layer>
```

Here the inspector shows `text` and `accent` without knowing anything about `CallToAction`. Props that read a
`schema` value stay bound to it. Wrap the component in a `<div>`, or add a second child, and the props are no longer
editable this way, though the Layer itself can still be moved and trimmed.

## Blocks

A block is a scene-sized piece of free code made to be placed and tuned: a grid of cells that fills and counts, a
wall of characters that changes on the beat, a row of points lit in turn, a ranking that reorders, bars that race
over the years, a chat reply that types in, a terminal running commands, a phone being tapped, a quote that builds
word by word. Smaller than a video, bigger than a kit component. `uberscene blocks` lists the ones that ship with the CLI, by the job each does, and `--sheet` draws their
previews to choose by looking. [Blocks](/guide/blocks) walks through finding, adding, tuning and updating one, with the catalogue.

A block is one file: its component, its props `schema` with a label for each, its `defaults`, and a `meta` that says
what it is for. `uberscene blocks add <name>` copies the file into the project as `blocks/<name>.tsx` and records it,
so `uberscene blocks update` can bring it up to a later version unless you have edited it. With `--into video.tsx
--track <id> --at <moment>` it also writes the import and the Layer ([Adding a block](/reference/cli#adding-a-block)).
What changes per use, the words, the colours, the numbers, its times, is a prop on the placement:

```tsx
import { PointList } from "./blocks/point-list";

<Layer id="steps" anchor="list" duration={{ until: "list" }}>
  <PointList
    points={[
      { label: "SCRIPT", icon: "lines", at: story.at("script") },
      { label: "VOICE", icon: "wave", at: story.at("voice") },
    ]}
  />
</Layer>
```

A block reads its Layer's clock. A moment takes `after`, seconds since the layer started, or `at`, seconds of the
video, which is what a narration's cue gives, so its reveals land on the words. Given more time than its natural
length it holds its last state. Its colours default to theme tokens, `$accent` and `$text`, so it takes the video's
look; `themeCss("$accent")` gives the same `var(--us-accent)` to your own components. The copy is yours: edit it
like any of your modules. [An interview that changes layout](/examples/hundred-videos) and
[Snake heart](/examples/snake-heart) are built on blocks.

## three.js and Motion

When the app that loads the file has installed them (below), a file gets two more tags. Both sit on the timeline like
a Layer: `id`, `start` or `anchor` and `at`, `duration`, `transform`, `enter` and `exit`.

### `<Three>`

`<Three>` holds a three.js scene. Write plain three.js in `setup`. It runs once with `{ scene, camera, renderer,
THREE, width, height }`, and the function it returns runs for every frame with `{ time, t, duration }`, where `time`
is seconds since the tag started:

```tsx
<Three id="cube" anchor="hook" at="word:14" duration={4}
  camera={{ position: [0, 0, 5], fov: 40 }} background="#101010"
  setup={({ scene, THREE }) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
    scene.add(cube);
    return ({ time }) => { cube.rotation.set(time * 0.6, time, 0); };
  }}
/>
```

Set the scene from `time` instead of adding up small steps, because the player may ask for any frame, including an
earlier one after a scrub. What `setup` added is removed when the tag ends.

`camera` (`position`, `lookAt`, `fov`, `near`, `far`, `zoom`, `orthographic`) and `background` are props the inspector
can edit.

React Three Fiber works as children too, in place of `setup` or next to it, and `useFrame`'s `clock.elapsedTime` is
the same `time`:

```tsx
<Three id="logo" start={2} duration={3} camera={{ position: [0, 0, 4] }}>
  <ambientLight />
  <Logo />
</Three>
```

### `<Motion>`

`<Motion>` plays a Motion `sequence` over its children. Each step names a selector inside the tag, its keyframes,
and options such as `duration`, `at`, `ease` and `delay`:

```tsx
<Motion id="headline" anchor="hook" duration={3}
  sequence={[
    ["h1", { opacity: [0, 1], y: [40, 0] }, { duration: 0.6 }],
    [".rule", { scaleX: [0, 1] }, { at: 0.3, duration: 0.8 }],
  ]}>
  <h1>Launch</h1>
  <div className="rule" />
</Motion>
```

### Inside a plain Layer

Inside a plain `<Layer>`, use the same libraries through adapters that follow the layer's clock: `<ThreeScene>` from
`@uberscene/graphics/three` (a React Three Fiber canvas), and `useTimeline(sequence)` and `useLayerTime()` from
`@uberscene/graphics/motion`. A bare `<Canvas>`, Motion's `animate()`, or a `motion` element with `animate` or
`whileInView` runs on its library's own clock, and the lint points you to the adapter.

### Any library that can seek

A GSAP timeline, an Anime.js timeline, a Lottie animation: anything that can be set to a moment plays on the video's
clock through the kit's `useSeekable`. Build it once, paused, on the element the returned ref is on; the hook seeks it
to the layer's time (in seconds) on every frame, before the frame is painted, so it scrubs both ways and exports as
previewed:

```tsx
import { useSeekable } from "@uberscene/kit";
import gsap from "gsap";

function Dot() {
  const ref = useSeekable((el) =>
    gsap.timeline({ paused: true }).to(el.querySelector(".dot"), { x: 300, duration: 1.5 }),
  );
  return <div ref={ref}><div className="dot" /></div>;
}
```

When the layer ends, or the object is rebuilt because the `deps` given as the second argument changed, the hook
calls its `revert`, `destroy` or `kill`, the first it has. A GSAP timeline fits as it is. Other libraries take a few
lines, because they count in milliseconds or frames:

```tsx
// Anime.js
const ref = useSeekable((el) => {
  const tl = createTimeline({ autoplay: false }).add(el.querySelector(".dot"), { x: 300, duration: 1500 });
  return { seek: (s) => tl.seek(s * 1000), revert: () => tl.revert() };
});

// Lottie (lottie-web)
const ref = useSeekable((el) => {
  const anim = lottie.loadAnimation({ container: el, animationData, autoplay: false, renderer: "svg" });
  return { seek: (s) => anim.goToAndStop(s * 1000, false), destroy: () => anim.destroy() };
});
```

A `seek` that returns a promise holds the export's frame until it settles. The library is imported like any other
(below, [Libraries](#libraries)), and its licence is yours to check: GSAP is free to use under its own licence, not
an open source one.

## Effects and transitions of your own

A look the built-in effects don't have is a few lines of GLSL, declared in the file with `effect()` or
`transition()` and used as an `<Effect>` or `<Transition>` type. [Your own effects and transitions](./custom-effects)
shows how.

## Libraries

What a file may import is up to the app that loads it. By default that is `react`, `zod` and `@uberscene/kit`. To
offer three.js and Motion, call `installFreeCodeLibraries()` once, before the player mounts, and pass what it returns
to `loadModule`:

```ts
import { installFreeCodeLibraries } from "@uberscene/graphics/libraries";
import { loadModule } from "@uberscene/sdk";

const imports = installFreeCodeLibraries();
const video = loadModule(source, { imports });
```

The file can then import `three`, `@react-three/fiber`, `motion` and `motion/react`. Any other module works the same
way: add it to `imports` under the name the file imports. The export takes the same list with
`--import` (`--import three`, or `--import name=specifier`), so a file that opens in your app also exports.

## In the export

The player draws all of this, and so does the export, because the export is the player: it runs in headless Chrome,
frame by frame, with the same sound ([Exporting](/guide/exporting)). A Layer can use any CSS and any React the
preview can.

## Next

- [Your own effects and transitions](./custom-effects): a look in GLSL, declared in the file.
- [Checking a cut](./checking): look at frames, and check that what a layer draws stays in frame.
- [Exporting](./exporting): formats, a server, and faster exports.
