---
title: A product launch
---

<script setup>
import { withBase } from "vitepress";
</script>

# A product launch

The founder on camera, cut on her words, with b-roll in the middle.

<div class="cc-pair"><video :src="withBase('/showcase/launch.webm')" :poster="withBase('/showcase/launch.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **Cuts on words** (`in="word:12"`): each clip is trimmed by the transcript, not by seconds.
- **`<Three>`** turns a phone in on the word "Shed"; its screen is the product name drawn on a canvas.
- **`<Motion>` lower third** names the speaker.
- **Pills anchored to words** (`anchor="talk" at="word:8"`): recutting the talk retimes every callout.
- **A crossfade** into the b-roll, and **`schema` / `defaults`** for the tweakable props.

See: [Timing](/guide/time) · [Free code](/guide/free-code#three-js-and-motion) · [`<Three>`](/reference/elements/three) · [`<Motion>`](/reference/elements/motion)

## The code

<<< @/../examples/showcase/launch.tsx
