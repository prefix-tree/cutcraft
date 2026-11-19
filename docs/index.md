---
layout: page
title: UberScene
titleTemplate: Video editor as code
footer: false
sidebar: false
aside: false
---

<script setup>
import { withBase } from "vitepress";
</script>

<div class="home vp-doc">

<section class="home-hero">

<h1 class="home-title">Make videos <mark>with code.</mark></h1>

<p class="home-lead">Write a video as a React file. Play it in the browser, fine-tune it on a timeline, export it to MP4.</p>

<CopyCommand command="npm install uberscene @uberscene/kit react zod" />

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-button" :href="withBase('/examples/')">Examples</a>
<a class="home-button" href="https://github.com/prefix-tree/uberscene">GitHub</a>
</div>

<p class="home-meta">Free and open source · MIT licence</p>

</section>

<div class="home-ticker" aria-hidden="true"><div><span>Timeline ■ Captions ■ 45 effects ■ Transitions ■ Motion graphics ■ Three.js ■ 115 undoable actions ■ MP4 export ■ </span><span>Timeline ■ Captions ■ 45 effects ■ Transitions ■ Motion graphics ■ Three.js ■ 115 undoable actions ■ MP4 export ■ </span></div></div>

<section class="home-live" aria-label="Try it">

<Playground compact />

</section>

<section class="home-why">

## Why UberScene

<div class="home-why-grid">
<div>

### Models write code, not math

An agent writes good code and bad arithmetic. So the file says what it means (this clip, then that one; a title on
this shot) and UberScene works out every time, position and frame.

</div>
<div>

### A video should be a file

Not a project locked inside an app. A file you can diff, review in a pull request, generate a hundred of, and fix by
changing one value.

</div>
<div>

### One file, every editor

You on a timeline, your agent in text, your app through the API: all of them edit the same TSX, and each sees what
the others changed.

</div>
</div>

</section>

<section class="home-features">

## What's in it

<div class="home-feature-grid">
<PreviewCard hover title="Timeline" text="Clips, tracks, gaps, keyframes, speed ramps and freeze frames." link="/reference/elements/" src="previews/elements/track" />
<PreviewCard hover title="Captions" text="From a transcript, SRT, VTT or Whisper, word by word or karaoke." link="/guide/captions-and-sound" src="previews/elements/captions" />
<PreviewCard hover title="Effects" text="45 effects run as shaders, or your own in GLSL." link="/reference/effects/" src="previews/effects/halftone" />
<PreviewCard hover title="Transitions" text="Wipes, irises, film burns and blinds between clips." link="/guide/transitions" src="previews/transitions/iris" />
<PreviewCard hover title="Motion graphics" text="Lower thirds, callouts, counters and quote cards." link="/reference/components/" src="previews/components/lower-third" />
<PreviewCard hover title="Themes and fonts" text="One look for the whole video, and any Google font." link="/guide/themes" src="previews/guide/fonts" />
<PreviewCard hover title="Free code" text="React, three.js and Motion on the video's clock." link="/guide/free-code" src="previews/elements/three" />
<PreviewCard hover title="Editing API" text="115 undoable actions, written back into the file." link="/guide/editing" src="previews/elements/nested" />
<PreviewCard hover title="Player" text="Embed the live video in your React app." link="/guide/player" src="previews/elements/composition" />
<PreviewCard hover title="Export" text="MP4, WebM and stills from the command line." link="/guide/exporting" src="showcase/launch" />
<a class="cc-card" :href="withBase('/guide/checking')"><img class="cc-preview" :src="withBase('/reference/look.jpg')" alt="" loading="lazy"><span class="cc-card-title">Checks</span><span class="cc-card-text">Review a cut without watching it: timelines, contact sheets, layout.</span></a>
<a class="cc-card" :href="withBase('/guide/agents')"><img class="cc-preview" :src="withBase('/reference/look-zones.jpg')" alt="" loading="lazy"><span class="cc-card-title">Agent skill</span><span class="cc-card-text">Claude Code and other agents write, check and render videos.</span></a>
</div>

