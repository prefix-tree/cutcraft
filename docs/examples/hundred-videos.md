---
title: An interview that changes layout
---

<script setup>
import { withBase } from "vitepress";
</script>

# An interview that changes layout

Forty-four seconds of a two-camera podcast, cut as a vertical short whose layout follows what is said. Press play for the sound.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/hundred-videos.webm')" :poster="withBase('/shorts/hundred-videos.jpg')" controls playsinline></video></div>

## Key elements

- **Reframing 16:9 to 9:16** round whoever speaks, with **keyframes on `transform.crop`** over half a second when the layout changes.
- **Direct cuts on the source's own camera cuts**: the crop switches on that frame.
- **A scrim `<Layer ground>`**, so the layout check treats it as the ground graphics sit on.
- **Graphics timed to words with `useProgress`**, built from [diagram parts](/guide/free-code#diagram-parts) and named with `data-name`.
- **Word-highlight subtitles** placed with `x`, `y` and `width`, in Poppins via `googleFont()`.

A second file, `cards/hundred-videos-compare.tsx`, plays the source and the short in step:

<div class="cc-pair"><video :src="withBase('/shorts/hundred-videos-compare.webm')" :poster="withBase('/shorts/hundred-videos-compare.jpg')" controls playsinline></video></div>

See: [Timing](/guide/time) · [Free code](/guide/free-code) · [Themes](/guide/themes#choosing-a-font) · [Checking the layout](/guide/checking#check-the-layout)

Footage: [Lex Fridman Podcast #351](https://www.youtube.com/watch?v=Z3_PwvvfxIU), a 44 second excerpt, the copyright of the podcast. It is not covered by this project's licence, and neither speaker has anything to do with this project.

## The code

<<< @/../examples/shorts/hundred-videos.tsx

The grid that counts and the row of points are [blocks](/guide/free-code#blocks), copied into the project from
`uberscene blocks` and placed with this short's times and colours:

<<< @/../examples/shorts/blocks/hundred-cells.tsx

<<< @/../examples/shorts/blocks/point-list.tsx
