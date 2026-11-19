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

<p class="home-lead">Video as code. Write a React file, watch it play in the browser, export it to MP4.</p>

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-button" :href="withBase('/examples/')">Examples</a>
<a class="home-button" href="https://github.com/prefix-tree/uberscene">GitHub</a>
</div>

<CopyCommand command="npm install uberscene @uberscene/kit react zod" />

</div>

<div class="home-hero-video"><Preview src="showcase/launch" alt="A product launch rendered by UberScene" /></div>

</section>

<section class="home-gallery" aria-label="Videos">

## Videos

<Gallery />

<p class="home-links">Hover to play; open one to read the file that made it. <a :href="withBase('/examples/')">All examples →</a></p>

</section>

<section class="home-strip">

## Effects and transitions

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

<section class="home-try">

## Build one here

<p class="home-strip-lead">Edit the file; the video follows.</p>

<Playground compact />

<p class="home-links"><a :href="withBase('/playground')">Open the playground →</a></p>

</section>

<section class="home-foot">

**Free and open source under the MIT licence.**

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/uberscene) ·
[npm](https://www.npmjs.com/package/uberscene)

</section>

</div>
