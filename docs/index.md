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

<h1 class="home-mark">UberScene —</h1>

<div class="home-pitch">

<p class="home-lead">Video as code. A React file of cuts, titles, captions and effects: your agent writes it, you fine-tune it on a timeline, and it exports to MP4.</p>

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-button" :href="withBase('/examples/')">Examples</a>
<a class="home-button" href="https://github.com/prefix-tree/uberscene">GitHub</a>
</div>

<CopyCommand command="npm install uberscene @uberscene/kit react zod" />

<p class="home-meta">Free and open source · MIT · no watermark · MP4, WebM and stills</p>

</div>

<div class="home-hero-video"><Preview src="showcase/launch" alt="A product launch rendered by UberScene" /></div>

</section>

<section class="home-kinetic" aria-label="The idea">

<KineticType :words="['Cut on words,', 'not seconds.']" />

<p class="home-strip-lead">A cut written as <code>8.43</code> seconds can land mid-word; a cut written as <code>word:12</code> lands on it. The file says what it means and UberScene does the arithmetic. Where the timeline stops, write any React, CSS or WebGL.</p>

</section>

<section class="home-features">

## What's in the file

<FeatureRows :rows="[
  { title: 'Cut on words and shots', text: 'Clips start and end on a word of the transcript or a shot of the camera, through every trim.', link: '/guide/time', src: 'showcase/kinetic' },
  { title: 'Captions and sound', text: 'Karaoke, word by word or typewriter, from the transcript or SRT, VTT and Whisper. Music ducks under speech.', link: '/guide/captions-and-sound', src: 'showcase/captions' },
  { title: 'Colour, effects, transitions', text: 'Curves, LUTs, keying and glow; iris, film burn and blinds. Shaders in the preview and the export.', link: '/guide/colour', src: 'previews/guide/colour-grade' },
  { title: 'Three.js, Motion, any React', text: 'Any component in a Layer, on the video\'s clock, frame-exact when you scrub or export.', link: '/guide/free-code', src: 'showcase/logo' },
  { title: 'Edit by hand, keep the code', text: 'Every drag and trim is an undoable action, written back to the file as a one-value change.', link: '/guide/editing', src: 'showcase/edit' },
  { title: 'Check a cut without watching it', text: 'Print the timeline, draw a contact sheet, find titles that cover faces or leave the safe zone.', link: '/guide/checking', src: 'showcase/data' },
]" />

</section>

<section class="home-gallery" aria-label="Made with UberScene">

## Made with UberScene

<Gallery />

<p class="home-links">Each one is a file rendered by UberScene's own export. Hover to play; open one to read the file. <a :href="withBase('/examples/')">All examples →</a></p>

</section>

<section class="home-try">

## Try it

<p class="home-strip-lead">Edit the file; the video follows. It plays right here, in the same player your app embeds.</p>

<Playground compact />

<p class="home-links"><a :href="withBase('/playground')">Open the playground →</a></p>

</section>

<section class="home-strip">

## Effects and transitions

<p class="home-strip-lead">Hover a card to play it. Every one has a page with the file that made it.</p>

<div class="home-strip-row">
<PreviewCard code hover title="whiteBalance" link="/reference/effects/whiteBalance" src="previews/effects/whiteBalance" />
<PreviewCard code hover title="duotone" link="/reference/effects/duotone" src="previews/effects/duotone" />
<PreviewCard code hover title="colorKey" link="/reference/effects/colorKey" src="previews/effects/colorKey" />
<PreviewCard code hover title="cornerPin" link="/reference/effects/cornerPin" src="previews/effects/cornerPin" />
<PreviewCard code hover title="regionBlur" link="/reference/effects/regionBlur" src="previews/effects/regionBlur" />
<PreviewCard code hover title="glow" link="/reference/effects/glow" src="previews/effects/glow" />
<PreviewCard code hover title="outline" link="/reference/effects/outline" src="previews/effects/outline" />
<PreviewCard code hover title="longShadow" link="/reference/effects/longShadow" src="previews/effects/longShadow" />
<PreviewCard code hover title="halftone" link="/reference/effects/halftone" src="previews/effects/halftone" />
<PreviewCard code hover title="lightLeak" link="/reference/effects/lightLeak" src="previews/effects/lightLeak" />
<PreviewCard code hover title="pixelate" link="/reference/effects/pixelate" src="previews/effects/pixelate" />
<PreviewCard code hover title="fractalNoise" link="/reference/effects/fractalNoise" src="previews/effects/fractalNoise" />
<PreviewCard code hover title="iris" link="/reference/transitions/iris" src="previews/transitions/iris" />
<PreviewCard code hover title="filmBurn" link="/reference/transitions/filmBurn" src="previews/transitions/filmBurn" />
<PreviewCard code hover title="pixelDissolve" link="/reference/transitions/pixelDissolve" src="previews/transitions/pixelDissolve" />
<PreviewCard code hover title="blinds" link="/reference/transitions/blinds" src="previews/transitions/blinds" />
</div>

<p class="home-links"><a :href="withBase('/reference/effects/')">All 45 effects and transitions →</a></p>

</section>

<section class="home-foot">

**Free and open source under the MIT licence.**

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/uberscene) ·
[npm](https://www.npmjs.com/package/uberscene)

</section>

</div>
