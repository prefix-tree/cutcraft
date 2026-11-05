# Keying, blurs and pins

The everyday work on footage, as `<Effect>` children of a clip: take out a green screen, hide a face or a screen, put
a recording into a screen filmed at an angle, and two camera looks. They run as shaders in the preview and the export
alike. Every param can be animated with a [`<Keyframe>`](/reference/elements/keyframe), lists included: a box or a
corner moves smoothly between two keys, which is how a blur follows a face or a pin follows a screen.

## Green screen

`colorKey` makes the key colour transparent, so the tracks beneath show through. It compares colour, not brightness,
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

`regionBlur` blurs inside a box: `[x, y, width, height]` as fractions of the frame from its top left. `radius` is the
blur in pixels, `feather` fades it in over that many pixels inside the edge, and `roundness` (0 to 1) rounds the
corners up to a circle or a pill. `inverted` blurs everything except the box.

```tsx
<Clip id="street" src="asset:street">
  <Effect id="plate" type="regionBlur" params={{ box: [0.42, 0.66, 0.12, 0.06], radius: 30, roundness: 0.3 }} />
  <Keyframe id="p1" property="effect.plate.box" at={0} value={[0.42, 0.66, 0.12, 0.06]} />
  <Keyframe id="p2" property="effect.plate.box" at={2.5} value={[0.3, 0.7, 0.14, 0.07]} />
</Clip>
```

To hide something, make the box larger than it, so nothing recognisable sits in the feathered edge.

## A recording in a screen

`cornerPin` maps the picture onto four corners, `topLeft`, `topRight`, `bottomRight` and `bottomLeft`, each `[x, y]`
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

`zoomBlur` smears the picture toward `center` (`[x, y]`), more the further from it, up to `amount` pixels at the
corners; `samples` (up to 64) trades smoothness for speed. Keyframe `amount` down from a high value for a punch-in.

`chromaticAberration` splits red and blue apart by `amount` pixels, along `angle` (degrees, 0 is across), or with
`radial` outward from `center`, growing toward the edges as a lens fringes.

## Where there is no WebGL

These effects need WebGL, which every browser the player runs in has, and the export always has. Where it is missing
they are left out, with a warning.
