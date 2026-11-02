---
layout: page
title: CutCraft
titleTemplate: Video editor as code
footer: false
---

<script setup>
import { withBase } from "vitepress";
import bench from "./bench.json";

const large = bench.editor.filter((r) => r.nodes > 500);
const drag = large.find((r) => r.step.startsWith("transform"));
const trim = large.find((r) => r.step.startsWith("clip/trim"));
const exported = Object.fromEntries(bench.export.map((r) => [r.file, r]));
const realtime = (r) => (r.fps1 / 30).toFixed(1);
</script>

<div class="cc">
<div class="cc-crumb"><span>01 / <b>CutCraft</b></span><span>The file is the video</span></div>
<section class="cc-hero">
<div class="cc-hero-side">CUTCRAFT</div>
<img class="cc-icon" :src="withBase('/logo.svg')" alt="CutCraft">
<div class="cc-name"><span class="cc-num">01</span><span>Cut<em>Craft</em></span></div>
<h1 class="cc-display">Video editor <em>as&nbsp;code</em>.</h1>
<p class="cc-lede">LLMs are good at writing code and bad at math. So the model writes the video as a TSX file that names what it means (a word, a shot, the clip a title belongs to), and CutCraft does the arithmetic. The browser plays the file, the editor edits the same file, and Node exports it.</p>
<div class="cc-actions">
<a class="cc-btn primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="cc-btn" :href="withBase('/examples')">See the examples</a>
<a class="cc-btn" href="https://github.com/prefix-tree/cutcraft">View on GitHub</a>
</div>
<div class="cc-meta">MIT · TypeScript · React · Node 22.19+ · Free and open source</div>
</section>

<section class="cc-section" id="examples">
<div class="cc-crumb"><span>02 / <b>Examples</b></span><span>Rendered by CutCraft</span></div>
<div class="cc-head"><div><h2 class="cc-display">Every frame, <em>from a file</em>.</h2><p class="cc-lede">Each video below is one short TSX file rendered by the export engine. Change a number in the file, or drag the element in the editor, and the video follows.</p></div><div class="cc-side">EXAMPLES</div></div>
<div class="cc-examples">
<a class="cc-example" :href="withBase('/examples#an-edit')">
<video :src="withBase('/showcase/edit.webm')" :poster="withBase('/showcase/edit.jpg')" autoplay muted loop playsinline></video>
<div class="cc-example-text"><span class="cc-label"><span>01 · An edit</span><span>8 s · 16:9</span></span><h3>Shots, transitions, a push-in</h3><p>Three shots cut back to back with a wipe and a slide, keyframed scale, a title that builds word by word, and a lower third.</p></div>
</a>
<a class="cc-example tall" :href="withBase('/examples#captions-and-key-points')">
<video :src="withBase('/showcase/captions.webm')" :poster="withBase('/showcase/captions.jpg')" autoplay muted loop playsinline></video>
<div class="cc-example-text"><span class="cc-label"><span>02 · A short</span><span>11 s · 9:16</span></span><h3>Captions that follow the words</h3><p>Karaoke captions made from the transcript, and a key point timed to the word that names it with <code>at="word:16"</code>.</p></div>
</a>
<div class="cc-examples" style="grid-template-columns: 1fr 1fr; border-top: none;">
<a class="cc-example" :href="withBase('/examples#data-graphics')">
<video :src="withBase('/showcase/graphics.webm')" :poster="withBase('/showcase/graphics.jpg')" autoplay muted loop playsinline></video>
<div class="cc-example-text"><span class="cc-label"><span>03 · Data</span><span>5 s</span></span><h3>Numbers as props</h3><p>A counter, a unit grid, a comparison and a sample, each one <code>&lt;Graphic&gt;</code> the inspector can edit.</p></div>
</a>
<a class="cc-example" :href="withBase('/examples#motion')">
<video :src="withBase('/showcase/motion.webm')" :poster="withBase('/showcase/motion.jpg')" autoplay muted loop playsinline></video>
<div class="cc-example-text"><span class="cc-label"><span>04 · Motion</span><span>5 s</span></span><h3>Springs in a layer</h3><p>A chart drawn with <code>spring()</code> on the layer's clock, a callout and confetti from the built-in graphics.</p></div>
</a>
</div>
</div>
</section>

