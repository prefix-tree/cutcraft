---
"@uberscene/render": patch
---

Two export fixes:

- An asset id can no longer name another file. The export's local server answered `/media/<id>` by joining the
  decoded id onto the media folder, so code in a file could fetch `/media/..%2F..%2F.ssh%2Fid_rsa` and read any file
  on the host. Asset ids are now only what an `asset:` reference allows (letters, digits, `_`, `-`, `.`, no `..`),
  checked in `directoryResolver`, on `/media/` and on the native codec routes.
- A long export no longer runs out of memory. Pieces were a third of the frames per tab, so an hour at 1080p with one
  tab made pieces of about 930 MB, each held whole in the page and in Node. A piece now runs a minute at most.
