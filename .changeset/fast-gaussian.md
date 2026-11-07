---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

A faster Gaussian for every built-in blur.

- `glow`, `regionBlur`, `shadowsHighlights` and `bevel` draw their blur at half size from 4 px of σ and at a quarter from 8 px, and read it back full size through linear filtering.
- Each direction takes its taps in linear pairs once the colour is premultiplied, halving the reads.
- `regionBlur`, unless inverted, blurs only its box and as far as the blur reaches.
- CSS's `blur()` and `drop-shadow()`, run as passes, stay full size so the frame's edge fades as CSS's does, and take the paired taps.
- Built-in definitions can now plan their passes as `steps` (a size and a region per pass). The kit exports `gaussSteps`, `gaussSources` and `gaussScale` in place of `GAUSS_PASS`.
- In the export without a GPU, the `regionBlur` and `shadowsHighlights` bench goes from 0.6 to 6.6 fps.
