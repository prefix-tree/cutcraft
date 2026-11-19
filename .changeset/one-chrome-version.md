---
"@uberscene/render": minor
"uberscene": minor
---

The export runs on Chrome 157 only. A binary named by `UBERSCENE_CHROMIUM` (or `executablePath`) of any other version is refused when it starts, with its version and what to do instead; before, any Chrome 153 or later was taken and could draw text differently from the preview and the goldens. The downloaded Chrome for Testing is unchanged.
