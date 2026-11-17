---
title: A game of snake that ends in a heart
---

<script setup>
import { withBase } from "vitepress";
</script>

# A game of snake that ends in a heart

A game of snake on a wall of Chinese characters. The snake eats 我爱你, then curls into a heart.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/snake-heart.webm')" :poster="withBase('/shorts/snake-heart.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **The game is data**: the start, every step and where each character appears. A program played it once; only the result is kept.
- **A `<Layer>` draws the step the video's time has reached**, found with `stepAt`; nothing is keyframed.
- **The board is a `grid()`**: geometry only, with the characters drawn in its cells.
- **A ground layer for the wall**: each cell has its own period, and its character comes from `random()` keyed by the cell, its turn and the count of eaten characters.
- **Noto Sans SC via `googleFont()`**; the phrase and the heart's colour are **props**.

See: [Free code](/guide/free-code)

## The code

<<< @/../examples/shorts/snake-heart.tsx
