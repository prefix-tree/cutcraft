---
"@cutcraft/player": minor
"@cutcraft/render": patch
"cutcraft": patch
---

The player drops what only the removed Node renderer used: `Frame.paintFull` and `Frame.prepare`, the
`FrameSourceHooks` argument of `mediabunnyFrameSourceFactory`, and the `intercept` argument of `Compositor.step`. A
`path` media handle given to the player now fails with a message asking for a URL. `cutcraft browser install` keeps a
Chrome already in the cache and no longer contacts the network for it.
