---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

A run of colour effects is drawn as one pass.

- Consecutive built-in colour effects on an element run as one shader that calls each one's function in file order: `levels`, `lut`, `exposure`, `vibrance`, `whiteBalance`, `duotone`, `curves`, and on the shader path brightness, contrast, invert, saturation, hue, sepia and grayscale. That is one read and one write of the picture instead of one per effect, with no 8-bit rounding between them.
- A run breaks at any other effect, and at a second `whiteBalance` or `curves`.
- Against separate passes, the result differs by at most 3 levels.
- The kit exports `fusedColourSource`, and colour transforms keep their function in parts (`ColourFunction`: `fn`, `uses`, `prelude`, `code`).
