---
"@cutcraft/graphics": minor
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

`<Three>` and `<Motion>`: a Layer can hold a three.js scene (through React Three Fiber, or plain three.js in `setup`)
or a Motion sequence, both on the video's clock, so they scrub both ways. `@cutcraft/graphics/libraries`
(`installFreeCodeLibraries`), `@cutcraft/graphics/three` and `@cutcraft/graphics/motion` offer them to a cut file's
free code. The Node export leaves them out with a warning for now.
