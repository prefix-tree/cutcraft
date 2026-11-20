---
"@uberscene/player": minor
---

The main entry exports what an app uses: `Player` and its props and ref, `PlayerCore`, `Controls`, the hooks, the events, `MediaResolver` and the font loader. `@uberscene/player/engine` lists the frame and audio plans, the compositor, painter, decoder pool and sources a renderer needs, instead of re-exporting every module. Warnings start with `[uberscene]`. The player now takes its resolver and actions from `@uberscene/sdk`.
