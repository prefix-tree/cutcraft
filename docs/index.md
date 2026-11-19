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
<div class="home-hero-grid">
<div class="home-hero-main">

<p class="home-tags"><span>Unit 01</span><span>Video editor as code</span></p>

<h1 class="home-title"><span class="home-title-line">Make videos</span> <span class="home-title-line"><span class="home-title-mark">with code.</span></span></h1>

<p class="home-lead">Write a video as a React file. Play it in the browser, fine-tune it on a timeline, export it to MP4.</p>

<CopyCommand command="npm install uberscene @uberscene/kit react zod" />

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-button" :href="withBase('/examples/')">Examples</a>
<a class="home-button" href="https://github.com/prefix-tree/uberscene">GitHub</a>
</div>

<p class="home-agent-note">Using a coding agent? <a href="#install">Install the skill ↓</a></p>

</div>
<aside class="home-spec" aria-label="Specification">
<p class="home-spec-head"><span>Spec sheet</span><span>Type US-1</span></p>
<dl>
<div><dt>Input</dt><dd>One TSX file</dd></div>
<div><dt>Output</dt><dd>MP4 · WebM · PNG</dd></div>
<div><dt>Effects</dt><dd>45 shaders</dd></div>
<div><dt>Edit actions</dt><dd>115, undoable</dd></div>
<div><dt>Player</dt><dd>Browser, frame-exact</dd></div>
<div><dt>Render</dt><dd>Headless Chrome</dd></div>
<div><dt>Runtime</dt><dd>Node ≥ 22.19</dd></div>
<div><dt>Operator</dt><dd>You or your agent</dd></div>
</dl>
<p class="home-spec-stamp">MIT · Open source</p>
</aside>
</div>
</section>

<div class="home-ticker" aria-hidden="true"><div class="home-ticker-track"><span>TSX in, MP4 out</span><span>45 effects and transitions</span><span>115 undoable actions</span><span>Frame-exact player</span><span>Captions from the transcript</span><span>Three.js on the clock</span><span>Diff it, review it, ship it</span><span>TSX in, MP4 out</span><span>45 effects and transitions</span><span>115 undoable actions</span><span>Frame-exact player</span><span>Captions from the transcript</span><span>Three.js on the clock</span><span>Diff it, review it, ship it</span></div></div>

<section class="home-live" aria-label="Try it">

<Playground compact />

</section>

<section class="home-install" id="install">

## Install

<p class="home-chapter-lead">UberScene is built for a coding agent to drive. Give your agent the skill and ask for a video in plain words, or install the packages and write the file yourself. Either way you need Node 22.19 or later, and no ffmpeg.</p>

<div class="home-install-grid">
<div class="home-install-card primary">

<p class="home-install-kicker">A · Recommended</p>

### With your agent

<p class="home-install-step"><span>1</span> Install the skill. In <strong>Claude Code</strong>, add the plugin:</p>

```
/plugin marketplace add prefix-tree/uberscene
/plugin install uberscene@prefix-tree
```

<p class="home-install-step"><span></span> In <strong>any other agent</strong> that reads Agent Skills, write the skill into your project. It goes to <code>.claude/skills/uberscene</code>; add <code>--dir</code> for another folder.</p>

```sh
npx uberscene skills install
npx uberscene skills install --dir .agents/skills/uberscene
```

<p class="home-install-step"><span>2</span> Put your footage in the folder, with a transcript beside each recording (<code>talk.json</code> from Whisper, or <code>talk.srt</code>), and brief the agent like an editor:</p>

```text
Make a 30 second vertical clip from talk.mp4 for Reels. Open on the sentence about shipping on Fridays, add karaoke captions and a lower third with my name, Maya Chen, Founder. Put the name in the schema.
```

<p class="home-install-step"><span>3</span> The agent installs UberScene, writes <code>video.tsx</code>, checks it with sheets of frames and renders <code>video.mp4</code>. Ask for changes in words; they land in the same file.</p>

<p class="home-install-more"><a :href="withBase('/guide/agents')">With your agent →</a></p>

</div>
<div class="home-install-card">

<p class="home-install-kicker">B · By hand</p>

### In your project

<p class="home-install-step"><span>1</span> Install the command line and the elements:</p>

```sh
mkdir my-video && cd my-video
npm install uberscene @uberscene/kit react zod
```

<p class="home-install-step"><span>2</span> Add your footage to <code>uberscene.json</code>, write <code>video.tsx</code>, look at a sheet of its frames, then export it:</p>

