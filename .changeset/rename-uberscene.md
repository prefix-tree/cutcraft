---
"@uberscene/kit": minor
"@uberscene/player": minor
"@uberscene/render": minor
"@uberscene/graphics": minor
"uberscene": minor
---

CutCraft is now UberScene. The packages are `uberscene` (the CLI, run as `npx uberscene`) and `@uberscene/kit`, `@uberscene/player`, `@uberscene/render` and `@uberscene/graphics`; change your imports from `@cutcraft/*`. The manifest is `uberscene.json`, and a `cutcraft.json` is still found. The environment variables are `UBERSCENE_*` instead of `CUTCRAFT_*`, and the caches move to `~/.cache/uberscene`.
