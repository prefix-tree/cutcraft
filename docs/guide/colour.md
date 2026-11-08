# Colour and grading

Footage rarely comes out of the camera looking the way the video should: too dark, a little blue, flat. The colour
effects fix that in the file, as `<Effect>` children of a clip, or of an `<Adjustment>` to grade everything beneath it
for a stretch of time. They run as shaders in the preview and the export alike, and every param can be animated by a
[`<Keyframe>`](/reference/elements/keyframe) inside the effect, naming the param:
`<Keyframe id="k1" param="stops" at={0} value={0} />`.

```tsx
<Clip id="interview" src="asset:interview">
  <Effect id="expose" type="exposure" params={{ stops: 0.5 }} />
  <Effect id="balance" type="whiteBalance" params={{ temperature: 0.15 }} />
  <Effect id="tone" type="curves" params={{ rgb: [[0, 0.03], [0.25, 0.22], [0.75, 0.8], [1, 1]] }} />
  <Effect id="pop" type="vibrance" params={{ amount: 0.3 }} />
</Clip>
```

Effects run in the order they appear in the file, so write them in the order a colourist works: correct the light and
the white first, then shape the tones, then give the picture its look. Here is that grade on a real shot, over it from
halfway through by an `<Adjustment>`:

<Example src="previews/guide/colour-grade" alt="A coffee shot, then the same shot brightened, warmed, given contrast and richer colour">

<<< @/../examples/showcase/guide/colour-grade.tsx

</Example>

Each effect also has its own page with a demo: see [Effects and transitions](/reference/effects/#colour).

## Correct

[`exposure`](/reference/effects/exposure) brightens or darkens by `stops`, from -5 to 5, the way a camera's exposure does: +1 doubles the light.
It works where light is linear, so highlights keep their colour instead of washing out as they would under a plain
brightness filter.

[`whiteBalance`](/reference/effects/whiteBalance) removes a colour cast. `temperature` (-1 to 1, a stop of colour temperature each way) warms the picture
toward amber or cools it toward blue; `tint` (-1 to 1) moves it toward magenta or green. It adapts the picture as if
it had been lit by a different daylight, so greys stay grey while the cast goes. Where WebGL is missing it falls back
on a CSS approximation.

<Example src="previews/guide/white-balance" alt="The same shot cooled toward blue, then warmed toward amber">

<<< @/../examples/showcase/guide/white-balance.tsx

</Example>

[`levels`](/reference/effects/levels) sets the black point and the white point (`black`, `white`, 0 to 1) and bends the midtones with `gamma`
(above 1 lifts them).

[`shadowsHighlights`](/reference/effects/shadowsHighlights) lifts the shadows or holds back the highlights (`shadows`, `highlights`, -1 to 1, up to two stops
each way). It judges each pixel by the light around it (`radius`, the blur's standard deviation in pixels, 10 by default), so a dark area lifts as
a whole and keeps its detail and contrast.

## Shape the tones

[`curves`](/reference/effects/curves) maps input brightness to output brightness through points you give, for all channels (`rgb`) and for each
(`red`, `green`, `blue`). A point is `[input, output]`, both 0 to 1, left to right. The curve is a smooth monotone
spline through the points, so it never overshoots between them. Two points `[[0, 0], [1, 1]]` change nothing, which
is each curve's default.

```tsx
// A gentle S: deeper shadows, brighter highlights, and slightly warmer whites.
<Effect id="s" type="curves" params={{ rgb: [[0, 0], [0.25, 0.2], [0.75, 0.82], [1, 1]], blue: [[0, 0], [1, 0.95]] }} />
```

[`vibrance`](/reference/effects/vibrance) adds saturation to muted colours and leaves strong ones nearly alone (`amount`, -1 to 1), which is kinder
to skin than [`saturation`](/reference/effects/saturation).

## Give it a look

[`duotone`](/reference/effects/duotone) maps the picture's brightness from one colour (`dark`) to another (`light`), mixed with the original by
`amount`.

### A look from a LUT

A look made in a grading tool usually leaves it as a 3D LUT in a `.cube` file. Add it to the manifest like media, then
grade with the built-in [`lut`](/reference/effects/lut) effect:

```bash
npx cutcraft add teal-orange.cube
```

```tsx
<Effect id="look" type="lut" params={{ src: "asset:teal-orange", amount: 0.8 }} />
```

`amount` mixes the graded colour with the original, from 0 to 1. The LUT is read with trilinear filtering; a table
whose `DOMAIN_MIN` and `DOMAIN_MAX` are not 0 and 1 is resampled onto 0 to 1 when it loads. 1D tables are not read.

## Where there is no WebGL

The colour effects need WebGL, which every browser the player runs in has, and the export always has. Where it is
missing, `exposure`, `vibrance`, `levels` and `whiteBalance` fall back on a CSS filter that comes close, and the others are left out
with a warning. Effects that read a file (`lut`) work on clips, nested sequences and adjustments, not yet on overlays.
