---
title: A talking head with a diagram
---

<script setup>
import { withBase } from "vitepress";
</script>

# A talking head with a diagram

A vertical short cut from a real NASA interview on why there is no lunar eclipse every month. Press play for the sound.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/lunar-eclipse.webm')" :poster="withBase('/shorts/lunar-eclipse.jpg')" controls playsinline></video></div>

## Key elements

- **Five clips cut on words** of an eight minute interview; no cut or cue is typed in seconds.
- **The diagram is React in `<Layer>`s**: each starts on a word and lasts `until` its clip ends, so trimming a clip moves everything over it.
- **[Diagram parts](/guide/free-code#diagram-parts)** from the kit: the angle, the row of months, the strike-through.
- **`<Captions>` with a boxed word** (`highlightBox`) placed off the speaker's face with `y`.
- **`data-name`** on the Moon, the Earth and labels, so the layout check keeps them in the safe zone; **`Frame`** around the speaker.

See: [Timing](/guide/time) · [Free code](/guide/free-code) · [Captions and sound](/guide/captions-and-sound) · [Checking the layout](/guide/checking#check-the-layout)

Footage: NASA's Scientific Visualization Studio, [item 14791](https://svs.gsfc.nasa.gov/14791/), public domain.

## The code

<<< @/../examples/shorts/lunar-eclipse.tsx
