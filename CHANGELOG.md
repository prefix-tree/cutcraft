# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/). Nothing has been published yet.

## [Unreleased]

### Added

- A reversed clip plays its audio backwards, in the preview and the export, instead of going silent.

- `<Effect>` types `temperature`, `tint` (`params.amount`, as on `<ColorGrade>`) and `levels`
  (`params.black`, `params.white` on 0..1) render in the preview and the export. A levels `gamma`
  has no filter form and the `not-rendered` lint reports it; `sharpen` stays unrendered.

- A `not-rendered` lint: one table in the kit (`jsx/rendering.ts`) lists what the player and the
  renderer draw and play, the player reads it for its warnings, and the lint reports every other
  value or prop in a file with what happens instead, so a file that checks clean renders as written.

- `anchor="id.end"` places an overlay relative to another element's end, so an end card or a
  closing title needs no arithmetic on the clip's length.

- `<Title width height>`: the text box in composition pixels, the whole frame when left out, so
  `background`, `align` and `valign` apply inside a lower third instead of the frame.

- `<Clip frame={{ focus }}>` reframes a clip to the composition's aspect: the resolver writes
  `transform.crop` from the source size and the focus (`left`, `center`, `right` or `{ x, y }`);
  a written crop wins, so the editor's crop drag keeps working.

- `duck.under` resolves a track id first, then a track role (`dialogue`), and the resolver reports
  a name that is neither. Clips at `volume={0}` no longer duck the bed.

- `loadModule(source)` in `@cutcut/kit/source`: a cut file's source as a running module, through
  Sucrase and a `require` that offers only react, zod and the kit, so an editor's preview and a
  server-side check load a file the same way and refuse the same imports.

- SMIL in `<Svg>` plays on the element's own clock: animations are evaluated at each frame and
  written into the markup, so the preview, scrubbing and the export agree. CSS animations in SVG
  are removed with a warning instead of playing on the browser's clock alone.

- Overlays on tracks below every footage track draw beneath the footage (backgrounds under
  the cut), in the preview and the export; elsewhere overlays still draw above it.
- The model's prompt has a "Graphics and style" section (theme first, tokens, presets, graphic
  kinds, backgrounds, SVG rules); a new recipe, a brand spot that one prop renders in any
  theme; the variants recipe takes a theme beside its brand colour.

- `<Graphic kind>`: thirty built-in graphics from the new `@cutcut/graphics` package (arrows,
  callouts, speech bubbles, badges, pills, bursts, three lower thirds, corner brackets, frames,
  device frames, underline and circle scribbles, marker sweeps, strikes, progress bars,
  countdowns, step dots, dividers, five backgrounds, confetti, sparkles and Lucide icons). Each
  kind is a pure function from its props, the theme and the time to SVG art and text labels, so
  the preview and the export draw the same thing and every graphic follows the theme. Props are
  typed per kind in JSX and checked by the `graphic-props` lint; `<Sticker src="icon:name">` draws
  a Lucide icon. The graphics reference shows each kind as the export renders it
  (`pnpm docs:graphics`).

- Themes: `theme` on the composition holds a palette, fonts, a corner radius, a motion style
  and named presets per element kind, starting from one of six built-in themes. Props take
  theme values as `$tokens`, elements pick presets with `style`, and the motion style fills
  entrances, exits and transitions the file leaves out; the resolver applies all of it before
  parsing and records on each placement which props came from the theme. New actions
  `composition/setTheme` and `theme/setToken` fold into the theme literal; new lint rules
  `theme-refs`, `theme-literals` and `font-available`. Four OFL families ship beside Inter
  (Space Grotesk, Playfair Display, DM Sans, JetBrains Mono) in the export and, through
  `@cutcut/player/fonts.css`, in the preview.

- Entrances and exits (`enter`, `exit`) on titles, shapes, SVG, stickers and layers, all
  twenty presets including wipes, reveals and `draw`, computed in the shared layout so the
  preview and the export agree. Shapes are drawn as SVG with gradient fill and stroke, drop
  shadows, per-corner radii, caps, joins and dash offsets; the composition background can be
  a gradient.

- SVG is prepared once for both surfaces (`prepareSvg`): sanitised, sized to what it
  asks for or fitted with `fit`, `viewBox` and `preserveAspectRatio` honoured, ids renamed per
  element, theme tokens filled in, and `color` `replace`/`tint`/`opacity` applied as SVG filters.
  The preview inlines SVG assets instead of loading them as images. In the export, an inline
  `<svg>` inside a Layer is drawn (Satori embedded it as an image skia could not read).

- `@cutcut/render`: export to WebM (VP9 and Opus) or MP4 (H.264 and AAC) in Node,
  with no browser. It runs the player's engine through the new
  `@cutcut/player/engine` and `@cutcut/player/overlays` entries; titles, layers
  and captions are laid out by Satori from the trees the browser mounts and drawn
  with the layout the DOM gives them (blend modes included); the soundtrack is
  mixed by our own offline mixer (bit-exact against Web Audio's
  `OfflineAudioContext` at 1x and 1.5x); `cutcut-render` loads a TSX file and
  renders it. Workers render runs of whole keyframe intervals and the main
  thread joins them (1.6 to 2.2 times one thread on four cores); `--copy` copies
  the encoded pictures of plain cuts of a VP8/VP9 source (460 fps against 12 on
  keyframe-aligned cuts); overlay layouts are cached; `--speed fast` is the
  encoder's real-time mode. Every recipe is rendered in a test. Decision 0015.

