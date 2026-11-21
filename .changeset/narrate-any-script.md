---
"@uberscene/kit": patch
---

`narrate()` times and cues text in any script. A word's length counted only the letters a to z, so "Привет, друзья."
was timed at about half its length and the subtitles ran twice as fast as the speech; letters (and their combining
marks) in any alphabet count now. Cue names in `[brackets]` and `{braces}` take letters in any script too, so
`[світло]` makes a cue and `.at("світло")` finds it.
