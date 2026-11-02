# 0009. Pure helpers, generated elements and the Layer escape hatch

> Superseded in part by [0018](./0018-free-code-in-a-timeline-skeleton.md): the vocabulary is a skeleton for footage and time; anything visual may be free code in a `<Layer>`.

## Context

A fixed vocabulary (0002) must not stop the model from abstracting (a lower
third used in three places) or from doing what the vocabulary cannot say (a
counter, a chart, a custom animation).

## Decision

Helpers are pure functions of their props and are expanded by the resolver.
Elements a helper produces are `literal` when the helper is used once, and
`generated` when it is used more than once or inside a loop; the editor bakes a
generated element into literals before the first gesture on it. `<Layer>` holds
arbitrary React; its interior is `opaque` to the editor, driven by `useT()`
for progress, and the editor asks the model to change it. Hooks other than
`useT` in helpers are a lint error.

## Consequences

- Abstraction is allowed and the cost (a bake) is paid only when the user edits
  one copy.
- The resolver needs no React runtime: it calls helpers as functions.
- Layer interiors need the evaluated element at render time, which the player
  takes as a prop; the kit does not keep them.
