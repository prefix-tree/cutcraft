# Keying, blurs and pins

The everyday work on footage, as `<Effect>` children of a clip: take out a green screen, hide a face or a screen, put
a recording into a screen filmed at an angle, and two camera looks. They run as shaders in the preview and the export
alike. Every param can be animated by a [`<Keyframe>`](/reference/elements/keyframe) inside the effect, lists included: a box or a
corner moves smoothly between two keys, which is how a blur follows a face or a pin follows a screen.

## Green screen

[`colorKey`](/reference/effects/colorKey) makes the key colour transparent, so the tracks beneath show through. It compares colour, not brightness,
so the shadowed and lit parts of the screen go together.

```tsx
<Track id="background">
  <Clip id="studio" src="asset:studio" />
</Track>
<Track id="presenter">
  <Clip id="talk" src="asset:greenscreen">
    <Effect id="key" type="colorKey" params={{ color: "#18c43a", tolerance: 0.3, softness: 0.1, spill: 0.6 }} />
  </Clip>
</Track>
```

Pick `color` from the screen in the footage, not pure green. Raise `tolerance` until the screen is gone, then
`softness` until hair and edges stop looking cut out. `spill` (0 to 1) removes the green light the screen bounces onto
the subject.

## Hiding a face, a plate or a screen

[`regionBlur`](/reference/effects/regionBlur) blurs inside a box: `[x, y, width, height]` as fractions of the frame from its top left. `radius` is the
blur, the Gaussian's standard deviation in pixels as CSS `blur()` reads it, `feather` fades it in over that many pixels inside the edge, and `roundness` (0 to 1) rounds the
corners up to a circle or a pill. `inverted` blurs everything except the box.

```tsx
<Clip id="street" src="asset:street">
  <Effect id="plate" type="regionBlur" params={{ box: [0.42, 0.66, 0.12, 0.06], radius: 10, roundness: 0.3 }}>
    <Keyframe id="p1" param="box" at={0} value={[0.42, 0.66, 0.12, 0.06]} />
    <Keyframe id="p2" param="box" at={2.5} value={[0.3, 0.7, 0.14, 0.07]} />
  </Effect>
</Clip>
```

To hide something, make the box larger than it, so nothing recognisable sits in the feathered edge.

## A recording in a screen

[`cornerPin`](/reference/effects/cornerPin) maps the picture onto four corners, `topLeft`, `topRight`, `bottomRight` and `bottomLeft`, each `[x, y]`
as fractions of the frame. The picture is warped in perspective, as a flat screen seen at an angle is, and outside its
four corners it is transparent. Put the recording on a track above the shot of the device:

```tsx
<Track id="shot">
  <Clip id="laptop" src="asset:laptop-on-desk" />
</Track>
<Track id="screen">
  <Clip id="demo" src="asset:screen-recording">
    <Effect
      id="pin"
      type="cornerPin"
      params={{ topLeft: [0.31, 0.22], topRight: [0.68, 0.25], bottomRight: [0.66, 0.6], bottomLeft: [0.33, 0.58] }}
    />
  </Clip>
</Track>
```

When the camera moves, keyframe each corner.

## Camera looks

[`zoomBlur`](/reference/effects/zoomBlur) smears the picture toward `center` (`[x, y]`), more the further from it, up to `length` pixels at the
corners; `samples` (up to 64) trades smoothness for speed. Keyframe `length` down from a high value for a punch-in.

[`chromaticAberration`](/reference/effects/chromaticAberration) splits red and blue apart by `distance` pixels, along `angle` (degrees clockwise from up, so the
default 90 is across), or with
`radial` outward from `center`, growing toward the edges as a lens fringes.

## Stylize

[`halftone`](/reference/effects/halftone) prints the picture as dots on a screen of `size`-pixel cells turned by
`angle`. `mode: "mono"` prints `ink` on `paper` by brightness; `mode: "cmyk"` separates it into four inks, each on its
own screen at the classic angles, as a magazine page is printed. `amount` mixes the print over the picture.

[`pixelate`](/reference/effects/pixelate) turns the picture into a mosaic of `size`-pixel cells. Give it a `box` and only
that part is pixelated, so it hides a face or a plate the way [`regionBlur`](/reference/effects/regionBlur) does, but
as a coarse mosaic:

```tsx
<Clip id="street" src="asset:street">
  <Effect id="hide" type="pixelate" params={{ size: 18, box: [0.62, 0.1, 0.2, 0.35], feather: 6 }} />
</Clip>
```

[`scanlines`](/reference/effects/scanlines) lays a dark band every `spacing` pixels over the picture, `thickness` of the
gap wide and `intensity` deep, for an old screen. `speed` rolls them by that many pixels a second, and `angle` turns
them.

## Light and texture

[`lightLeak`](/reference/effects/lightLeak) washes soft blooms of `color` over the picture, wandering as the video plays
(`evolution` sets how fast) and only ever lightening it. On an `<Adjustment>` it covers everything beneath, cuts and
titles included; change `seed` for another pattern.

```tsx
<Track id="look" layout="free">
  <Adjustment id="leak" start={0} duration={12}>
    <Effect id="l" type="lightLeak" params={{ intensity: 0.5, color: "#ff9a4d" }} />
  </Adjustment>
</Track>
```

[`fractalNoise`](/reference/effects/fractalNoise) draws clouds of noise, about `size` pixels across with `octaves`
layers of finer detail, that change in place over time. `blend` and `opacity` set how they meet the picture: `screen`
gives mist or smoke over footage, `overlay` or `softLight` a texture. On a full-frame `<Shape>` with `blend: "normal"`
it is a moving background.

These looks change the picture's pixels, so they cost more to export without a GPU than a colour effect does: a CMYK
`halftone` and `fractalNoise` with many octaves are the heaviest.

## Where there is no WebGL

These effects need WebGL, which every browser the player runs in has, and the export always has. Where it is missing
they are left out, with a warning.
