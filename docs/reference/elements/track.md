# `<Track>`

A row of elements. A sequence track plays its children back to back; a free track (`layout="free"`) places each at its own start.

<Example src="previews/elements/track" alt="<Track>">

<<< @/../examples/showcase/docs/track.tsx

</Example>

**Used in:** [Product launch](/examples#a-product-launch) · [Kinetic type](/examples#kinetic-type) · [Data story](/examples#a-data-story) · [Logo reveal](/examples#a-logo-reveal) · [An edit](/examples#an-edit) · [Captions and key points](/examples#captions-and-key-points) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

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

Children: `clip`, `audio`, `gap`, `transition`, `title`, `shape`, `svg`, `sticker`, `adjustment`, `nested`, `layer`, `multicam`. [All elements](/reference/elements/)
