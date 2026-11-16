---
title: An edit
---

<script setup>
import { withBase } from "vitepress";
</script>

# An edit

Three shots cut back to back, with transitions, a push-in and titles.

<div class="cc-pair"><video :src="withBase('/showcase/edit.webm')" :poster="withBase('/showcase/edit.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **A sequence track**: the shots play back to back.
- **`<Transition>`s as siblings** of the clips: a wipe and a slide.
- **`<Keyframe>`s** push in on the middle shot.
- **A `<Title>` built word by word** and a **`<Motion>` lower third**, both anchored to shots, so they move when a cut moves.

See: [Timing](/guide/time) · [`<Transition>`](/reference/elements/transition) · [`<Keyframe>`](/reference/elements/keyframe)

## The code

<<< @/../examples/showcase/edit.tsx
