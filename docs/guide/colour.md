# Colour and grading

Footage rarely comes out of the camera looking the way the video should: too dark, a little blue, flat. This page
shows how to fix that in the file and then give the picture a look, with colour effects on a clip.

```tsx
<Clip id="interview" src="asset:interview">
  <Effect id="expose" type="exposure" params={{ stops: 0.5 }} />
  <Effect id="balance" type="whiteBalance" params={{ temperature: 0.15 }} />
  <Effect id="tone" type="curves" params={{ rgb: [[0, 0.03], [0.25, 0.22], [0.75, 0.8], [1, 1]] }} />
  <Effect id="pop" type="vibrance" params={{ amount: 0.3 }} />
</Clip>
```

Each colour effect is an `<Effect>` child. Put it on a clip to grade that clip, or on an `<Adjustment>` to grade
everything beneath it for a stretch of time. The effects run as shaders, the same in the preview and the export.

## Work in a colourist's order

Effects run in the order they appear in the file. Write them in the order a colourist works:

1. **Correct** the light and the white.
2. **Shape** the tones.
3. **Give it a look.**

Here is that grade on a real shot, laid over it from halfway through by an `<Adjustment>`:

<Example src="previews/guide/colour-grade" alt="A coffee shot, then the same shot brightened, warmed, given contrast and richer colour">

<<< @/../examples/showcase/guide/colour-grade.tsx

</Example>

Each effect also has its own page with a demo: see [Effects and transitions](/reference/effects/#colour).

## Animate a grade

Every param can be animated by a [`<Keyframe>`](/reference/elements/keyframe) inside the effect, naming the param:

```tsx
<Keyframe id="k1" param="stops" at={0} value={0} />
```

## Correct

These effects fix what the camera got wrong: too dark or bright, a colour cast, crushed shadows.

| Effect | Does | Params |
|---|---|---|
| [`exposure`](/reference/effects/exposure) | Brightens or darkens, the way a camera's exposure does. | `stops`, -5 to 5: +1 doubles the light |
| [`whiteBalance`](/reference/effects/whiteBalance) | Removes a colour cast. | `temperature`, -1 to 1: warms toward amber or cools toward blue, a stop of colour temperature each way. `tint`, -1 to 1: toward magenta or green |
| [`levels`](/reference/effects/levels) | Sets the black point and the white point, and bends the midtones. | `black`, `white`, 0 to 1. `gamma`: above 1 lifts the midtones |
| [`shadowsHighlights`](/reference/effects/shadowsHighlights) | Lifts the shadows or holds back the highlights. | `shadows`, `highlights`, -1 to 1, up to two stops each way. `radius`, 10 by default |

<Example src="previews/guide/white-balance" alt="The same shot cooled toward blue, then warmed toward amber">

<<< @/../examples/showcase/guide/white-balance.tsx

</Example>

::: details How they work
- `exposure` works where light is linear, so highlights keep their colour instead of washing out as they would under
  a plain brightness filter.
- `whiteBalance` adapts the picture as if it had been lit by a different daylight, so greys stay grey while the cast
  goes. Where WebGL is missing it falls back on a CSS approximation.
- `shadowsHighlights` judges each pixel by the light around it (`radius` is the blur's standard deviation in pixels),
  so a dark area lifts as a whole and keeps its detail and contrast.
:::

## Shape the tones

[`curves`](/reference/effects/curves) maps input brightness to output brightness through points you give. Use `rgb`
for all channels, or `red`, `green` and `blue` for each one.

```tsx
// A gentle S: deeper shadows, brighter highlights, and slightly warmer whites.
<Effect id="s" type="curves" params={{ rgb: [[0, 0], [0.25, 0.2], [0.75, 0.82], [1, 1]], blue: [[0, 0], [1, 0.95]] }} />
```

A point is `[input, output]`, both 0 to 1, written left to right. Two points `[[0, 0], [1, 1]]` change nothing, which
is each curve's default. The curve is a smooth monotone spline through the points, so it never overshoots between
them.

[`vibrance`](/reference/effects/vibrance) adds saturation to muted colours and leaves strong ones nearly alone
(`amount`, -1 to 1). It is kinder to skin than [`saturation`](/reference/effects/saturation).

## Give it a look

[`duotone`](/reference/effects/duotone) maps the picture's brightness from one colour (`dark`) to another (`light`),
mixed with the original by `amount`.

### A look from a LUT

A look made in a grading tool usually leaves it as a 3D LUT in a `.cube` file. Add it to the manifest like media, then
grade with the built-in [`lut`](/reference/effects/lut) effect:

```bash
npx uberscene add teal-orange.cube
```

```tsx
<Effect id="look" type="lut" params={{ src: "asset:teal-orange", amount: 0.8 }} />
```

`amount` mixes the graded colour with the original, from 0 to 1.

::: details How the LUT is read
The LUT is read with trilinear filtering. A table whose `DOMAIN_MIN` and `DOMAIN_MAX` are not 0 and 1 is resampled
onto 0 to 1 when it loads. 1D tables are not read.
:::

## Where there is no WebGL

The colour effects need WebGL, which every browser the player runs in has, and the export always has. Where it is
missing, `exposure`, `vibrance`, `levels` and `whiteBalance` fall back on a CSS filter that comes close, and the
others are left out with a warning.

::: warning
Effects that read a file (`lut`) work on clips, nested sequences and adjustments, not yet on overlays.
:::

## Next

- [Keying, blurs and pins](./footage-tools): green screen, hiding a face, a recording in a screen.
- [Your own effects](./custom-effects): write a shader when no built-in effect does it.
- [Effects and transitions](/reference/effects/): every effect and its params.
