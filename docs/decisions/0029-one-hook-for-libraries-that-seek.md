# 0029. One hook for libraries that seek

> Status: accepted. Revisits one alternative set aside in [0027](./0027-what-we-adopt-from-hyperframes.md) (frame
> adapters for GSAP, Lottie and anime.js).

## Context

0027 set aside per-library frame adapters: HyperFrames' GSAP adapter alone is 656 lines, and our hooks already put
Motion and three.js on the clock. Since then, writing shorts and reading what people paste into a Layer showed the
gap that remains: a GSAP or Anime.js timeline, or a Lottie file, plays on its library's own clock. The Web Animation
hold catches only what a library does through the browser's animations, and these libraries mostly set styles from
their own frame loop.

What they share is small. Each can be built paused and set to a moment: `seek(seconds)` on a GSAP timeline,
`seek(ms)` on an Anime.js timeline, `goToAndStop(ms)` on a Lottie animation. Each has a way to undo what it did:
`revert`, `destroy` or `kill`.

## Decision

The kit gets one hook, `useSeekable(create, deps?)`, beside `useLayer`. `create` runs once per mount (and again when
`deps` change) with the element the returned ref is on, and returns anything with `seek(seconds)`. On every frame,
in a layout effect, the hook seeks it to the layer's elapsed seconds, so the frame is painted already set. When the
object is replaced or the layer unmounts, the hook calls its `revert`, `destroy` or `kill`, the first it has. A
`seek` that returns a promise holds the export's frame (`holdLayerFrame`) until it settles.

No adapter per library. A GSAP timeline fits as it is; Anime.js and Lottie take a two-line wrapper, shown in the
free code guide. The published packages depend on none of them: the browser test uses Anime.js as a dev dependency of
`@cutcraft/graphics`.

GSAP is not brought into the repository, its examples or its tests. Since 3.13 it is free to use under its own
"standard no charge" licence, which is not an open source licence and restricts some uses. The guide shows it as the
user's choice and says the licence is theirs to check.

## Consequences

- Any library with a seek runs in a Layer and scrubs both ways, in the preview and the export, with no code of ours
  per library.
- The hook trusts `seek` to set the whole picture from the time it is given. A library that only steps forward from
  where it was (a physics engine, a particle system) still draws the wrong frame after a scrub back.
- Units are the wrapper's job. Seconds are the hook's only unit, as everywhere else in the kit.
