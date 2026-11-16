---
title: A logo reveal
---

<script setup>
import { withBase } from "vitepress";
</script>

# A logo reveal

Particles that settle into a name, then a tagline.

<div class="cc-pair"><video :src="withBase('/showcase/logo.webm')" :poster="withBase('/showcase/logo.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **A `<Three>` particle system**: three thousand particles settle into the name sampled from a canvas.
- **A seeded random** scatters them, so every render is identical.
- **Every particle's place is a function of time**, so a frame looks the same however it is reached.
- **A `<Motion>` tagline** slides in under the name.

See: [Free code](/guide/free-code#the-video-s-clock) · [`<Three>`](/reference/elements/three)

## The code

<<< @/../examples/showcase/logo.tsx
