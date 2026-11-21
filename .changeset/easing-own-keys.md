---
"@uberscene/kit": patch
---

An easing name inherited from `Object` (`toString`, `constructor`, `valueOf`) is no longer taken for an easing.
`ease()`, `interpolate()` and the diagram parts' `progress()` read it off every object and returned a string or
`null`, which broke the frame; they now ease linearly (`progress()` with its own `easeInOut`), as they already did for
any other unknown name.
