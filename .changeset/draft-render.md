---
"@cutcraft/render": minor
---

`cutcraft <file> --out video.mp4 --draft` renders the video for watching: every second frame, each shown twice as
long, at half the width and height and the `low` quality preset. The length and the sound are unchanged. It is
written beside `--out` as `video.draft.mp4` and never replaces the video. From code: `renderVideo({ draft: true })`
and `draftPath(out)`.
