# `whiteBalance`

Warms or cools the picture, and tints it toward green or magenta.

<Example src="previews/effects/whiteBalance" alt="whiteBalance">

<<< @/../examples/showcase/effects/whiteBalance.tsx

</Example>

The coffee footage is [Pixabay video 209419](https://pixabay.com/videos/id-209419/), under the Pixabay Content License.

## Params

Drawn as a shader, with a CSS filter where WebGL is missing.

| param | type | default |
|---|---|---|
| `temperature` | number (-1..1) | `0` |
| `tint` | number (-1..1) | `0` |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
