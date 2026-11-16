---
title: The logo film
---

<script setup>
import { withBase } from "vitepress";
</script>

# The logo film

The landing page's hero: a woodblock print in the logo's colours that ends on the paper it began on, so it loops.

<div class="cc-pair"><video :src="withBase('/showcase/hero.webm')" :poster="withBase('/showcase/hero.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **One `<Layer>` of React SVG** draws the waves, the sun, the mist, the birds and the katana cut.
- **`useLayer().elapsed`** is the only clock: every shape's position is a function of it, so any frame renders the same way.
- **`<Title>`s in Google Fonts** set the name, the three ways to make a video and the seal.
- **The last frame matches the first**, so the video loops.

See: [Free code](/guide/free-code#the-video-s-clock) · [Themes](/guide/themes#fonts)

## The code

<<< @/../examples/showcase/hero.tsx
