---
title: Kinetic type
---

<script setup>
import { withBase } from "vitepress";
</script>

# Kinetic type

A vertical short of animated phrases over karaoke captions.

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/kinetic.webm')" :poster="withBase('/showcase/kinetic.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **`<Motion>` sequences anchored to words**: one phrase slams in, one stacks word by word, one slides across.
- **Karaoke `<Captions>`** generated from the transcript run underneath.
- **A vertical composition** (9:16).

See: [Timing](/guide/time) · [Captions and sound](/guide/captions-and-sound) · [`<Motion>`](/reference/elements/motion)

## The code

<<< @/../examples/showcase/kinetic.tsx
