---
editLink: false
---

# `<Caption>`

One cue inside `<Captions>`, written by hand: its text, start and end.

<Example src="previews/elements/captions" alt="<Caption>">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

**Used in:** [the walkthrough](/guide/writing-files)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The cue's name. |
| `start` | number (0..∞) \| string |  | yes | When it appears: seconds, or a word of the captions' source (`word:12`). |
| `end` | number (0..∞) \| string |  | yes | When it goes, as `start`. |
| `text` | string |  | yes | What it says. |
| `words` | { text, start, end }[] |  |  | Each word and its time in the video, in seconds, which the word animations highlight; left out, the cue shows as plain text. |

Timed, visual. No children. [All elements](/reference/elements/)
