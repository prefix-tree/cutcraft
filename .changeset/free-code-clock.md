---
"@cutcraft/kit": minor
"@cutcraft/player": minor
"@cutcraft/render": minor
---

Free code runs on the video's clock in an export. The file's own `requestAnimationFrame` callbacks run once per frame with the frame's time, `performance.now()`, `Date.now()` and `new Date()` follow it, and `Math.random()` gives the same numbers in every export, so a loop written the usual way exports at the same speed on any machine. A Layer now holds CSS transitions and `element.animate()` animations at the layer's time as well as CSS animations, in the player and the export. `loadModule` takes a `scope` of names the file sees in place of globals. The `free-code-clock` lint warns about `Math.random()` (use `random(seed)`) and about `window.requestAnimationFrame`, `window.performance` and `window.Date`, which stay on the browser's clock.
