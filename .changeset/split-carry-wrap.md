---
"@uberscene/kit": patch
"@uberscene/player": patch
---

Splitting a clip that animates gives each half a key at the cut with the value the clip had there, for keys on its transform, on its effects' params and on its speed, so neither half jumps; keys on an effect's params are now split and shifted like the clip's own. Undoing the split puts the clip back whole. Removing a transition, alone or with the clip it joined, carries what is anchored to it (a sound on the cut) to the clip it led into. A word-by-word title wraps inside its width like any title, with the spaces between its words.
