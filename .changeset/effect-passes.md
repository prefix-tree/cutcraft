---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Effects can run several shader passes: `effect({ passes: [...] })` runs each in order, reading the pass before as `image` and the element's picture as `original`. `levels` is now drawn by a built-in shader, so its `gamma` renders; where there is no WebGL it falls back on the old filter. `ShaderDefinition.shader` is now `passes`, and a player `ShaderPass` carries `sources`.
