---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/render": minor
"uberscene": minor
---

Clips can be written straight in `<Composition>`, with no `<Track>`: they play in the order they are written, as the video's main track, the bottom one (id `main`). `<Transition>` and `<Gap>` go between them the same way. Tracks written beside them draw on top, so adding a b-roll or title track leaves the main cut as it is. Write `<Track id="main">` around the clips when the track needs a setting of its own; the editor does that when you mute, lock or move it. A clip written after a `<Track>` gets the lint warning `main-clips-first`. `uberscene add` now prints the element to paste (`<Clip id="talk" src="asset:talk" />`), `@uberscene/sdk` gets `wrapMainTrack`, and `ResolvedTrack.implicit` marks a main track with no element. `<Composition> cannot contain <title>` now says to put it in a `<Track>`.