```sh
npx uberscene add talk.mp4
npx uberscene look video.tsx
npx uberscene video.tsx --out video.mp4
```

<p class="home-install-step"><span>3</span> The first export downloads Chrome for Testing, which takes a minute; later ones start in seconds.</p>

<p class="home-install-more"><a :href="withBase('/guide/getting-started')">Quick start →</a></p>

</div>
</div>

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

## Features

<ul class="home-feature-list">
<li><strong>Timeline elements</strong> Clips, tracks, transitions, titles, shapes, masks, keyframes, speed ramps, freeze frames and multicam.</li>
<li><strong>Captions</strong> From the clip's transcript, SRT, VTT or Whisper; karaoke, word by word or typewriter.</li>
<li><strong>Effects and transitions</strong> 45 built in, run as shaders in the preview and the export, or your own in GLSL.</li>
<li><strong>Motion graphics</strong> Lower thirds, callouts, counters, quote cards and themes.</li>
<li><strong>Free code</strong> Any React, CSS, SVG, canvas, three.js or Motion, on the video's clock.</li>
<li><strong>Editing API</strong> 115 undoable actions that write each change back into the file.</li>
<li><strong>Player</strong> A React component that plays the file in the browser, frame-exact.</li>
<li><strong>Export</strong> MP4, WebM and stills from the command line, rendered in headless Chrome.</li>
<li><strong>Checks</strong> Lint, contact sheets and layout checks, to review a cut without watching it.</li>
<li><strong>Agent skill</strong> Teaches Claude Code and other agents to write, check and render videos.</li>
</ul>

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

<section class="home-elements">

## Every element

<p class="home-chapter-lead">Each one a few lines of TSX, rendered by the same player you embed. <a :href="withBase('/examples/')">All examples →</a></p>

<div class="home-element-grid">

<article class="home-element">

### Cuts and transitions

<p class="home-element-lead">Clips play one after another on a track. A transition between two of them overlaps them: wipe, iris, film burn, blinds and more. <a :href="withBase('/guide/transitions')">Transitions →</a></p>

<Example src="previews/elements/transition" alt="A wipe from one coffee shot to another">

<<< @/../examples/showcase/docs/transition.tsx

</Example>

</article>

<article class="home-element">

### Titles

<p class="home-element-lead">Text over the picture, timed to a clip, animated by letter, word or line. <a :href="withBase('/guide/titles-and-graphics')">Titles and graphics →</a></p>

<Example src="previews/elements/title" alt="A title appearing word by word over a coffee shot">

<<< @/../examples/showcase/docs/title.tsx

</Example>

</article>

<article class="home-element">

### Captions

<p class="home-element-lead">Captions from the clip's transcript, or from SRT, VTT and Whisper. Karaoke, word by word or typewriter. <a :href="withBase('/guide/captions-and-sound')">Captions and sound →</a></p>

<Example src="previews/elements/captions" alt="Karaoke captions over a speaker">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

</article>

<article class="home-element">

### Colour and effects

<p class="home-element-lead">Exposure, white balance, curves, LUTs, keying, glow and more, written in the order a colourist works. Shaders in the preview and the export. <a :href="withBase('/reference/effects/')">All 45 effects and transitions →</a></p>

<Example src="previews/guide/colour-grade" alt="A coffee shot, then the same shot graded">

<<< @/../examples/showcase/guide/colour-grade.tsx

</Example>

</article>

<article class="home-element">

### Motion graphics

<p class="home-element-lead">Ready-made lower thirds, callouts, counters and cards, timed like any title. <a :href="withBase('/reference/components/')">Components →</a></p>

<Example src="previews/components/lower-third" alt="A lower third sliding up over a coffee shot">

<<< @/../examples/showcase/components/lower-third.tsx

</Example>

</article>

<article class="home-element">

### Three.js and any React

<p class="home-element-lead">Any component on the video's clock: three.js, Motion, SVG or canvas, frame-exact when you scrub or export. <a :href="withBase('/guide/free-code')">Free code →</a></p>

<Example src="previews/elements/three" alt="A spinning cube over a coffee shot">

<<< @/../examples/showcase/docs/three.tsx

</Example>

</article>

</div>

</section>

<section class="home-foot">

<p class="home-foot-mark" aria-hidden="true">UberScene</p>

**Free and open source under the MIT licence.** <a :href="withBase('/examples/')">More examples →</a>

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/uberscene) ·
[npm](https://www.npmjs.com/package/uberscene)

</section>

</div>
