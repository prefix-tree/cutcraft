---
"@uberscene/kit": minor
"@uberscene/render": minor
"uberscene": minor
---

`uberscene blocks add <name>` copies a block into the project and records it in the manifest; with `--into video.tsx --track <id> --at <moment>` it also writes the import and a `<Layer>` holding it, leaving the video as it was if that would give it errors. `uberscene blocks update` replaces copies nobody edited and prints what differs in edited ones. The kit gets `insertLayer` in `@uberscene/kit/source`, an optional `blocks` record on `AssetManifest`, and a component imported from one of the file's own modules now gets the Layer's handles, as one declared in the file does.
