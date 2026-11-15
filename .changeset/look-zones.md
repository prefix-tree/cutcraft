---
"@cutcraft/render": minor
---

`cutcraft look --zones <zone>` draws a safe zone over every cell of a sheet: what is outside it is shaded, and each
overlay, the captions and each named part is outlined, lime inside the zone and red where it leaves the zone or the
frame. The legend's cells gain `things`, the rows `cutcraft where` gives for that moment. From code: the `zones`
option of `renderLook`, and `describeThings` and `zoneRect`.
