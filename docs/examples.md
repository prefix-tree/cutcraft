---
title: Examples
---

<script setup>
import { withBase } from "vitepress";
</script>

# Examples

Each video is one file in [`examples/showcase`](https://github.com/prefix-tree/cutcraft/tree/main/examples/showcase), rendered by
the export engine with `pnpm --filter @cutcraft/example-showcase render`. The footage is made by `ffmpeg`'s own
sources (`pnpm --filter @cutcraft/example-showcase gen`), so you can render them all yourself.

## An edit

Three shots cut back to back on a sequence track: a wipe and a slide sit between them as siblings, the middle shot
pushes in with four keyframes, a title builds word by word, and a lower third comes in over the second shot. The
overlays anchor to the shots, so they move when a cut moves.

<div class="cc-pair"><video :src="withBase('/showcase/edit.webm')" :poster="withBase('/showcase/edit.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/edit.tsx

## Captions and key points

A vertical short. The captions are generated from the words the clip plays and highlight word by word; the key point
is anchored to the clip and timed to the word that names it (`at="word:16"`), so trimming the clip keeps it on that
word.

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/captions.webm')" :poster="withBase('/showcase/captions.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/captions.tsx

## Data graphics

Four built-in graphics with the numbers as props: a counter, a unit grid, a comparison and a sample. Each animates in
on its own, and the editor's inspector shows a control for every prop.

<div class="cc-pair"><video :src="withBase('/showcase/graphics.webm')" :poster="withBase('/showcase/graphics.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/graphics.tsx

## Motion

A chart drawn by React inside a `<Layer>`: each bar's height is a `spring()` of the layer's clock, so scrubbing and
export show the same frame. A callout and confetti come from the built-in graphics.

<div class="cc-pair"><video :src="withBase('/showcase/motion.webm')" :poster="withBase('/showcase/motion.jpg')" controls muted loop playsinline></video></div>

<<< ../examples/showcase/motion.tsx
