---
"@cutcraft/render": minor
"cutcraft": minor
---

`cutcraft look` and `--still` keep the frames they draw in `.cutcraft/cache` beside the file, each under a key made from what draws it (the elements on screen with their resolved props, the media files, the composition, the fonts, the versions of CutCraft and Chrome). After an edit only the frames it changed are drawn again, and a look whose cells are all kept starts no browser. `--no-cache` draws everything again; `renderLook` and `renderStill` take a `cacheDir` and report what was `cached`. A look's sheet is now always a PNG, put together in Node from its cells: `--out sheet.jpg` is an error.
