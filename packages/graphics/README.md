<p align="center"><img src="https://raw.githubusercontent.com/prefix-tree/cutcraft/main/docs/public/logo.svg" width="64" alt="CutCraft"></p>

# @cutcraft/graphics

What a [CutCraft](https://prefix-tree.github.io/cutcraft/) file draws beyond footage: 34 ready-made graphics, and
three.js and Motion for the graphics you write yourself.

```sh
npm install @cutcraft/graphics
```

## Ready-made graphics

`<Graphic kind="…">` draws arrows, callouts, badges, lower thirds, frames, highlights, progress bars and countdowns,
counters and other data graphics, backgrounds, confetti and icons. Each kind is a pure function from props, theme and
time to SVG, so the player and the export draw it the same way.

```tsx
<Graphic id="growth" kind="counter" anchor="hook" at="word:9" duration={3} to={1250} suffix="+" label="customers" />
```

```ts
import { drawGraphic, graphicControls } from "@cutcraft/graphics";

const { svg, labels } = drawGraphic(props, { width: 640, height: 360, t: 1.2, duration: 3, id: "growth", tokens });
const controls = graphicControls("counter");   // the fields an inspector shows for this kind
```

[The catalog](https://prefix-tree.github.io/cutcraft/reference/graphics/) shows every kind animating, with its props
and an example.

## three.js and Motion

[three.js](https://threejs.org) and [Motion](https://motion.dev), running on the video's clock. Scrub backwards,
seek, or play at 2× and the scene shows exactly the frame for that time. These need `@cutcraft/kit`, `react` and
`react-dom` next to this package.

In the host, call `installFreeCodeLibraries()` once, before the player mounts, and pass what it returns to
`loadModule`:

```ts
import { installFreeCodeLibraries } from "@cutcraft/graphics/libraries";
import { loadModule } from "@cutcraft/kit/source";

const imports = installFreeCodeLibraries();
const video = loadModule(source, { imports });
```

The file can then import `three`, `@react-three/fiber`, `motion` and `motion/react`, and use two more tags.
`<Three>` holds a three.js scene: `setup` runs once, and the function it returns runs for every frame with `time` in
seconds since the tag started.

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

React Three Fiber children work too, in place of `setup` or next to it. `<Motion>` plays a Motion sequence over its
children:

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

Both sit on the timeline like any overlay, so an editor can move, trim and anchor them. Inside a plain `<Layer>`,
`<ThreeScene>` (`@cutcraft/graphics/three`) and `useTimeline` / `useLayerTime` (`@cutcraft/graphics/motion`) give
you the same clock.

The player draws both tags. The Node export (`cutcraft`) leaves them out with a warning for now.
[Free code](https://prefix-tree.github.io/cutcraft/guide/free-code) covers it
in more depth.

MIT licensed.
