---
"@cutcraft/render": minor
"cutcraft": minor
---

The manifest is found without `--manifest`: commands take the nearest `cutcraft.json` from the video file's folder upward, so videos in subfolders share one. A `manifest.json` beside the video file is still read. `cutcraft add` updates the nearest `cutcraft.json` from the current folder upward and creates one there when there is none; it used to create `manifest.json` beside the media. Without `--media`, media is looked for in the video file's folder, the manifest's folder and `media/` beside the manifest. `loadVideo` returns `manifestPath`, `directoryResolver` takes a list of folders, and `findManifest` is exported.
