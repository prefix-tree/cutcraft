---
"@uberscene/sdk": patch
---

Two fixes found by the editor's end-to-end tests:

- Undoing a delete writes the element back with the indent of its first line. Any element moved to a new place in the
  file lost it before.
- A trim of an element without a source writes the edge it was given: trimming a title that starts at 3 to end at
  6.267 writes `duration={3.267}`, not `duration={3.2670000000000003}`.
