---
"@uberscene/kit": minor
---

The schemas no longer take props that were never drawn. Each of these was accepted and silently ignored; it is now an error that names the prop, so delete it from the file (the picture does not change):

- `fit` on `<Title>`, `<Shape>` and `<Sticker>` (it still fits a `<Clip>`, a `<Nested>` and an `<Svg>`);
- `blendOpacity` on `<Title>`, `<Shape>`, `<Svg>` and `<Sticker>` (it still applies to a `<Clip>` and a `<Nested>`; elsewhere use `transform.opacity`);
- `transform` on `<Adjustment>`, which always filters the whole frame;
- `expansion` and `easing` on `<Mask>`, and keys on a mask;
- `unit` and `params` in a `<Title>`'s `animation`;
- `spread` and `inset` in the `shadow` of a `<Title>` and of a `<Captions>` style (a `<Shape>`'s shadow keeps `spread`).

`MASK_EASINGS`, `ANIMATION_UNITS` and the object-shaped `vec3Schema` are gone with them. The `clip/setBlend` action sets an `opacity` only on a clip or a nested sequence, and `transform/update` no longer applies to an adjustment.

The capability table matches what the resolver and the player do: a `<Multicam>` belongs on a track, not in the composition; an `<Adjustment>` has no source to trim; an `<Audio>` takes speed keys and freezes, which already worked.

The reference now says what a key's `easing` does: it shapes the move from that key to the next one (on `speed` too), so the easing on the last key of a move is not used. The player has always worked this way; only the description was the other way round.
