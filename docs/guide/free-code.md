# Free code

The timeline part of a file uses CutCraft's elements, so an editor can trim and move things. What you draw is up to
you. A `<Layer>` holds any React component: hooks, CSS 3D transforms, filters and blend modes, a canvas, WebGL, a
chart library. `<Three>` and `<Motion>` bring three.js and Motion onto the timeline.

**See it in:** [Product launch](/examples#a-product-launch) (`<Three>` and `<Motion>`), [Data story](/examples#a-data-story)
(SVG in `<Motion>`, React counters in a `<Layer>`), [Logo reveal](/examples#a-logo-reveal) (three.js particles),
[Stats with handles](/recipes/stats) (a component in a `<Layer>` with editable props).

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

- `useT()` is the layer's progress, from 0 at its start to 1 at its end.
- `useLayer()` gives the rest: `elapsed` and `remaining` in seconds, the layer's `duration`, the video's `time` and
  `fps`.

```tsx
function Countdown() {
  const { remaining } = useLayer();
  return <div>{Math.ceil(remaining)}</div>;
}
```

Scrub and the countdown shows the right number; pause and it stops. CSS animations inside a Layer are held at the
layer's time as well, so they start when the layer starts and scrub with the video.

The rule of thumb: compute what you draw from the time. Code that builds up state frame by frame, or runs on
`setTimeout` or `setInterval`, shows something different after a seek. The lint warns about timers, `<video>` and
`<audio>` elements (use `<Clip>` and `<Audio>`), and canvases created with `willReadFrequently`.

## Animation helpers

`@cutcraft/kit` exports three pure functions for shaping time:

- `interpolate(x, inputRange, outputRange, options)` maps a value across ranges, with easing. It extends past the ends
  unless you pass `extrapolateLeft` or `extrapolateRight: "clamp"`.
- `spring({ time, from, to, mass, damping, stiffness })` is where a spring is `time` seconds after it is let go
  (mass 1, damping 10 and stiffness 100 by default).
- `random(seed)` returns a number from 0 to 1 that is always the same for the same seed, so scattered things stay put
  from frame to frame.

```tsx
function Badge() {
  const { elapsed, remaining } = useLayer();
  const scale = spring({ time: elapsed, damping: 12 });
  const opacity = interpolate(remaining, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  return <div style={{ transform: `scale(${scale})`, opacity }}>New</div>;
}
```

A `<Keyframe>` can use `easing="spring"` too.

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

## three.js and Motion

When the app that loads the file has installed them (below), a file gets two more tags. Both sit on the timeline like
a Layer: `id`, `start` or `anchor` and `at`, `duration`, `transform`, `enter` and `exit`.

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
earlier one after a scrub. What `setup` added is removed when the tag ends. `camera` (`position`, `lookAt`, `fov`,
`near`, `far`, `zoom`, `orthographic`) and `background` are props the inspector can edit. React Three Fiber works as
children too, in place of `setup` or next to it, and `useFrame`'s `clock.elapsedTime` is the same `time`:

```tsx
<Three id="logo" start={2} duration={3} camera={{ position: [0, 0, 4] }}>
  <ambientLight />
  <Logo />
</Three>
```

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

Four complete files use these tags: a [product launch](/examples#a-product-launch) (a `<Three>` phone and word-timed
callouts), [kinetic type](/examples#kinetic-type) (`<Motion>` phrases on their words), a
[data story](/examples#a-data-story) (SVG bars animated by Motion, React counters in a `<Layer>`) and a
[logo reveal](/examples#a-logo-reveal) (three.js particles settling into a name).

Inside a plain `<Layer>`, use the same libraries through adapters that follow the layer's clock: `<ThreeScene>` from
`@cutcraft/graphics/three` (a React Three Fiber canvas), and `useTimeline(sequence)` and `useLayerTime()` from
`@cutcraft/graphics/motion`. A bare `<Canvas>`, Motion's `animate()`, or a `motion` element with `animate` or
`whileInView` runs on its library's own clock, and the lint points you to the adapter.

## Effects and transitions of your own

The built-in effects are CSS filters, and the built-in transitions fade, wipe, slide and push. Anything else is a few
lines of GLSL: declare it at the top of the file with `defineEffect()` or `defineTransition()`, and use the name it
returns as an `<Effect>` or `<Transition>` type.

An effect on a clip: a duotone, with two colour params and a third that the keyframes animate from the plain footage
to the full effect.

<Example src="previews/guide/shader-effect" alt="Fractal footage turned navy and gold by a duotone effect">

<<< @/../examples/showcase/guide/shader-effect.tsx

</Example>

A transition: the incoming clip opens as a circle from the centre.

<Example src="previews/guide/shader-transition" alt="A circle of the next clip opening over the first">

<<< @/../examples/showcase/guide/shader-transition.tsx

</Example>

An effect defines `vec4 effect(vec2 uv)` and reads its picture as `image`. A transition defines
`vec4 transition(vec2 uv)` and reads the outgoing picture as `from`, the incoming one as `to`, and how far it has got
as `progress`, from 0 to 1. Both also get `resolution` (the frame in pixels) and `time` (seconds into the element).
`uv` (0, 0) is the top left. Return plain colour; the player premultiplies it.

Each param reaches the shader as a uniform with the param's name. A number becomes a `float`, a boolean a `bool`, an
array of two, three or four numbers a `vec2`, `vec3` or `vec4`, and a colour string such as `"#ff8800"` a `vec3`. A
param can't use the name of a GLSL function (`mix`, `step`, `length`…) or of an input above; `defineEffect()` says so. The
zod schema checks the values and fills in defaults, [`<Keyframe>`](/reference/elements/keyframe) animates them with
`property="effect.<id>.<param>"`, and an editor can build its inspector from the schema.

On a `<Clip>`, a `<Nested>` and an `<Adjustment>` (where it changes everything beneath it), an effect runs after the
element's mask, vignette and grain, and before its other built-in effects. Several effects run in the order they
appear in the file.

Overlays take the same effects: titles, shapes, SVG, stickers and any `<Layer>`, including `<Three>` and `<Motion>`.
Write the `<Effect>` inside the element, next to its text or its free code. Here one colour-split effect runs on a
title and, more gently, on a Motion badge, while the footage under them stays as it is:

<Example src="previews/guide/title-effect" alt="A white title and an orange badge with red and blue fringes over fractal footage">

<<< @/../examples/showcase/guide/title-effect.tsx

</Example>

An overlay is DOM, so the player draws it into a canvas with HTML-in-Canvas and runs the shaders over that picture.
The overlay's built-in effects (CSS filters) apply first. HTML-in-Canvas is a Chrome feature that is still behind a
flag: turn on `chrome://flags/#canvas-draw-element` to see overlay effects in the preview. Without it the preview shows
the overlay as it is and warns once. The export always draws them, because its browser has the feature on.

Keep `defineEffect()` and `defineTransition()` at the top of the file with a literal `name` and `shader`, where the
editor and lint can read them; the `declaration` lint ([Lint](/guide/editing#lint)) says when one is not. The editor's
[actions](/reference/actions) take the names too, for example `effect/add` and `transition/update`.

The player draws these shaders with WebGL in any browser. The export draws them through the
[browser engine](/guide/exporting#three-js-and-motion-the-browser-engine), which a file that uses one picks on its own.
`--engine node` has no WebGL, so it leaves them out and warns.

## Libraries

What a file may import is up to the app that loads it. By default that is `react`, `zod` and `@cutcraft/kit`. To
offer three.js and Motion, call `installFreeCodeLibraries()` once, before the player mounts, and pass what it returns
to `loadModule`:

```ts
import { installFreeCodeLibraries } from "@cutcraft/graphics/libraries";
import { loadModule } from "@cutcraft/kit/source";

const imports = installFreeCodeLibraries();
const video = loadModule(source, { imports });
```

The file can then import `three`, `@react-three/fiber`, `motion` and `motion/react`. Any other module works the same
way: add it to `imports` under the name the file imports. The export takes the same list with
`--import` (`--import three`, or `--import name=specifier`), so a file that opens in your app also exports.

## In the export

The player draws all of this, and so does the export. A file with `<Three>`, `<Motion>` or a declared shader exports through the
[browser engine](/guide/exporting#three-js-and-motion-the-browser-engine): the real player in headless Chromium, frame
by frame, with the same sound. Other files export in Node, which draws a Layer with
[Satori](https://github.com/vercel/satori), a subset of CSS (flexbox, no hooks beyond `useT()` and `useLayer()`), and
warns about what it leaves out; `--engine browser` draws such a Layer in full.
