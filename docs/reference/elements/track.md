# `<Track>`

A row of elements. A sequence track plays its children back to back; a free track (`layout="free"`) places each at its own start.

<Example src="previews/elements/track" alt="<Track>">

<<< @/../examples/showcase/docs/track.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `layout` | "sequence" \| "free" | `"sequence"` |  |
| `name` | string |  |  |
| `role` | "general" \| "captions" \| "dialogue" \| "music" \| "effects" \| "ambience" | `"general"` |  |
| `locked` | boolean | `false` |  |
| `hidden` | boolean | `false` |  |
| `muted` | boolean | `false` |  |
| `solo` | boolean | `false` |  |
| `group` | string |  |  |

Children: `clip`, `audio`, `gap`, `transition`, `title`, `shape`, `svg`, `sticker`, `graphic`, `adjustment`, `nested`, `layer`, `multicam`. [All elements](/reference/elements/)