</section>

<section class="home-chapter">

## Edit the file from code

<p class="home-chapter-lead">115 actions edit the file itself: each one checked, undoable, and written back to its text as a one-value change. Wire them to any editor: a timeline, a form, an agent's tool call. <a :href="withBase('/guide/editing')">Editing →</a></p>

<Example src="showcase/edit" alt="Three shots cut back to back, with transitions, a push-in and titles">

```ts
import { collectModule, Executor } from "@uberscene/kit";
import { foldToSource, loadModule } from "@uberscene/kit/source";

const tree = collectModule(loadModule(text));
const exec = new Executor({ tree, manifest });

// A drag on your timeline, a field in your form, a tool call:
exec.execute({ type: "clip/trim",
  params: { id: "hook", edge: "out", value: "word:22.end" } });
exec.execute({ type: "text/setContent",
  params: { id: "title", text: "Ships on Friday" } });
exec.undo();
exec.redo();

// The file again, changed by exactly those edits.
const { text: next } = foldToSource(text, exec.log(), exec.state());
```

</Example>

</section>

<section class="home-chapter">

## Cuts and transitions

<p class="home-chapter-lead">Clips play one after another on a track. A transition between two of them overlaps them: wipe, iris, film burn, blinds and more. <a :href="withBase('/guide/transitions')">Transitions →</a></p>

<Example src="previews/elements/transition" alt="A wipe from one coffee shot to another">

<<< @/../examples/showcase/docs/transition.tsx

</Example>

</section>

<section class="home-chapter">

## Titles

<p class="home-chapter-lead">Text over the picture, timed to a clip, animated by letter, word or line. <a :href="withBase('/guide/titles-and-graphics')">Titles and graphics →</a></p>

<Example src="previews/elements/title" alt="A title appearing word by word over a coffee shot">

<<< @/../examples/showcase/docs/title.tsx

</Example>

</section>

<section class="home-chapter">

## Captions

<p class="home-chapter-lead">Captions from the clip's transcript, or from SRT, VTT and Whisper. Karaoke, word by word or typewriter. <a :href="withBase('/guide/captions-and-sound')">Captions and sound →</a></p>

<Example src="previews/elements/captions" alt="Karaoke captions over a speaker">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

</section>

<section class="home-chapter">

## Colour and effects

<p class="home-chapter-lead">Exposure, white balance, curves, LUTs, keying, glow and more, written in the order a colourist works. Shaders in the preview and the export. <a :href="withBase('/reference/effects/')">All 45 effects and transitions →</a></p>

<Example src="previews/guide/colour-grade" alt="A coffee shot, then the same shot graded">

<<< @/../examples/showcase/guide/colour-grade.tsx

</Example>

</section>

<section class="home-chapter">

## Motion graphics

<p class="home-chapter-lead">Ready-made lower thirds, callouts, counters and cards, timed like any title. <a :href="withBase('/reference/components/')">Components →</a></p>

<Example src="previews/components/lower-third" alt="A lower third sliding up over a coffee shot">

<<< @/../examples/showcase/components/lower-third.tsx

</Example>

</section>

<section class="home-chapter">

## Three.js and any React

<p class="home-chapter-lead">Any component on the video's clock: three.js, Motion, SVG or canvas, frame-exact when you scrub or export. <a :href="withBase('/guide/free-code')">Free code →</a></p>

<Example src="previews/elements/three" alt="A spinning cube over a coffee shot">

<<< @/../examples/showcase/docs/three.tsx

</Example>

</section>

<section class="home-foot">

**Free and open source under the MIT licence.** <a :href="withBase('/examples/')">More examples →</a>

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/uberscene) ·
[npm](https://www.npmjs.com/package/uberscene)

</section>

</div>
