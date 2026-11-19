# @uberscene/kit

## 0.5.0

### Minor Changes

- 4fac602: Three small helpers for free code that draws a board or happens in steps. `grid({ columns, rows, width, height, x, y })` is the geometry of a grid and draws nothing: it returns every cell with its index, column, row and box, and `rect(column, row)`. `stepAt(times, t)` says which step a moment has reached in a list of seconds. `random()` takes several keys, so `random("wall", cell, turn)` names one number among many; with one seed it gives what it always gave.
- 933fa0c: `<Layer ground>` marks a layer as a ground that other things sit on (a wall behind a game, a scrim under a title), so the layout check, `uberscene where` and `look --zones` treat it like a background. `<Three>` and `<Motion>` take it too. `uberscene inspect` prints `ground` on its line. This replaces the `data-ground` attribute on an element inside the layer, which is no longer read: a file that used it moves the marker to the `<Layer>`.
- 97d54f4: A video file may import modules of its own: `import { ChatReveal } from "./blocks/chat-reveal"`. Each is a `.ts` or `.tsx` file inside the project (the folder of the nearest `uberscene.json`), compiled and run like the file, once. `gatherLocalFiles(source, read)` collects their texts and `loadModule(source, { files })` runs them; the command line reads them from disk, refuses one outside the project, names a missing one with where it looked, passes them to the export page, and keys cached frames drawn by their code on their text.
- 24a2570: CutCraft is now UberScene. The packages are `uberscene` (the CLI, run as `npx uberscene`) and `@uberscene/kit`, `@uberscene/player`, `@uberscene/render` and `@uberscene/graphics`; change your imports from `@cutcraft/*`. The manifest is `uberscene.json`, and a `cutcraft.json` is still found. The environment variables are `UBERSCENE_*` instead of `CUTCRAFT_*`, and the caches move to `~/.cache/uberscene`.
- a8f1cd3: A file's `schema` values are knobs an editor and an agent can read. `knob.color()`, `knob.font()` and `knob.image()` mark a string that wants a colour picker, a font menu or an image picker; `.describe("…")` is the label; `z.enum` is a choice and a number's `.min()`/`.max()` bound it. `knobsOf(schema, values)` returns each with its key, kind, description, value, options and bounds. `uberscene inspect` lists them before the timeline, and `--json` has them as `knobs`. The recipes mark their colours and logos.
- 34c8b8a: `useSeekable(create, deps?)` plays an animation from another library on the layer's clock: built once, paused, on the element its ref is on, seeked to the layer's seconds before every frame is painted, and reverted (or destroyed, or killed) when the layer ends or `deps` change. A GSAP timeline fits as it is; Anime.js and Lottie take a two-line wrapper. A `seek` that returns a promise holds the export's frame until it settles.

### Patch Changes

- 546f81a: Writing edits back no longer fails when an element is moved and something inside it is also edited, such as reordering a track and changing the volume of a sound on it. The moved element is printed with those edits in it; before, the two edits overlapped and `foldToSource` threw "overlapping edits".

## 0.4.0

### Minor Changes

- 96799e4: Captions can sit at any height. `style={{ position: 0.6 }}` on `<Captions>` puts their middle 60% of the way down the frame; `top`, `center` and `bottom` work as before. Over a talking head in a vertical video, `center` lands on the speaker's mouth and `bottom` is under the platforms' controls; a number between puts the captions under the chin.
- 12fbb4e: Captions can be placed exactly: `x` and `y` on `<Captions>` are the middle of the captions in pixels from the
  frame's centre, `width` is the widest a line may be, and `align` is the side the lines sit against. `y` takes the
  place of `style.position`, which stays as the short form. The layout check's advice for captions names these.
