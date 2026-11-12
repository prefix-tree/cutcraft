---
"@cutcraft/kit": patch
---

`TypeCard` no longer confuses `cutcraft --check-layout`. The line a card part shows used to force itself visible, so it stayed on screen while the check hid everything else to measure one element, and every card was reported as covering the captions. A part now only hides the other lines, and a strike leaves its line's letters clear instead.
