---
"@cutcraft/kit": minor
"@cutcraft/render": minor
"cutcraft": minor
---

`cutcraft look video.tsx` draws many frames in one browser start, on one contact sheet with a JSON legend that says what each cell is. With no moments it skims the cut as an editor does (each clip's first frame, both sides of every cut, each overlay); `--at` takes the moments `inspect` takes, `--around <id>` follows a transition or an element coming in and going out, and `--without <id>` draws each frame with and without an effect, an adjustment or an overlay, side by side. The kit exports `aroundMoments` and `skimMoments`; `@cutcraft/render` exports `renderLook`.
