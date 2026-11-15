---
"@cutcraft/kit": minor
---

`narrate(script)` times a narration. In the script a word in square brackets is a cue, a number in round brackets
a pause in seconds, and a name in curly brackets a cue with no word. It returns every word with its start and end,
the subtitles a phrase at a time, the cues by name (`at(name)` throws on a name the script does not have) and the
duration. The times come from a speaking pace, or from the transcript of a recorded voice.
