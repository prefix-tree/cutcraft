---
title: How game lighting fakes it
---

<script setup>
import { withBase } from "vitepress";
</script>

# How game lighting fakes it

A vertical explainer of five lighting tricks: direct light, shadows, bounce light, ambient occlusion and bloom. No footage, no media file.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/game-lighting.webm')" :poster="withBase('/shorts/game-lighting.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **One `<Three>` room**: every light and the camera are set from the layer's time.
- **Ambient occlusion baked into the vertices** when the scene is set up.
- **Bloom is a built-in `glow` effect with keyframes** on the `<Three>` tag, not part of the scene.
- **Written captions** at the top and **a `<Layer>` that reads the time** for the chips at the bottom.
- **Props** for the opening and closing lines and the two wall colours, so a variant needs no edit.

See: [Free code](/guide/free-code#three-js-and-motion) · [Captions and sound](/guide/captions-and-sound)

## The code

<<< @/../examples/shorts/game-lighting.tsx
