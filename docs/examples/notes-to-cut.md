---
title: From notes to a cut
---

<script setup>
import { withBase } from "vitepress";
</script>

# From notes to a cut

A 36 second product explainer made of blocks: someone asks for a launch video, the reply plans it, a terminal builds
and checks it, a ranking shows which scene holds people longest, and a closing line says what comes back: a file.

<div class="cc-pair"><video class="tall" :src="withBase('/shorts/notes-to-cut.webm')" :poster="withBase('/shorts/notes-to-cut.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **Every scene is a block**: `quote-build`, `chat-reveal`, `terminal-typing`, `ranked-list` and `quote-build` again,
  each placed with `uberscene blocks add <name> --into notes-to-cut.tsx --track scenes --at <seconds>`.
- **What this video says is props on each placement**: the messages, the commands, the rows and their values, the
  quote and its stressed words. The two quotes are one block with two sets of props; the copies in `blocks/` are the
  blocks as they ship.
- **Timed by a narration**: `narrate()` turns the script into subtitles and named cues, and each scene starts a moment
  before its cue. The last sentence is not a subtitle: the closing quote shows it, from when it is said, at the speed
  it is said.
- **Sound cues** on an effects track: a swish into each scene, a pop per message, a click per command, a thud as the
  ranking changes, a riser into the last line and a chime under it.
- **One theme** on the composition: the blocks' colours and fonts are theme tokens, so all four take its palette.

See: [Blocks](/guide/blocks)

## The code

<<< @/../examples/shorts/notes-to-cut.tsx
