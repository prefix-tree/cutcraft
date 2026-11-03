# `<Three>`

A three.js scene on the timeline: plain three.js in `setup`, or React Three Fiber children, on the video's clock.

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

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](/guide/free-code#three-js-and-motion)). The Node export leaves it out with a warning for now.

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) |  |  |
| `anchor` | "start" \| string |  |  |
| `at` | string |  |  |
| `offset` | number |  |  |
| `duration` | number \| "fill" \| "source" \| { match } |  |  |
| `enter` | { type, duration, easing } |  |  |
| `exit` | { type, duration, easing } |  |  |
| `transform` | { position, scale, rotation, anchor, opacity, borderRadius, crop, rotate3d, perspective, transformStyle } |  |  |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  |
| `camera` | { position, lookAt, fov, near, far, zoom, orthographic } |  |  |
| `background` | string |  |  |
| `setup` | any |  |  |

Timed, visual, transformable. Children: `keyframe`. [All elements](/reference/elements/)
