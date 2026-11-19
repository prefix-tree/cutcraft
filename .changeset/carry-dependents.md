---
"@uberscene/kit": minor
---

Removing, splitting and trimming a clip carry along what is placed from it. Titles anchored to a removed clip move to
the clip before it, held inside it, or are removed with it when there is none; a transition left with one side is
removed; a length that followed the clip becomes seconds. A split moves titles at a word of its second half, end
anchors, `until` lengths and an out-edge transition to the new clip. A trim keeps a title whose word it takes away at
its time, as an offset inside the clip. Undo puts all of it back, and the write-back writes it into the file.
`dependentsOf(state, id)` lists what depends on an element. Fixes: undoing a removal puts an anchored element back on
its own line and a Layer back with its handles, and restoring an element anchored to an end (`a.end`) is accepted.
