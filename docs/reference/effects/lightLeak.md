# `lightLeak`

Washes warm light in from the edges, as light leaking into a film camera.

<Example src="previews/effects/lightLeak" alt="lightLeak">

<<< @/../examples/showcase/effects/lightLeak.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/) and [209424](https://pixabay.com/videos/id-209424/), under the Pixabay Content License.

## Params

Drawn as a shader.

| param | type | default |
|---|---|---|
| `color` | string | `"#ff8a3d"` |
| `intensity` | number (0..1) | `0.6` |
| `spread` | number (0.05..2) | `0.6` |
| `evolution` | number (0..10) | `0.15` |
| `seed` | integer (0..∞) | `0` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
