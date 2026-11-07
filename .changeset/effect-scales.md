---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

One scale per kind of value in the built-in effects and transitions (the reference's new Units table). Breaking: the old values are errors.

- Strengths and shares are fractions. `brightness`, `contrast`, `saturation`, `temperature` and `tint` take `amount` -1..1 (was -100..100). `grayscale`, `sepia` and `invert` take 0..1 (default 1). `vignette` and `grain` take 0..1 (defaults 0.5 and 0.2). `whiteBalance` takes `temperature` and `tint` -1..1. `<ColorGrade>` takes `temperature` and `tint` -1..1.
- `shadow` takes `radius` (was `blur`), and `color` as `#rgb`/`#rrggbb` with `opacity` 0..1 (was any CSS colour).
- Pixel distances are named as such: `zoomBlur` `length` and `chromaticAberration` `distance` (both were `amount`), and `filmBurn` `size` (was `scale`).
- Angles are degrees clockwise from up: `chromaticAberration` (default 90), `longShadow` (default 135) and `blinds` (default 90) used to count from the right.
- `bevel` `intensity` is now `amount`, since `intensity` is kept for gains.
- `clockWipe` `direction` is `"clockwise"`, `"counterclockwise"` or `"both"` (was 1, -1, 0). Its `feather` in degrees is now `softness`, a share of the turn. `blinds` and `pixelDissolve` rename `feather` to `softness`, with the same values.
