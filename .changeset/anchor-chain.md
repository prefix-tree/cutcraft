---
"@uberscene/sdk": patch
---

A long anchor chain is no longer reported as a cycle. Elements timed off other elements were placed in at most 32
passes, so 40 titles each starting where the one before ends, written last first, left the last 8 with a false `CYCLE`
error at 0 s, and an edit that made such a chain longer was refused. The passes now run until one places nothing, at
most one per element, so a chain of any length is placed and a real cycle is still reported.
