---
"@cutcraft/render": patch
---

An export no longer draws the odd frame one step behind when the file sets React state from its own `requestAnimationFrame` loop. The update was left to React's scheduler and about one frame in fifty was captured before it was committed; the export page now has React commit it before the frame is painted.
