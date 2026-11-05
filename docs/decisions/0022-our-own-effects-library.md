# 0022. Our own effects library, written from the techniques

## Context

CutCraft has 14 built-in `<Effect>` types: brightness, contrast, saturation, hue, temperature, tint, blur, shadow,
grayscale, sepia, invert and levels are CSS filters, and vignette and grain are two post passes. Levels ignores its
gamma because a CSS filter cannot express it. Anything else is custom GLSL: `defineEffect()` and `defineTransition()`
(decision 0018) declare a shader with a zod schema, `<Keyframe>` animates its params, and it runs on clips, nested
compositions, adjustments and overlays (through HTML-in-Canvas), in the preview and in the export alike (0021). Each
declared effect is one fragment shader over one picture. Several effects chain, but one effect cannot run more than
one pass and cannot read anything except its picture and its params.

Remotion shipped `@remotion/effects` (verified against its documentation and catalog on 2026-11-05). It has about 95
effects in seven groups: colour (levels, curves, LUT, white balance, vibrance, shadows and highlights, colour key and
more), blur and shadow (Gaussian, lens, zoom, progressive and region blur, glow, outline, drop and long shadows),
reveal (iris, radial and venetian wipes, film burn, tear), transform, distort (corner pin, fisheye, barrel, chromatic
aberration, page turn, sphere), stylize (halftone, pixelate, scanlines, paper, shine) and generators (fractal noise,
rain, snow, light leak, patterns). Effects are functions passed in an `effects` prop of `<Video>`, `<Img>`, `<Solid>`,
`<HtmlInCanvas>` and the shapes, written with 2D canvas, WebGL2 or WebGPU, and `createEffect()` builds custom ones.

The package is published as `UNLICENSED` and covered by the Remotion License, which charges companies above a size.
CutCraft is MIT so that every capability is free to use (see the README). Depending on the package would put that
licence on every user, and porting its code, however renamed or restructured, would still be a derivative of it.

The ideas themselves are not anyone's: what an effect is called, what it does to a picture, and the image-processing
technique behind it. Chroma keying, 3D LUTs, separable Gaussian blur, levels and curves, lens distortion and halftone
screens are decades old and described in textbooks, papers and colour-science references.

## Decision

- **We build our own effects library, about as broad as Remotion's where it matters for edited footage, and written
  from the published techniques.** No Remotion effect source is read, ported or paraphrased, and no shader is taken
  from a source whose licence is not compatible with MIT (Shadertoy's default CC BY-NC-SA among them). Each effect's
  file names its technique and reference in a comment. Parameter names and docs are written for our API, not copied.
- **A built-in effect is a built-in `defineEffect`.** It has a zod schema and GLSL ES 3.00 and runs in the same
  pipeline as a file's own effects. It is written the CutCraft way, as an element in the file:
  `<Effect id="grade" type="levels" params={{ black: 0.05, white: 0.95, gamma: 1.1 }} />` inside a `<Clip>`,
  `<Nested>`, `<Adjustment>` or overlay. So every param of every built-in can be animated with
  `<Keyframe property="effect.<id>.<param>">`, the editor builds its inspector from the schema, and the agent actions
  (`effect/add`, `effect/update`) need no new verbs.
- **The engine grows two things, and file authors get them too.**
  - **Passes:** an effect may declare several shaders, each reading the output of the one before (and the original
    picture). Separable blur, glow, outline, drop shadow and lens blur need this.
  - **Texture inputs:** a param can name an asset (`asset:look`), which the shader reads as a `sampler2D`. A LUT is a
    `.cube` file in the manifest, loaded once and uploaded as a 3D texture.
- **WebGL2 only.** The export's Chrome often has no GPU and draws WebGL with SwiftShader, where WebGPU is not
  dependable. One backend also keeps the preview and the export the same.
- **The CSS-filter types keep their names and params.** A type moves to a shader when CSS cannot do it (levels with
  gamma first), and its output must stay within a pixel test's tolerance of before.
- **The order, judged by edited footage first:**
  1. passes and texture inputs in the engine;
  2. colour for footage: exposure, levels with gamma, curves, LUT, vibrance, white balance, shadows and highlights,
     duotone;
  3. footage tools: colour key, region blur (a box that keyframes can move), corner pin, zoom blur, chromatic
     aberration;
  4. titles and overlays: glow, outline, an alpha drop shadow, long shadow, bevel;
  5. shader transitions: iris, radial wipe, blinds, film burn, pixel dissolve, zoom;
  6. a chosen few stylizers and generators: halftone, pixelate, scanlines, light leak, fractal noise. Generators that
     are backgrounds may become `<Graphic>` kinds instead.

## Consequences

- Grading real footage stops being a CSS approximation, and green screen, face and screen blurs, screen replacement
  and glows become one element each, free under MIT.
- Each effect needs its reference written down and a pixel test (a fixed input picture against expected values, in
  the browser suite), so a new effect is a small piece of work rather than a line in a filter table.
- Heavy shaders cost export time on machines without a GPU. Lens blur and turbulence on SwiftShader are slow; the
  docs say which effects are heavy, and the CI benchmark shows a regression.
- Built-in effect names become part of the vocabulary (decision 0002): adding one is cheap, renaming one is a breaking
  change.
- The library will not match Remotion's effect for effect. Novelty effects (shatter, flannel, thermal vision) are out
  of scope unless a user asks; a file can still declare its own.

## Alternatives

Depending on `@remotion/effects`: the fastest route, and it would put the Remotion License on CutCraft's users.
Porting or rewriting their effects to look different: a derivative work either way, and a risk to the MIT licence of
the whole project. Shipping only `defineEffect()` with recipes in the docs: no engine work, but every user rewrites
levels and blur, single-pass shaders cannot do blur or glow at all, and an agent writing GLSL per file is less
reliable than naming a built-in. WebGPU as Remotion allows: faster on a GPU, but unreliable in the CPU-only export.