- A logo: an orange disc with a wedge cut out of it, like Pac-Man, and a
  small frame ahead of it. Used as the docs site's nav logo and favicon and
  at the top of the READMEs (`docs/public/logo.svg`).

- `recipes/`: seven complete cut files (talking-head cut, product demo with
  zoom-ins, vertical podcast clip, slideshow, stats with handles, variants,
  multicam highlights) over one fixture manifest, each linted, resolved and
  pinned by a test, with a docs page per recipe.

- Captions follow the clips: a word reference on a `<Caption>` resolves to
  where the word plays, and `<Captions src>` with no literal cues generates
  them from the transcript along the timeline (`maxChars`, `maxDuration`,
  `maxGap`). The first edit to a generated cue writes all cues into the
  file; undo resumes generation. Decision 0014.

- Layer handles: a `<Layer>` whose interior is one component exposes that
  component's literal and schema-bound props to the editor (`layer/setProps`,
  `ElementSite.interior`, `Placement.interior`); the player applies edited
  handles without re-evaluating the file. Decision 0013 and a Remotion
  comparison (`docs/comparisons/remotion.md`) record where the idea comes
  from and correct 0001 and 0007 on Remotion having an editor.

- `useLayer()` beside `useT()` inside a `<Layer>`: the layer's clock with
  `elapsed`, `remaining` and `duration` in seconds, the composition `time`
  and `fps`, so a countdown or a timer reads real time off the player.

- `@cutcut/kit`: `track/setLayout`, `multicam/flatten` and `nested/extract`
  apply (they were validated stubs), with `resolveScene` resolving a
  `<Nested>` interior for the kit and the player alike. The fold prints
  chained inserts and reorders as one group and an inserted node as it
  stands after later patches.

- A comparison with Diffusion Studio (`docs/comparisons/diffusion-studio.md`)
  and decision 0012 on what cutcut adopts from it: fold per gesture, editing
  policy in the prompt, `sequence-gap` and `cut-inside-word` lint rules,
  `PlayerCore.captureSheet`.

- `@cutcut/kit`: the JSX vocabulary (26 elements with Zod schemas), the asset
  manifest and `TimeRef` resolution, the resolver (sequence and free tracks,
  gaps, transitions, anchors, fill and match durations, multicam cuts), the
  patch log, the action system (124 actions with validate, apply, invert and
  fold), history with gesture grouping, the executor, the source index, fold,
  bake and lint.
- `@cutcut/player`: the browser renderer. WebCodecs decoding through mediabunny,
  per-clip decoders, canvas compositing with transforms, masks, crossfades and
  adjustments, DOM overlays, a Web Audio clock and mixer with ducking, the
  framework-free `PlayerCore` and the React `<Player>`.
- `examples/launch-recap`: a file written from a brief under the authoring
  prompt, played with placeholder footage; a guide explaining each choice.
- The docs site: guides, generated element and action reference, decision
  records.
- Benchmarks and performance tests for the drag loop.

### Changed

- `<Marker at>` and `<Cut at>` take seconds only, like `<Keyframe at>`: the schema rejects a
  reference (`"word:3"`), where before it passed the schema and the resolver reported it.

- A timing prop that references a `schema` prop (`out={closeOut}`) is bound,
  not locked: the timeline drags it and the fold writes the value into
  `defaults`. Placements carry `boundProps`; `expression-locked` no longer
  warns on it.
- The project and its packages are named cutcut (`@cutcut/kit`, `@cutcut/player`); the TSX file is still called a cut file.
- Resolve caches parsed props and intrinsic timing per node and keeps
  placement identity, so a drag step costs about 1 µs per element.
- Decoders survive trims; a paused preview repaints without waiting and
  settles to the exact frame after the gesture.

### Fixed

- The preview filtered footage under an `<Adjustment>` twice: the painter filtered the canvas and
  a CSS backdrop filter filtered it again. The backdrop filter is gone, so the preview matches the
  export: the adjustment filters the footage beneath it, not the overlays.
- An overlay's `blend` mixes with the footage in the export but not in the preview, whose overlay
  plane is isolated from the canvas; the `not-rendered` lint now says so.

- A parallel export that fails no longer cuts off the other workers mid-frame: a busy worker
  finishes its run (or a minute passes) before the pool terminates it, since terminating a thread
  inside a skia call can abort the whole process.
- The export no longer aborts on SVG text in a font it lacks: skia ends the process (no
  exception) for an unknown or quoted family, so families are narrowed to one it has, or
  sans-serif with a warning. The bundled fonts are registered for SVG text too.

- A seek or export frame could be the one before the right frame when the source time
  landed a hair below a frame boundary (as it does at 1.5x) and the next frame was not decoded
  yet: the wait ended because the earlier frame still "covered" the time. It now uses the same
  1 ms tolerance as the pick. This was the intermittent off-by-one in the parallel export test.

- A placement with `duration="fill"` (a music bed under the whole video) had a
  source range of nothing, so the audio plan skipped it and the bed was silent
  in the preview. It now plays the range it fills.
- A multicam's generated clips carried the angle's `asset:` reference as their
  asset id, which no media resolver knows. They carry the plain id.
- `useT()` and `useLayer()` look for the player's clock on `globalThis`, so a
  cut file loaded with its own copy of the kit (a tool's private module graph)
  still finds it.
