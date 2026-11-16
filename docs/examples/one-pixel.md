---
title: One pixel
---

<script setup>
import { withBase } from "vitepress";
</script>

# One pixel

A two minute explainer of how a game lights a room, told by following one dot of the screen. No footage, no media.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/one-pixel.webm')" :poster="withBase('/shorts/one-pixel.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **The script is one string** with cues marked on key words; **[`narrate()`](/guide/captions-and-sound#narration-from-a-script)** turns it into word times, subtitles and cues, and every animation reads those cue times.
- **Subtitles with a boxed word**, timed at a speaking pace, for a voice to be recorded over.
- **A `<Three>` room** with each lighting trick as a switch, and **an SVG diagram in a `<Layer>`** driven by the video's time.
- **A built-in effect with keyframes** for the glow.
- **One constant places the diagram**; labels have `data-name`, and `--check-layout` passes on all three safe zones.

See: [Free code](/guide/free-code) · [Captions and sound](/guide/captions-and-sound)

## The code

<<< @/../examples/shorts/one-pixel.tsx
