---
"@cutcraft/render": patch
---

In the workspace, where the export page is served from source, the exports in one process share one Vite server and close it a few seconds after the last one. A Vite server closed after each export kept about 40 MB, so a process that exported many times ran out of memory. Published packages serve the built page and are unaffected.
