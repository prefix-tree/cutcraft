---
"@uberscene/kit": minor
"@uberscene/sdk": minor
---

The kit is split in two. `@uberscene/kit` keeps what a video file imports, and the new `@uberscene/sdk` holds what a tool is built with.

- **`@uberscene/kit`** exports the elements, components, hooks, helpers, diagram parts, knobs and theme, 105 names where it had 450. Video files need no change.
- **`@uberscene/kit/schema`** is new: the vocabulary as data, for tools. It has the element schemas and capabilities, the effect and transition registries, enums, easings, fonts and themes.
- **`@uberscene/sdk`** is new: the resolver, the actions and executor, the patch log, the write-back to source, the lint, the inspection rows and the manifest types. Install it next to the kit and import `collectModule`, `resolve`, `Executor`, `foldToSource`, `lint`, `loadModule` and the rest from it.
- **`@uberscene/kit/source` is removed.** Everything it exported is exported by `@uberscene/sdk`.
- Handler-authoring helpers (`define`, `makePropHandler`, `registerHandler` and the validators) are no longer exported.

The actions are smaller too:

- One `element/create`, `element/update` and `element/remove` serves every overlay kind (title, shape, svg, sticker, adjustment, nested, layer); `element/create` takes the kind as `kind`. The per-kind `text/*`, `shape/*`, `svg/*`, `sticker/*`, `adjustment/*` and `nested/*` create, update and remove are removed (`text/setContent` and `nested/extract` stay).
- `clip/remove` and `clip/restore` are now `element/remove` and `element/restore`. Every remove takes what depends on the element with it.
- `layer/setTransform` is removed; use `transform/update`.

The theme's CSS variables are `--us-*` (`var(--us-accent)`) where they were `--cc-*`. A new lint rule, `old-theme-variables`, reports the old spelling in any string, and `uberscene lint --fix` respells it.
