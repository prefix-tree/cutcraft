# `<Caption>`

One cue inside `<Captions>`, written by hand: its text, start and end.

<Example src="previews/elements/captions" alt="<Caption>">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

## Props

| prop | type | default | required |
|---|---|---|---|
| `id` | string |  | yes |
| `start` | number (0..∞) \| string |  | yes |
| `end` | number (0..∞) \| string |  | yes |
| `text` | string |  | yes |
| `words` | { text, start, end }[] |  |  |

Timed, visual. No children. [All elements](/reference/elements/)
