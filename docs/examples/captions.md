---
title: Captions and key points
---

<script setup>
import { withBase } from "vitepress";
</script>

# Captions and key points

A vertical short with word-by-word captions and a key point on its word.

<div class="cc-pair"><video class="tall" :src="withBase('/showcase/captions.webm')" :poster="withBase('/showcase/captions.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **Cuts on words**: the clip is trimmed by the transcript.
- **Generated karaoke `<Captions>`** from the words the clip plays, highlighted word by word.
- **A key point anchored to the clip** at `at="word:16"`, so trimming the clip keeps it on that word.

See: [Captions and sound](/guide/captions-and-sound) · [Timing](/guide/time)

## The code

<<< @/../examples/showcase/captions.tsx
