---
layout: page
title: CutCraft
titleTemplate: Video editor as code
footer: false
sidebar: false
aside: false
---

<script setup>
import { withBase } from "vitepress";
import kit from "../packages/kit/package.json";
</script>

<div class="home vp-doc">

<section class="home-hero">

<a class="home-pill" href="https://github.com/prefix-tree/cutcraft/blob/main/packages/kit/CHANGELOG.md"><span>v{{ kit.version }}</span> Effects rebuilt for real footage →</a>

# Video editor as code

<p class="home-lead">Your video is a React file: cuts on words, titles, captions, colour and effects. Your agent writes it,
you fine-tune it on a timeline, and it exports to MP4.</p>

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-button" href="https://github.com/prefix-tree/cutcraft">GitHub</a>
</div>

<CopyCommand command="npm install cutcraft @cutcraft/kit react zod" />

<p class="home-meta">MIT licence · no paid tier · no watermark · exports MP4, WebM and stills</p>

<HeroVideo src="showcase/hero" alt="A woodblock print: waves roll in, a red sun rises through mist, a katana cuts it in two, and the print draws in to the CutCraft logo beside the words made by your agent, edited by hand, owned as code" />

</section>

<section class="home-goal">

## The idea

<p class="home-goal-lead">Everything a desktop editor gives you (tracks, cuts, transitions, titles, captions, colour,
keying and export) as one file that you, your agent and your code all edit. Where the timeline stops, write any React,
CSS or WebGL.</p>

</section>

<section class="home-free">

**Free for everyone, under the MIT licence.** The player, the editor actions, the export and the checks: no paid tier,
no licence key, no watermark on the frames, for a person, a startup or a company.

</section>

<section class="home-features">

## Features

<p class="home-strip-lead">What a desktop editor does, as elements in one file. Each card opens the page that explains it.</p>

<div class="cc-cards home-cards">
<PreviewCard title="Captions that follow the words" link="/guide/captions-and-sound" src="showcase/captions" text="From the transcript, through every trim: karaoke, word by word or typewriter. Or import SRT, VTT or Whisper." />
<PreviewCard title="Transitions" link="/reference/effects/#transitions" src="previews/transitions/iris" text="Fades, wipes, slides and pushes, and shader transitions: iris, clock wipe, blinds, film burn and more." />
<PreviewCard title="Colour and effects" link="/guide/colour" src="previews/guide/colour-grade" text="Exposure, white balance, curves, LUTs, keying and glow, run as shaders in the preview and the export. Or write your own in GLSL." />
<PreviewCard title="Ready-made components" link="/reference/components/" src="previews/components/lower-third" text="Lower thirds, callouts, counters and more: plain functions that follow words and take the theme's colours." />
<PreviewCard title="Free code" link="/guide/free-code" src="showcase/logo" text="Any React, CSS or WebGL in a Layer, and three.js and Motion on the video's clock, frame-exact." />
<PreviewCard title="Edit by hand, keep the code" link="/guide/editing" src="showcase/edit" text="Every drag and trim is an undoable action, written back to the file as a one-value change." />
</div>

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

<section class="home-examples">

## What you can build

<p class="home-strip-lead">Each one is a short file rendered by CutCraft's own export. Open a card to see the file that made it.</p>

<div class="cc-cards home-cards">
<PreviewCard title="Product launches" link="/examples#a-product-launch" src="showcase/launch" text="A founder on camera, a three.js phone, each feature on its word." />
<PreviewCard title="Vertical shorts" link="/examples#captions-and-key-points" src="showcase/captions" text="Captions from the transcript, key points on the words that say them." />
<PreviewCard title="Kinetic type" link="/examples#kinetic-type" src="showcase/kinetic" text="Motion sequences that land on their words." />
<PreviewCard title="Data stories" link="/examples#a-data-story" src="showcase/data" text="Charts and counters in SVG and React, each number on its word." />
<PreviewCard title="Logo reveals" link="/examples#a-logo-reveal" src="showcase/logo" text="three.js particles that settle into a name." />
<PreviewCard title="Edits" link="/examples#an-edit" src="showcase/edit" text="Shots joined by a wipe and a slide, with a push-in on keyframes." />
</div>

<p class="home-links">Also as recipes: <a :href="withBase('/recipes/talking-head')">interviews</a> · <a :href="withBase('/recipes/product-demo')">product demos</a> · <a :href="withBase('/recipes/vertical-podcast')">podcast clips</a> · <a :href="withBase('/recipes/slideshow')">slideshows</a> · <a :href="withBase('/recipes/variants')">variants</a> · <a :href="withBase('/examples')">all examples →</a></p>

</section>

<section class="home-foot">

**Free and open source under the MIT licence.**

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/cutcraft) ·
[npm](https://www.npmjs.com/package/cutcraft)

</section>

</div>
