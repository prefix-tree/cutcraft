---
editLink: false
---

# `<Transition>`

A blend between the two clips it sits between on a sequence track.

<Example src="previews/elements/transition" alt="<Transition>">

<<< @/../examples/showcase/docs/transition.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [Product launch](/examples/launch) · [An edit](/examples/edit) · [the walkthrough](/guide/writing-files) · [Slideshow with motion](/recipes/slideshow)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The transition's name. |
| `type` | "crossfade" \| "dipToBlack" \| "dipToWhite" \| "wipe" \| "slide" \| … 7 more \| string | `"crossfade"` |  | A built-in transition, or one the file declares with `transition()`. |
| `duration` | number (0.001..30) | `0.5` |  | Seconds it takes; it overlaps the two clips by this much. |
| `params` | object | `{}` |  | The type's own settings; each type's page lists them. |
| `on` | string |  |  | Edge form: a transition at one edge of a single clip. Omit for a transition between two siblings. |
| `edge` | "in" \| "out" |  |  | With `on`: `in` at the clip's start, `out` at its end. |

Every built-in type and its params: [Effects and transitions](/reference/effects/).

Timed, visual. No children. [All elements](/reference/elements/)
