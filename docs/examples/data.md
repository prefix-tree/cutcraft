---
title: A data story
---

<script setup>
import { withBase } from "vitepress";
</script>

# A data story

A bar chart and counters that move with the numbers being said.

<div class="cc-pair"><video :src="withBase('/showcase/data.webm')" :poster="withBase('/showcase/data.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **Plain SVG animated by `<Motion>`**: each bar grows on the word that says its number.
- **React counters in a `<Layer>`** count up on the layer's clock, read with `useLayer()`.
- **Numbers on their words**: the chart and counters follow the transcript, not fixed times.

See: [Free code](/guide/free-code) · [`<Layer>`](/reference/elements/layer) · [`<Motion>`](/reference/elements/motion)

## The code

<<< @/../examples/showcase/data.tsx
