---
editLink: false
---

# `<Track>`

A row of elements. A sequence track plays its children back to back; a free track (`layout="free"`) places each at its own start.

<Example src="previews/elements/track" alt="<Track>">

<<< @/../examples/showcase/docs/track.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [Product launch](/examples/launch) · [Kinetic type](/examples/kinetic) · [Data story](/examples/data) · [Logo reveal](/examples/logo) · [An edit](/examples/edit) · [Captions and key points](/examples/captions) · [the walkthrough](/guide/writing-files) · [Brand spot in any theme](/recipes/brand-spot) · [Multicam highlights](/recipes/highlights) · [Product demo with zoom-ins](/recipes/product-demo) · [Slideshow with motion](/recipes/slideshow) · [Stats with handles](/recipes/stats) · [Talking-head cut](/recipes/talking-head) · [Variants from one file](/recipes/variants) · [Vertical clip from a podcast](/recipes/vertical-podcast)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The track's name in the file; ducking and actions refer to it by this. |
| `layout` | "sequence" \| "free" | `"sequence"` |  | `sequence` plays its children back to back; `free` places each at its own `start` or anchor. |
| `name` | string |  |  | A label for the editor's track header. |
| `role` | "general" \| "captions" \| "dialogue" \| "music" \| "effects" \| "ambience" | `"general"` |  | What the track holds; a `duck` with `under: "dialogue"` turns sound down under every track of that role. |
| `locked` | boolean | `false` |  | The editor will not change it. |
| `hidden` | boolean | `false` |  | Not drawn and not heard. |
| `muted` | boolean | `false` |  | Drawn but not heard. |
| `solo` | boolean | `false` |  | When any track is solo, only solo tracks are heard. |
| `group` | string |  |  | Tracks with the same group move together in the editor. |

Children: `clip`, `audio`, `gap`, `transition`, `title`, `shape`, `svg`, `sticker`, `adjustment`, `nested`, `layer`, `multicam`. [All elements](/reference/elements/)
