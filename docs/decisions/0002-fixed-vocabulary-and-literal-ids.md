# 0002. A fixed vocabulary with literal ids

> Superseded in part by [0018](./0018-free-code-in-a-timeline-skeleton.md): the vocabulary is a skeleton for footage and time; anything visual may be free code in a `<Layer>`.

## Context

If the file is the edit (0001), the editor must be able to find an element
from a gesture, change one value, and leave the rest of the file alone. Free
React cannot be read that way: a `<div>` that happens to show a clip is not
addressable, and its timing is wherever the author computed it.

## Decision

The file is written in a fixed vocabulary (`<Composition>`, `<Track>`,
`<Clip>`, `<Title>`, …, 26 elements) whose props are Zod schemas. Every element
carries a literal `id`, unique in the file. Timing props (`in`, `out`,
`duration`, `start`, `offset`, `anchor`, `at`) are literals or time references.
A collection the inspector edits one by one (keyframes, effects, captions) is
child elements, not a prop array. A lint enforces all of this.

## Consequences

- Gestures, undo, the model's search-and-replace and the preview's
  `data-el` attributes all address elements by the same id.
- The resolver can place everything without executing user code beyond pure
  helpers; the vocabulary components render nothing themselves.
- The model gives up some freedom; the prompt and the lint tell it exactly what
  it gave up and why.

## Alternatives

Stamping ids at compile time when missing (Diffusion Studio does this): works,
but makes the first save rewrite the author's file. We prefer the lint error
and a model that writes ids itself. Structural addressing by position: breaks on
every insertion.