- 22d44a7: Captions can box the word being said. `style={{ highlightBox: "#4aa3ff" }}` on `<Captions>` puts a filled, rounded box behind the current word with any word animation (`word-highlight`, `karaoke`, `word-by-word`); `highlight` stays the colour of its letters. The box takes no room of its own, so the line does not move as the box passes along it.
- b0f2630: Three components for a talking head cut into a short, and a way for a graphic to end with another element:
  
  - `TypeCard`: a card of big type that builds line by line. A line can sit on a pill, and a line can be struck out. Each line and strike takes `at="word:N"` (a word of the card's `anchor`) or an `offset` in seconds.
  - `QuoteCard`: a passage on a paper card with its source above it, and a marker that sweeps across the phrases you name, each at its own word or offset.
  - `Frame`: a rounded border around part of the picture, for the speaker under a card.
  - `duration={{ until: "id" }}` on any element outside a sequence: it lasts from its own start until that element ends. One that starts after its target has ended reports `INVALID_TIME_RANGE`.
  - Inside a `<Layer>`, the theme is now there as CSS variables (`var(--cc-accent)`, `var(--cc-heading)` and the rest). `Counter` read them already and was getting its fallbacks, so it now draws in the theme's heading font and text colour.
- 1f5e897: Parts for drawing a diagram inside a `<Layer>`: `DrawnLine` (a line that draws itself), `Label` (a word with a
  line to the point it names, named for the layout check), `CountUp` (a number that counts) and `Cells` (a row of
  cells with values). Each renders SVG and happens `at` a second of the video or `after` so many seconds of its
  layer, taking `over` seconds. `useProgress` and `progress` give the same timing to your own drawing.
- 9b27e92: Five new effects. `halftone` prints the picture as a dot screen, in one ink or in CMYK. `pixelate` makes a mosaic of the frame or of a box in it. `scanlines` adds the rolling lines of an old screen. `lightLeak` washes wandering warm light over the picture. `fractalNoise` blends evolving clouds of noise over it, as mist, texture or a moving background. They are shader effects with no CSS fallback, and every param keyframes. These names are now built in, so a file that declares its own effect under one of them needs to rename it.
- 06ad6a4: A font catalogue and `cutcraft fonts`. The kit exports `FONT_CATALOG` (the bundled families and a short list from Google Fonts, each with its category, weights, roles, a line on how it looks and its pairings), `findFont`, `fontsFor`, `nearestFont` and `fontFamily`. `cutcraft fonts` prints the list, filtered with `--for` and `--category`, and `--sheet` draws the families as one image setting your words. `googleFont()` now refuses a weight or an italic a listed family does not have, and the `font-available` lint gives the declaration to write.
- a12dd56: `font/use`, the action a font picker calls: it sets a family from the font catalogue on a title, the captions or a theme role. A Google family the file does not declare is loaded for the preview at once, and the fold writes its `googleFont()` declaration, adds the import and names it at the use site; a new weight of a declared family is added to its `weights`.
- 8cf667b: `audio/setDuck` takes a track role in `duck.under`, as a file does; it used to refuse anything but a track id. `<Multicam activeAngle>` and the `multicam/setActiveAngle` action are removed: nothing in the player or the export read the prop, so it changed nothing. A file that sets it now fails with an unrecognized key. `cutcraft inspect` names the element and the edge of a transition written with `on` and `edge`, where it printed `undefined → undefined`.
- 96b43b4: Free code runs on the video's clock in an export. The file's own `requestAnimationFrame` callbacks run once per frame with the frame's time, `performance.now()`, `Date.now()` and `new Date()` follow it, and `Math.random()` gives the same numbers in every export, so a loop written the usual way exports at the same speed on any machine. A Layer now holds CSS transitions and `element.animate()` animations at the layer's time as well as CSS animations, in the player and the export. `loadModule` takes a `scope` of names the file sees in place of globals. The `free-code-clock` lint warns about `Math.random()` (use `random(seed)`) and about `window.requestAnimationFrame`, `window.performance` and `window.Date`, which stay on the browser's clock.
- ad357a2: `cutcraft inspect video.tsx` reads a timeline back as text, with no browser: each track's elements with their seconds, the words each clip plays, effects, keyframes and cuts, or with `--json` as flat rows for `jq`. `--at` says what is on screen and heard at chosen moments, with effect values after keyframes. A moment is written the way the file is (`hook.end`, `x1`, `word:14`, `hook@word:14`, `shot:1`, `marker:intro`) or as time (`4.5`, `90f`, `2..6/0.5`). The kit exports what it is built from: `timelineRows`, `parseMoments`, `resolveMoments`, `playsOf` and `spokenWords`; `@cutcraft/render` exports `inspect` and `describeAt`.
- 4dbdc56: `cutcraft look --listen <stretch>` shows the sound of a stretch under the sheet's cells: the mix an export would write, as its level over time on a decibel scale, with a time scale, the words of the transcript where the cut says them, and silent stretches shaded. The stretch is `all`, a range such as `2..6` or `60f..180f`, or an element's id. The legend gains `listen`: the stretch, `peakDb` and `rmsDb` in dBFS (null for silence), `silences` (at least 0.3 s below -50 dBFS) and the words. The strip is kept in the frame cache under a key of the whole file and its media. `renderLook` takes `listen`, and the kit exports `listenRange`.
- fd5c06c: `cutcraft look video.tsx` draws many frames in one browser start, on one contact sheet with a JSON legend that says what each cell is. With no moments it skims the cut as an editor does (each clip's first frame, both sides of every cut, each overlay); `--at` takes the moments `inspect` takes, `--around <id>` follows a transition or an element coming in and going out, and `--without <id>` draws each frame with and without an effect, an adjustment or an overlay, side by side. The kit exports `aroundMoments` and `skimMoments`; `@cutcraft/render` exports `renderLook`.
- c425d5c: `narrate(script)` times a narration. In the script a word in square brackets is a cue, a number in round brackets
  a pause in seconds, and a name in curly brackets a cue with no word. It returns every word with its start and end,
  the subtitles a phrase at a time, the cues by name (`at(name)` throws on a name the script does not have) and the
  duration. The times come from a speaking pace, or from the transcript of a recorded voice.

### Patch Changes

- 98d38b7: The ready-made components take `duration={{ until: "id" }}`, as plain elements do. A `LowerThird`, `TypeCard` or any other component can now last until a clip ends, and every one of its parts ends there, however late the part comes in. Before, a component refused the prop with "duration Invalid input".
- 4fb0ebb: `cutcraft look --motion <stretch>` draws a short stretch as a strip of small frames at even steps, each labelled
  with its time, so a move, an entrance or a transition can be read left to right without a render. The stretch is a
  range or an element's id; `--step` sets the seconds between frames, twelve frames without it.
- f22acb1: The resolver no longer places anything at a time that is not a number, before zero, backwards or for ever, whatever the file says. Found by a new suite of 129 pinned edge cases and 3,000 timelines made at random:
  
  - A prop the schema refuses (a speed of 0, a negative duration or start, a prop the element does not take) is reported as before and then left out, so the element takes its default instead of the refused value.
  - A transition that does not fit is reported and held to what its clips have. Two transitions that would meet inside a short clip are now reported (`INSUFFICIENT_HANDLES`), and two transitions in a row report `NOT_ADJACENT`.
  - A `duration="fill"` clip or music bed shorter than the video stops where its file ends and reports `TRIM_PAST_SOURCE`, instead of claiming to play past the end of the file.
  - `duration={{ match }}` on an element that fills now takes its length instead of reporting a cycle.
  - A `<Freeze>` that starts after its clip has ended no longer lengthens the clip, and reports `INVALID_TIME_RANGE`. A speed key or a hold written past its clip's end no longer lengthens the video.
  - An element with no length no longer makes the video longer.
- 3da2e2a: `TypeCard` no longer confuses `cutcraft --check-layout`. The line a card part shows used to force itself visible, so it stayed on screen while the check hid everything else to measure one element, and every card was reported as covering the captions. A part now only hides the other lines, and a strike leaves its line's letters clear instead.

## 0.3.0

### Minor Changes

- e1e5bdb: Ready-made components: `LowerThird`, `Callout`, `Badge`, `Counter`, `ProgressBar`, `Arrow`, `Highlight` and
  `Background`, exported from `@cutcraft/kit`. Each is an ordinary function that returns the kit's own elements
  (titles, shapes, SVG, a layer for the counter), so it is timed by words, styled by the theme and checked like any
  element; its parts get ids from its own (`lt-name`). Editing a part in the editor writes that use out into the file as
  plain elements, imports included. `COMPONENTS` lists them with their props schemas. They replace the most used
  `<Graphic>` kinds, which stay deprecated.
- ee3a1e9: Declarations are values, not registrations: no global store. Breaking.
  
  - `effect()` and `transition()` return the definition itself (`EffectRef`, `TransitionRef`: `{ name, definition }`), and `font()` and `googleFont()` return a `FontRef` that stands for its family wherever a string goes (a `font` prop, a theme, a CSS `fontFamily`, a template string, JSON). Nothing is registered anywhere.
  - A tree's effects, transitions and fonts are collected from the elements that use them (however deep in a prop, and in a Layer's free code) and from the module's exports. Each file's declarations are its own, so many players on one page never share them, and a file imported directly (a bundled preview) needs no wrapper.
  - An effect or font the editor should offer before anything uses it must be exported. The `declaration` lint warns on one that is neither exported nor used.
  - The editor's fold writes a declared effect, transition or font back as its identifier: `type={glitch}`, `font={titan}`.
  - Two different definitions under one name are an error.
  - Removed: `collectShaders`, `shadersOf`, `MODULE_SHADERS`, `collectFonts`, `fontsOf`, `MODULE_FONTS`, and the stores on `globalThis`.
- 6ac1d41: A typed API for effects and transitions. Breaking:
  
  - `defineEffect()` and `defineTransition()` are now `effect()` and `transition()`. They take the same options and return the effect typed with its params schema (`EffectRef<P>`, `TransitionRef<P>`).
  - `<Effect>` and `<Transition>` check `type` and `params` at compile time: a built-in type against its registry schema, and what `effect()` or `transition()` returned against its own schema. A plain string is no longer accepted for a file's own effect; pass what `effect()` returned.
  - Shaders read their params as `params.<name>`, not by the bare name, so a param can take any name, a GLSL function's or an input's included. `effect()` refuses a shader that reads a param its schema does not declare. Update a shader by writing `params.` before each param it reads.
  - `longShadow`'s `reach` param is now `length`.
  - The `declaration` lint accepts `passes` as well as `shader`.
- ab5cec4: Colour effects for footage, drawn as shaders: `exposure` (stops), `vibrance`, `whiteBalance` (temperature and tint as a chromatic adaptation), `shadowsHighlights` (a local adjustment over a blurred luminance), `duotone` and `curves` (monotone splines through points, per channel). Effect params may now hold lists of points. A built-in shader can compute tables from its params (`ShaderDefinition.tables`). These names are now built in, so a file that declares its own effect under one of them (`duotone`, for example) needs to rename it.
- 4756002: Footage tools drawn as shaders: `colorKey` (green screen, with spill suppression), `regionBlur` (a feathered, rounded box, or everything but it), `cornerPin` (a perspective pin to four corners), `zoomBlur` and `chromaticAberration` (linear or radial). Keyframes now move lists of numbers element by element, so a box or a corner follows its keys. These names are now built in, so a file that declares its own effect under one of them needs to rename it.
- 1fdf930: Breaking: a keyframe that animates an effect param goes inside the `<Effect>`, with `param`: `<Effect id="plate" type="regionBlur"><Keyframe id="k1" param="box" at={0} value={[…]} /></Effect>`. `property="effect.<id>.<param>"` is removed, and its error shows the nested form. The resolver now checks that `param` is one of the effect's params and that the value fits it, where before a typo or a renamed effect detached the animation silently. `keyframe/add` takes `param` (on the effect) or `property` (on the element).
- bedea28: Grade with a LUT: `<Effect type="lut" params={{ src: "asset:look", amount }} />` reads a 3D `.cube` file, a new manifest asset kind `lut` that `cutcraft add look.cube` checks and lists. An effect param that names an asset is read by the shader as a texture (a LUT as a `sampler3D`, an image as a `sampler2D`), loaded before the frame that needs it. `parseCube` reads the format.
- 5b492f0: One way to do each thing. Breaking:
  
  - Temperature and tint are only `whiteBalance`. `<ColorGrade>` is removed, along with its `colorGrade.temperature` and `colorGrade.tint` keyframe paths and the `colorGrade/set` action. So are the `temperature` and `tint` effect types. Each old form is an error naming `<Effect type="whiteBalance" …>`. `whiteBalance` gains a CSS fallback where WebGL is missing (the old temperature and tint filters).
  - Every blur reads `radius` the same way. `blur` stays a CSS filter, and on an element whose effects run as shader passes it is the same Gaussian the shader effects use. A blur's `radius` is the Gaussian's standard deviation in pixels everywhere, as CSS reads it. `glow`, `regionBlur` and `shadowsHighlights` (and `bevel`'s `size`) used three times that: their defaults are now 7, 7, 10 and 1.5, and a radius written for them before blurs three times as much. Divide it by 3.
  - The built-ins share one Gaussian, which samples every pixel out to three deviations where the old one took 33 taps, so large blurs no longer band. It costs more: in the export without a GPU, `regionBlur` and `shadowsHighlights` render about 1.8x slower at the same look.
- 7e411a0: Effects can run several shader passes: `effect({ passes: [...] })` runs each in order, reading the pass before as `image` and the element's picture as `original`. `levels` is now drawn by a built-in shader, so its `gamma` renders; where there is no WebGL it falls back on the old filter. `ShaderDefinition.shader` is now `passes`, and a player `ShaderPass` carries `sources`.
- 7db2452: Every built-in effect and transition is now one entry in a registry (`EFFECTS`, `TRANSITIONS`, with `EFFECT_FAMILIES` and `TRANSITION_FAMILIES`): its name, a strict params schema, and how it draws. The type lists, shader lists, transition params and CSS fallbacks are derived from it, and the reference gains a generated page of every effect and transition with its params. Breaking: the CSS-type effects (`brightness`, `blur`, `shadow`, `vignette`…) now have params schemas, so an out-of-range or unknown param is an error, and the undocumented aliases `value` and `intensity` are gone (use `amount`, `radius` or `angle`). An unknown param on a shader effect is now an error too, where it was dropped.
- e7301f9: One scale per kind of value in the built-in effects and transitions (the reference's new Units table). Breaking: the old values are errors.
  
  - Strengths and shares are fractions. `brightness`, `contrast`, `saturation`, `temperature` and `tint` take `amount` -1..1 (was -100..100). `grayscale`, `sepia` and `invert` take 0..1 (default 1). `vignette` and `grain` take 0..1 (defaults 0.5 and 0.2). `whiteBalance` takes `temperature` and `tint` -1..1. `<ColorGrade>` takes `temperature` and `tint` -1..1.
  - `shadow` takes `radius` (was `blur`), and `color` as `#rgb`/`#rrggbb` with `opacity` 0..1 (was any CSS colour).
  - Pixel distances are named as such: `zoomBlur` `length` and `chromaticAberration` `distance` (both were `amount`), and `filmBurn` `size` (was `scale`).
  - Angles are degrees clockwise from up: `chromaticAberration` (default 90), `longShadow` (default 135) and `blinds` (default 90) used to count from the right.
  - `bevel` `intensity` is now `amount`, since `intensity` is kept for gains.
  - `clockWipe` `direction` is `"clockwise"`, `"counterclockwise"` or `"both"` (was 1, -1, 0). Its `feather` in degrees is now `softness`, a share of the turn. `blinds` and `pixelDissolve` rename `feather` to `softness`, with the same values.
- 4e5e3cb: Effects that shape an element by its silhouette, for titles, shapes, stickers, Layers and clips: `glow` (with a threshold and a bloom in the element's own colours, and a CSS fallback where the shader cannot run), `outline`, `longShadow` and `bevel`. These names are now built in, so a file that declares its own effect under one of them needs to rename it.
- ac13aea: Six built-in transitions drawn as shaders: `iris` (circle, polygon or star), `clockWipe`, `blinds`, `filmBurn`, `pixelDissolve` and `zoom`. They crossfade where there is no WebGL and fade at an overlay's edge. These names are now built in, so a file that declares its own transition under one of them needs to rename it.
- 5d99f1b: A faster Gaussian for every built-in blur.
  
  - `glow`, `regionBlur`, `shadowsHighlights` and `bevel` draw their blur at half size from 4 px of σ and at a quarter from 8 px, and read it back full size through linear filtering.
  - Each direction takes its taps in linear pairs once the colour is premultiplied, halving the reads.
  - `regionBlur`, unless inverted, blurs only its box and as far as the blur reaches.
  - CSS's `blur()` and `drop-shadow()`, run as passes, stay full size so the frame's edge fades as CSS's does, and take the paired taps.
  - Built-in definitions can now plan their passes as `steps` (a size and a region per pass). The kit exports `gaussSteps`, `gaussSources` and `gaussScale` in place of `GAUSS_PASS`.
  - In the export without a GPU, the `regionBlur` and `shadowsHighlights` bench goes from 0.6 to 6.6 fps.
- 40b5a9f: A run of colour effects is drawn as one pass.
  
  - Consecutive built-in colour effects on an element run as one shader that calls each one's function in file order: `levels`, `lut`, `exposure`, `vibrance`, `whiteBalance`, `duotone`, `curves`, and on the shader path brightness, contrast, invert, saturation, hue, sepia and grayscale. That is one read and one write of the picture instead of one per effect, with no 8-bit rounding between them.
  - A run breaks at any other effect, and at a second `whiteBalance` or `curves`.
  - Against separate passes, the result differs by at most 3 levels.
  - The kit exports `fusedColourSource`, and colour transforms keep their function in parts (`ColourFunction`: `fn`, `uses`, `prelude`, `code`).
- 3847609: A faster `outline` and `zoomBlur`, and a `glow` that keeps its element's colours.
  
  - `outline` measures the exact distance to the silhouette in a pass down each column and one along each row: about 34 reads per pixel at the default width instead of 288. Its corners round as a circle's, and its outer edge fades over one pixel.
  - `zoomBlur` takes one sample per pixel of each pixel's streak, at least 2 and at most `samples`.
  - `glow` is a halo under its element, which keeps its own colours inside; it used to add its light on top, washing a white glow on white text to a flat blob. With a `threshold` it also blooms over the bright parts, as before on footage.
  - In the export without a GPU, outline and glow on footage go from 0.3 to 3.0 fps, and a zoom blur from 2.8 to 3.5.
- fa7c303: `<Graphic>` and its 34 kinds are removed (decision 0024), with the `graphic/*` actions, the `graphic-props` and
  `deprecated-graphic` lint rules and `graphicControls`. A file that still uses `<Graphic>` gets an error naming what
  replaces it. Use the components in `@cutcraft/kit`:
  
  | Was | Now |
  |---|---|
  | `kind="lower-third"`, `-card`, `-split` | `<LowerThird>` |
  | `callout`, `speech-bubble` | `<Callout>` |
  | `badge`, `pill` | `<Badge>` |
  | `counter` | `<Counter>` |
  | `progress-bar` | `<ProgressBar>` |
  | `arrow`, `curved-arrow`, `hand-arrow` | `<Arrow>` |
  | `underline`, `marker`, `circle-scribble`, `strike` | `<Highlight>` |
  | `gradient-`, `dots-`, `grid-background` | `<Background>` |
  
  The other kinds have no component: draw them as free code (`<Svg>`, `<Motion>`, a `<Layer>`).
  
  `<Sticker src>` takes an image asset; `icon:` stickers are removed, and Lucide with them (about 0.7 MB out of every
  bundle). Draw an icon as an `<Svg>`. `@cutcraft/graphics` now holds only the free-code libraries
  (`installFreeCodeLibraries`, `/three`, `/motion`), and the kit and the player no longer depend on it.
  `GRAPHIC_ANIMATIONS` is renamed `ENTRANCE_ANIMATIONS`: they are every overlay's entrances and exits.
  
  The export also waits for an overlay's image or SVG file before it captures a frame, so a still of a sticker shows
  the image rather than nothing.
- e9107f6: Effects that change nothing are skipped, and the built-ins share their shapes.
  
  - A built-in effect at its neutral params is not drawn: `exposure` at 0 stops, `levels` at 0, 1 and 1, an amount at 0, a curve on the diagonal. If those are an element's only shader effects, it stays off the WebGL path. The check uses each frame's params, so a keyframed amount is skipped only where it passes through neutral. Each neutral is proven by a render test, and the kit exports `isNeutral(type, params)`.
  - The colour built-ins (`levels`, `lut`, `exposure`, `vibrance`, `whiteBalance`, `duotone`, `curves`) are colour transforms: a function of colour alone, kept on the definition so a run of them can be fused later.
  - `iris`, `clockWipe`, `blinds` and `pixelDissolve` are mask transitions.
  - Output is unchanged.
- 41e9b6b: Shader uniforms are typed by the params schema, once, instead of by each frame's values.
  
  - A `z.enum` param now reaches a shader as an `int`, and the shader names its options: `params.direction == params.direction.clockwise`. `clockWipe` uses this, and the built-in `uniforms` hook is gone.
  - `effect()` refuses a shader that reads a param no uniform can carry (a list of points, say), naming it.
  - Definitions carry `uniforms` (`ShaderUniform`, `uniformsOf`), and passes carry them to the player.
  - The player builds a program's text once, keeps it by source and declared types, and looks up each uniform's location once.
  - Shared GLSL in the built-ins is a module, placed once with its dependencies.
  - The output is unchanged.

### Patch Changes

- 8a0f302: Vignette and grain on an `<Adjustment>` are drawn: they darken and speckle everything beneath it, before its other
  effects, in the preview and the export. Before, they drew nothing. On an overlay (a title, shape, SVG, sticker,
  graphic or layer) they are still not drawn; the `not-rendered` lint now reports that, and the preview warns once.

## 0.2.0

### Minor Changes

- [#13](https://github.com/prefix-tree/cutcraft/pull/13) [`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f) Thanks [@bsnisar](https://github.com/bsnisar)! - The kit's `holdLayerFrame` lets an engine layer (three.js, Motion) hold a frame until it has drawn it, so an export
  never captures a frame half drawn. `loadVideo` returns the file's `source`, which the export page loads.

- [#18](https://github.com/prefix-tree/cutcraft/pull/18) [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a) Thanks [@bsnisar](https://github.com/bsnisar)! - Fonts are declared in the file: `font({ family, src: "asset:brand" })` for a font file and `googleFont("Titan One")` for a Google Fonts family, each returning the family to pass as a `font` prop, a theme font or a CSS `fontFamily`. The player and the export load every declared face (`state.fonts`), WOFF2 included; the export downloads Google faces once into `~/.cache/cutcraft/fonts`, so later exports need no network. The `declaration` lint checks the calls, and `font-available` takes declared families as available.

- [#14](https://github.com/prefix-tree/cutcraft/pull/14) [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Graphic>` and its kinds are deprecated and will be removed in a later release. The lint warns on each one with the
  new `deprecated-graphic` rule, and `Graphic`, `GRAPHIC_KINDS` and `graphicControls` are marked `@deprecated`. Draw the
  same things with `<Motion>`, `<Three>` or a `<Layer>`; the examples and the brand-spot recipe show how.

- [#20](https://github.com/prefix-tree/cutcraft/pull/20) [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Composition motionBlur={{ shutterAngle: 180, samples: 8 }}>` gives the export a film camera's motion blur: the export draws each frame `samples` times across the open shutter and averages them, for footage, titles, Motion, three.js and free code alike. The preview stays sharp. The player's `exactTime` option re-renders overlays for every change of time, which the export uses for the moments inside a frame.

- [#24](https://github.com/prefix-tree/cutcraft/pull/24) [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e) Thanks [@bsnisar](https://github.com/bsnisar)! - Effects the file declares (`defineEffect()`) work on overlays too: titles, shapes, SVG, stickers and any `<Layer>`, including `<Three>` and `<Motion>`. The player draws the overlay into a canvas with HTML-in-Canvas, runs the shaders over it and shows the result; a browser without the feature shows the overlay without them and warns, and the export always draws them. `<Effect>` and `<Keyframe>` written inside a `<Layer>` are collected as its children, apart from its free code. A title with an `<Effect>`, `<Keyframe>` or `<Mask>` child keeps its text (it was lost before).

- [#21](https://github.com/prefix-tree/cutcraft/pull/21) [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22) Thanks [@bsnisar](https://github.com/bsnisar)! - What a file can say is what renders. Types and props no renderer drew are removed instead of accepted and warned about: 18 transition types (zoom, glitch, whipPan…), 6 video effects (sharpen, glow, motion-blur, radial-blur, chromatic-aberration, hue-saturation), `<AudioEffect>` and its actions, 16 title animation presets, the `bounce` caption animation, `emphasis`, 3D transform fields and keyframe properties, path keyframes, keyframe `handles` and `roving`, `chromaKey`, `stabilize`, `smoothSlowMo`, `interpolation`, `pitchCorrection`, `audioTrack`, `behindSubject`, `text3d`, an adjustment's `affects`, matte masks, colour wheels, curves, LUTs and HSL bands, and the wipe's `softness` and diagonal direction. A file that uses one now fails to resolve with the prop named, and TypeScript flags it in the editor. The OpenReel parity table and test are gone.

- [#21](https://github.com/prefix-tree/cutcraft/pull/21) [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22) Thanks [@bsnisar](https://github.com/bsnisar)! - Effects and transitions of your own: `defineEffect({ name, params, shader })` and `defineTransition({ name, params, shader })` declare a GLSL function and a zod schema for its params, and return the name to use as an `<Effect>` or `<Transition>` type. Params are validated and given defaults by the schema, keyframable, and passed to the shader as uniforms; transitions get both pictures and their progress. The player draws them with WebGL 2 in any browser, in the preview and the export. The `declaration` lint checks that they sit at the top of the file with a literal `name` and `shader`.

- [#7](https://github.com/prefix-tree/cutcraft/pull/7) [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Three>` and `<Motion>`: a Layer can hold a three.js scene (through React Three Fiber, or plain three.js in `setup`)
  or a Motion sequence, both on the video's clock, so they scrub both ways. `@cutcraft/graphics/libraries`
  (`installFreeCodeLibraries`), `@cutcraft/graphics/three` and `@cutcraft/graphics/motion` offer them to a cut file's
  free code. The export draws them as the player does. CSS animations inside a `<Layer>` are held at the layer's time:
  they count from the layer's start, pause with the video and scrub both ways.

- [#19](https://github.com/prefix-tree/cutcraft/pull/19) [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad) Thanks [@bsnisar](https://github.com/bsnisar)! - `cutcraft add talk.mp4` writes a media file's manifest entry, probed from the file, with its words from the transcript beside it (`talk.json` from Whisper or ElevenLabs, `talk.vtt`, `talk.srt`). `parseTranscript()` reads the same formats in code; words from subtitles are marked `estimated`. `--srt` and `--vtt` write the captions the cut plays as subtitle files, and `subtitles(state, …)` returns them in code. `<Captions breakAfter={["word:5"]}>` ends a line after the named words.

### Patch Changes

- [#26](https://github.com/prefix-tree/cutcraft/pull/26) [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c) Thanks [@bsnisar](https://github.com/bsnisar)! - The export runs the real player in headless Chrome, so it draws everything the preview draws: any CSS in a `<Layer>`,
  three.js, Motion, declared shaders and motion blur. The first export downloads Chrome for Testing into
  `~/.cache/cutcraft/browsers`; `cutcraft browser install` does it ahead of time, and `CUTCRAFT_CHROMIUM` names your own.
  The Node renderer is gone, and with it `skia-canvas`, `satori` and `node-av`: there is no native module to install.
  
  - Formats: MP4 (H.264 or AV1, with AAC), WebM (VP9 or AV1, with Opus), MP3, WAV, and PNG or JPEG stills. `.mov`
    (ProRes), HEVC and VP8 are no longer written.
  - The soundtrack is mixed and encoded in the page; the layout check measures each overlay as the export draws it.
  - `renderVideo`, `renderStill` and `checkLayout` take `source` (from `loadVideo`), which is required; `interiors`,
    `parallel`, `speed` and `hardware` are removed, and `tabs` renders pieces on several browser pages.
    `loadVideo` no longer returns `interiors`, and `OverlayFont` is now `FontFile`.
  - CLI: `--workers`, `--speed` and `--software` are removed; `--tabs` and `cutcraft browser install` are new;
    `--codec` takes `avc`, `vp9` or `av1`.
  - `@cutcraft/player` no longer exports `@cutcraft/player/overlays`, which only the Node renderer used.

- [#24](https://github.com/prefix-tree/cutcraft/pull/24) [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e) Thanks [@bsnisar](https://github.com/bsnisar)! - `defineEffect()` and `defineTransition()` refuse a param named after a GLSL built-in function (`mix`, `step`, `length`…) or a shader input, with a message naming it; before, the shader failed to compile with an unclear error.

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - Every package has a README written for its users, with links to the documentation site that work on npm.
  The graphics README leads with three.js and Motion, its deprecated `<Graphic>` kinds below.
- Updated dependencies [[`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f), [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e), [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a), [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd)]:
  - @cutcraft/graphics@0.2.0