<section class="cc-section" id="highlights">
<div class="cc-crumb"><span>03 / <b>Highlights</b></span><span>What is inside</span></div>
<div class="cc-head"><h2 class="cc-display">What's <em>inside</em>.</h2><div class="cc-side">HIGHLIGHTS</div></div>
<div class="cc-grid">
<div class="cc-cell"><span class="cc-label">01</span><h3>One file, three authors</h3><p>The model writes it, the editor's gestures become actions that fold back as one-token edits, and the model reads what you did as the code it wrote.</p></div>
<div class="cc-cell"><span class="cc-label">02</span><h3>No math for the model</h3><p>Cuts name transcript words and camera shots (<code>in="word:12"</code>), a title names the word it belongs to (<code>at="word:14"</code>), and the resolver turns them into seconds, through every trim and speed change.</p></div>
<div class="cc-cell"><span class="cc-label">03</span><h3>Every action undoes</h3><p>131 editor actions, each with validate, apply, invert and fold. A drag is one undo step and one small diff.</p></div>
<div class="cc-cell"><span class="cc-label">04</span><h3>Plays in the browser</h3><p>WebCodecs through mediabunny, a canvas for footage, DOM for overlays, Web Audio as the clock, and a frame-exact <code>seekTo(t)</code>.</p></div>
<div class="cc-cell"><span class="cc-label">05</span><h3>Exports in Node</h3><p>The same engine, headless: WebM, MP4, MOV, MP3 or WAV soundtracks and stills, with its own audio mix and worker threads.</p></div>
<div class="cc-cell"><span class="cc-label">06</span><h3>Checks like a compiler</h3><p>A lint for the file contract, a list of what renders, and a layout check that points at the line where a graphic covers a face or leaves the safe zone.</p></div>
</div>
</section>

<section class="cc-section" id="benchmarks">
<div class="cc-crumb"><span>04 / <b>Benchmarks</b></span><span>Measured {{ bench.measured }}{{ bench.ci ? " on GitHub Actions" : "" }}</span></div>
<div class="cc-head"><h2 class="cc-display">Fast enough <em>to edit by hand</em>.</h2><div class="cc-side">BENCHMARKS</div></div>
<div class="cc-grid">
<div class="cc-cell"><span class="cc-label">Editor</span><div class="cc-stat">{{ (drag.usPerStep / 1000).toFixed(2) }}<small>ms</small></div><p>One drag step on a composition of {{ drag.nodes.toLocaleString("en-US") }} elements: validate the action, patch the file, resolve everything again. A trim takes {{ (trim.usPerStep / 1000).toFixed(2) }} ms.</p></div>
<div class="cc-cell"><span class="cc-label">Export</span><div class="cc-stat">{{ exported.edit.fps1 }}<small>fps</small></div><p>The edit above, {{ exported.edit.width }}×{{ exported.edit.height }} at 30 fps, exported on one thread: {{ realtime(exported.edit) }}× real time, with the shots decoded, composited and encoded.</p></div>
<div class="cc-cell"><span class="cc-label">Graphics</span><div class="cc-stat">{{ exported.graphics.fps1 }}<small>fps</small></div><p>The data graphics, drawn as SVG and laid out every frame: {{ realtime(exported.graphics) }}× real time on one thread; the short is {{ realtime(exported.captions) }}×.</p></div>
</div>
<div class="cc-note">{{ bench.machine }}, Node {{ bench.node }}. Run <code>pnpm docs:bench</code> to measure your machine; the docs build measures GitHub's runner. Clips this short export fastest on one thread: workers pay off on longer renders (see <a :href="withBase('/guide/exporting#faster')">Exporting</a>).</div>
</section>

<section class="cc-section" id="start">
<div class="cc-crumb"><span>05 / <b>Get started</b></span><span>Free · open source</span></div>
<div class="cc-head"><h2 class="cc-display">Write a file. <em>Watch it play.</em></h2><div class="cc-side">GET STARTED</div></div>
<div class="cc-start"><div class="vp-doc"><span class="cc-label">From the repository</span>

```sh
pnpm install
pnpm check                                       # typecheck, lint, every suite
pnpm --filter @cutcut/example-launch-recap gen   # placeholder footage
pnpm --filter @cutcut/example-launch-recap dev   # http://localhost:5180
pnpm --filter @cutcut/render exec cutcut-render video.tsx --out video.mp4
```

</div><div><span class="cc-label">Read next</span><div class="cc-links">
<a :href="withBase('/guide/writing-files')">Writing a file <span>Guide</span></a>
<a :href="withBase('/reference/elements')">Every element and prop <span>Reference</span></a>
<a :href="withBase('/reference/graphics')">Built-in graphics <span>Catalog</span></a>
<a :href="withBase('/guide/exporting')">Exporting and the layout check <span>Guide</span></a>
<a :href="withBase('/decisions/')">Why it is built this way <span>Decisions</span></a>
</div></div></div>
</section>

<div class="cc-foot"><span><b>CutCraft</b> · MIT licence</span><span>Made for models and the people who edit with them.</span></div>
</div>
