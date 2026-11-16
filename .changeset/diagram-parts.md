---
"@cutcraft/kit": minor
---

Parts for drawing a diagram inside a `<Layer>`: `DrawnLine` (a line that draws itself), `Label` (a word with a
line to the point it names, named for the layout check), `CountUp` (a number that counts) and `Cells` (a row of
cells with values). Each renders SVG and happens `at` a second of the video or `after` so many seconds of its
layer, taking `over` seconds. `useProgress` and `progress` give the same timing to your own drawing.
