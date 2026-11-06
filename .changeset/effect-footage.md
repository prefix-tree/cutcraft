---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Footage tools drawn as shaders: `colorKey` (green screen, with spill suppression), `regionBlur` (a feathered, rounded box, or everything but it), `cornerPin` (a perspective pin to four corners), `zoomBlur` and `chromaticAberration` (linear or radial). Keyframes now move lists of numbers element by element, so a box or a corner follows its keys. These names are now built in, so a file that declares its own effect under one of them needs to rename it.
