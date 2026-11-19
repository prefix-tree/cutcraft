---
"@cutcraft/kit": minor
---

`useSeekable(create, deps?)` plays an animation from another library on the layer's clock: built once, paused, on the element its ref is on, seeked to the layer's seconds before every frame is painted, and reverted (or destroyed, or killed) when the layer ends or `deps` change. A GSAP timeline fits as it is; Anime.js and Lottie take a two-line wrapper. A `seek` that returns a promise holds the export's frame until it settles.
