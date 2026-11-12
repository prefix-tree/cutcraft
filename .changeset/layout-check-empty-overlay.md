---
"@cutcraft/render": patch
---

`cutcraft --check-layout` no longer stops with "No cached paint record for element" on a video whose captions have a pause between two lines. An overlay that draws nothing at the moment measured is now counted as having no ink, which is what it has.
