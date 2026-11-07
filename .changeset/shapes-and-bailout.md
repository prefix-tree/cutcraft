---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Effects that change nothing are skipped, and the built-ins share their shapes.

- A built-in effect at its neutral params is not drawn: `exposure` at 0 stops, `levels` at 0, 1 and 1, an amount at 0, a curve on the diagonal. If those are an element's only shader effects, it stays off the WebGL path. The check uses each frame's params, so a keyframed amount is skipped only where it passes through neutral. Each neutral is proven by a render test, and the kit exports `isNeutral(type, params)`.
- The colour built-ins (`levels`, `lut`, `exposure`, `vibrance`, `whiteBalance`, `duotone`, `curves`) are colour transforms: a function of colour alone, kept on the definition so a run of them can be fused later.
- `iris`, `clockWipe`, `blinds` and `pixelDissolve` are mask transitions.
- Output is unchanged.
