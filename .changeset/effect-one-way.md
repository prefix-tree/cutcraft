---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

One way to do each thing. Breaking:

- Temperature and tint are only `whiteBalance`. `<ColorGrade>` is removed, along with its `colorGrade.temperature` and `colorGrade.tint` keyframe paths and the `colorGrade/set` action. So are the `temperature` and `tint` effect types. Each old form is an error naming `<Effect type="whiteBalance" …>`. `whiteBalance` gains a CSS fallback where WebGL is missing (the old temperature and tint filters).
- Every blur reads `radius` the same way. `blur` stays a CSS filter, and on an element whose effects run as shader passes it is the same Gaussian the shader effects use. A blur's `radius` is the Gaussian's standard deviation in pixels everywhere, as CSS reads it. `glow`, `regionBlur` and `shadowsHighlights` (and `bevel`'s `size`) used three times that: their defaults are now 7, 7, 10 and 1.5, and a radius written for them before blurs three times as much. Divide it by 3.
- The built-ins share one Gaussian, which samples every pixel out to three deviations where the old one took 33 taps, so large blurs no longer band. It costs more: in the export without a GPU, `regionBlur` and `shadowsHighlights` render about 1.8x slower at the same look.
