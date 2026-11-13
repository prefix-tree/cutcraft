# 0027. What we adopt from HyperFrames

> Status: proposed. Follows from [0018](./0018-free-code-in-a-timeline-skeleton.md) (free code in a timeline
> skeleton) and [0021](./0021-one-export-engine.md) (one export engine). The work plan at the end is the order it
> lands in.

## Context

HyperFrames (HeyGen, Apache-2.0) renders HTML compositions to video by seeking frames in headless Chrome. It has
been run in production at scale, and its engine, runtime and tests record the problems that shows up: libraries that keep
their own clock, frames captured before an image arrives, renders that hang, audio that clips. We read its engine,
runtime, producer, CLI checks and registry next to our player and export page. The question was which of its
engineering choices fix real defects or gaps in ours. Its authoring model (HTML with `data-*` timing, GSAP
timelines) is not in question.

Reading it against our code found defects of our own:

- 0018 and the free-code lint rule say that `requestAnimationFrame`, `Date` and `performance` follow the video's
  clock. Nothing makes them. In the export a loop driven by `requestAnimationFrame` advances by wall-clock time per
  frame, so its speed depends on the machine. `Math.random()` differs in each tab, so with `tabs > 1` a layer that
  spans two pieces jumps where they meet.
- `holdCssAnimations` holds CSS animations only. A CSS transition or an `element.animate()` runs on its own clock.
- The mixer clamps each summed sample to ±1 (`render/src/mixer.ts`), a hard clip with no limiter, in the player and
  the export alike. `measureSound` reads the clamped mix, so `--listen` never shows a peak above 0 dB and a clipped
  soundtrack passes every check.
- The export page waits on nothing with a deadline. A stuck decoder hangs `cutcraft render` with no message, and
  `painted()` falls back to two animation frames after a second without saying so, which can capture a stale frame.
- The page waits for fonts, `<img>` and layer holds, but not for an inline CSS `background-image` or a three.js
  texture loaded outside Suspense, so the first frames can draw without them.
- The export test of three.js checks one pixel that is orange at every rotation, so a scene frozen on its first
  frame would pass. HyperFrames records Chrome versions where a WebGL canvas drawn with `drawElementImage` froze
  just so. It does not reproduce on Chrome 157, and nothing would tell us if it came back.

## Decision

Adopt eight things. Ported code keeps its Apache-2.0 notice in the file header, and `CREDITS.md` names HyperFrames.

### 1. Free code runs on the video's clock in the export

The file's own code gets, in an export, names that shadow the browser's:

- `performance.now()` and `Date.now()` that return the frame's time (and `new Date()` with no argument the same);
- a `requestAnimationFrame` whose callbacks are queued and run once per frame, after the frame's commit, with the
  frame's time as their timestamp;
- a `Math.random` that gives one fixed sequence.

HyperFrames replaces the page's globals. We do not: the kit's `loadModule` already runs the file as the body of a
function, so these are passed as parameters of that function (`scope`), and only the file sees them. React's
scheduler, the player, `ShaderBox`'s and the capture's waits for a paint, and the libraries keep the browser's clock;
three.js and Motion are put on the video's by their adapters. The cost is that `window.requestAnimationFrame` and
`globalThis.performance` are still the browser's own, so the lint rule warns about those forms. Timers are left
alone. A fixed sequence does not make a layer that mounts at different moments in two tabs agree, so the lint rule
points `Math.random()` to the kit's `random(seed)`.

`holdCssAnimations` becomes a hold on every Web Animation under the layer: CSS animations and transitions, and
`element.animate()`. A CSS animation's zero is the layer's start, as before, and so is that of an animation made as
the layer's interior mounts. A transition, or an animation made later, begins at the layer time it is first seen.
This applies in the player too.

The live player keeps the browser's clock for the rest. While playing at speed it agrees with the video. While
paused, a loop keeps running; that is a preview difference, not a wrong export.

### 2. The soundtrack is measured before it is clamped

`measureSound` measures the mix before the clamp and reports integrated loudness (LUFS, ITU-R BS.1770 with gating),
true peak (4× oversampled) and the number of clipped samples with the first one's time. `look --listen` prints them
and warns about clipping, and `renderVideo` adds a warning to its result. The measure is ported from HyperFrames'
`audioAnalysis.ts`.

No limiter or loudness target yet. One would have to run identically in the player's Web Audio graph and in the
export's mixer, or the two stop matching (the mixer parity test). Measuring comes first; a limiter is its own record.

### 3. An export never hangs in silence

Each frame on the export page races a deadline (60 s by default). When it passes, the export fails with the frame,
its time and the step it was in (step, settle, paint, encode). Each time `painted()` falls back to animation frames,
a counter goes up, and the result carries a warning naming how many frames it affected.

### 4. The page waits for what it draws

`settle()` also waits for:

- each URL in an inline `background-image`, decoded once;
- three.js's `DefaultLoadingManager` until it has loaded what it started;
- `decode()` on every `<img>`, not only those still loading.

