---
"@uberscene/kit": patch
"@uberscene/player": patch
---

Splitting a clip that animates gives each half a key at the cut with the value the clip had there, for keyframes, keyframes inside effects and speed keys, so neither half jumps; keys inside an effect are now split, shifted and renamed like the clip's own. Undoing the split puts the clip back whole. Removing a transition, alone or with the clip it joined, carries what is anchored to it (a sound on the cut) to the clip it led into. A word-by-word title wraps inside its width like any title, with the spaces between its words.
