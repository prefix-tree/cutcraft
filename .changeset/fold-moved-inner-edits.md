---
"@cutcraft/kit": patch
---

Writing edits back no longer fails when an element is moved and something inside it is also edited, such as reordering a track and changing the volume of a sound on it. The moved element is printed with those edits in it; before, the two edits overlapped and `foldToSource` threw "overlapping edits".
