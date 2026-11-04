---
"@cutcraft/kit": minor
"@cutcraft/player": minor
"@cutcraft/render": minor
---

`<Composition motionBlur={{ shutterAngle: 180, samples: 8 }}>` gives the export a film camera's motion blur: the browser engine draws each frame `samples` times across the open shutter and averages them, for footage, titles, Motion, three.js and free code alike. A file with it exports through the browser on its own; `--engine node` leaves the blur out with a warning, and the preview stays sharp. The player's `exactTime` option re-renders overlays for every change of time, which the export uses for the moments inside a frame.
