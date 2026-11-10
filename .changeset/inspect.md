---
"@cutcraft/kit": minor
"@cutcraft/render": minor
"cutcraft": minor
---

`cutcraft inspect video.tsx` reads a timeline back as text, with no browser: each track's elements with their seconds, the words each clip plays, effects, keyframes and cuts, or with `--json` as flat rows for `jq`. `--at` says what is on screen and heard at chosen moments, with effect values after keyframes. A moment is written the way the file is (`hook.end`, `x1`, `word:14`, `hook@word:14`, `shot:1`, `marker:intro`) or as time (`4.5`, `90f`, `2..6/0.5`). The kit exports what it is built from: `timelineRows`, `parseMoments`, `resolveMoments`, `playsOf` and `spokenWords`; `@cutcraft/render` exports `inspect` and `describeAt`.
