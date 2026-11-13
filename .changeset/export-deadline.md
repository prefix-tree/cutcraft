---
"@cutcraft/render": minor
---

An export no longer hangs in silence. Each frame has a deadline (60 s; `--frame-timeout <s>`, or `frameTimeout` on `renderVideo`, `renderStill`, `renderLook` and `checkLayout`), and a frame that outlasts it fails the command with the frame, its time and the step it was in: `frame 412 (13.73 s) did not finish within 60 s: stuck in settle`. Any other error while a frame is drawn now names the frame too. When the browser never confirms a frame's paint and the page goes on without it, the result carries a warning with how many frames that touched.