Backgrounds set in a stylesheet, and loaders with a manager of their own, are not covered. The docs say so.

### 5. Tests that see what would break

- The three.js export test asserts that two frames of a turning cube differ.
- Three to five stills of a whole composed frame (clips, captions, a transition, a layer) join the goldens, with a
  tolerance rather than exact equality, against the pinned Chrome.
- One export test draws a `ShaderBox` inside a layer, a capture canvas inside the capture canvas.

### 6. Faster where it costs nothing

- Motion blur averages its samples on the GPU: each sample drawn into a float16 canvas with `lighter` blending at
  opacity 1/n, in place of reading every sample back with `getImageData` and summing it in JavaScript. The 8-bit path
  stays as the fallback.
- The engine opens its tabs at the same time, not one after another.
- `planSegments` splits frames evenly over the tabs. Each piece already starts its own encoder on a keyframe, so a
  piece need not be a whole number of keyframe groups.

### 7. `beat:N` in the manifest

`cutcraft add` detects the beats of music (spectral flux onsets, an autocorrelation tempo, dynamic-programming beat
tracking, ported from HyperFrames' `audioRhythm.ts`) and writes `beats` beside an asset's words and shots. `beat:N`
and `beat:N.end` resolve like `silence:N`. Music without a steady beat (below a confidence threshold) gets no beats,
and `beat:N` on it is a resolve error that says why.

### 8. A contrast check in `layout-check`

For each text overlay at the checked moments, the export page hides the text, reads the pixels behind its ink bounds
and computes the contrast with the text's colour. A low ratio is a warning, not an error: captions often rely on a
shadow or a stroke the measure cannot credit.

## Consequences

- 0018's sentence on the clock becomes true in the export, and free code written the obvious way renders the same on
  any machine and in any number of tabs.
- A clipped or very loud soundtrack is reported. It is still exported as it is.
- A hung export fails with a reason instead of running forever. A frame slower than the deadline on a very slow
  machine fails too; the deadline is an option.
- The clock reaches only the file's own code, so it cannot hold up a paint our own code waits for. What it misses is
  time asked for through `window`, and time a library asks for itself.
- A CSS transition is state, not a function of time: an export in several tabs that starts a piece after the
  transition began draws it finished. One tab, the default, draws it right.
- Goldens drift with Chrome and font rasterisers. They are tied to the pinned Chrome, and a Chrome bump updates them
  in the same pull request.

## Alternatives

**Frame adapters for GSAP, Lottie and anime.js.** HyperFrames seeks each library through an adapter. Set aside: its
GSAP adapter is 656 lines, our hooks already put Motion and three.js on the clock, and the Web Animation hold covers
what a library does through the browser. Lottie can come later, as a hook, if After Effects files are wanted.

**Skipping static frames.** HyperFrames skips capturing a frame when its GSAP timelines show nothing moving. We have
no timeline to read inside free code, the encode still runs, and only fully still stretches would gain.

**A browser per worker.** Measured on our engine: no faster than tabs (the GPU and encoder are shared), slower at
four.

**Their registry of blocks.** A block is often a short HTML wrapper around a minified bundle. Our effects are typed
definitions the model can read; a preview video in an effect's metadata is the one part worth taking, for the docs.

**Their colour grading system, footage analyzer and HDR tone mapping.** We already have levels, a 3D LUT, exposure,
white balance, curves and more as effects. The analyzer's thresholds are crude next to `look`, and the HDR path needs
FFmpeg. Colour wheels and hue curves may come later as effects.

**Their shader transitions, motion-blur filter, lint, audio carving and preview-to-export parity harness.** More
transitions rather than better ones; a blur that only smears straight-line movement, where ours renders the frame at
each moment of the shutter; a lint for their HTML format; spectral ducking our `duck` mostly covers; a harness for two
runtimes, where our export runs the player's own painter.

## Work plan

Each step is one pull request with its tests, docs and changeset.

1. **Regression tests** (decision 5). First, because steps 2 and 5 change what the page draws.
2. **The video clock** (decision 1). The scope on the export page, the Web Animation hold in the player, the lint
   hints. Tests: a `requestAnimationFrame` loop, an `element.animate()` and `Math.random()` export the same frames at
   one and three tabs; a CSS transition runs on the video's time in one.
3. **Sound measured before the clamp** (decision 2). Tests: a mix known to clip reports its count and first time; a
   −23 LUFS reference tone measures within 0.5 LU.
4. **No silent hang** (decision 3). Tests: a layer that never releases its hold fails with its frame and step under a
   short deadline; a forced paint fallback warns.
5. **Wait for what draws** (decision 4). Tests: a background image and a three.js texture loaded late are in the
   first frame.
6. **Speed** (decision 6). Before and after times for a blurred export and a four-tab export in the pull request.
7. **`beat:N`** (decision 7). Tests: a click track at a known tempo; music with no beat.
8. **Contrast** (decision 8). Tests: white text over a white and a dark background.
