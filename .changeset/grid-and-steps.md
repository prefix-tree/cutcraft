---
"@uberscene/kit": minor
---

Three small helpers for free code that draws a board or happens in steps. `grid({ columns, rows, width, height, x, y })` is the geometry of a grid and draws nothing: it returns every cell with its index, column, row and box, and `rect(column, row)`. `stepAt(times, t)` says which step a moment has reached in a list of seconds. `random()` takes several keys, so `random("wall", cell, turn)` names one number among many; with one seed it gives what it always gave.
