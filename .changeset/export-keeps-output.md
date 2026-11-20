---
"@uberscene/render": patch
---

A failed export no longer destroys the file it would have replaced. Videos, soundtracks, stills and contact sheets are written beside the output as a `.partial` file and renamed over it only once they are whole, so a timeout, a missing asset or a crash keeps the last good file. A still is now checked for failed media before it is written, and the partial file is removed when an export fails.
