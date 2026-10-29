# Actions

Generated from the registered handlers (130) and the parity table. Do not edit by hand; run `pnpm docs:gen`.

Every action has `validate`, `apply`, `invert` and `fold`; the inverse is never null. Params are typed in `packages/kit/src/actions/types/index.ts`.

## `adjustment/`

| action | OpenReel counterpart | note |
|---|---|---|
| `adjustment/create` | `adjustment/setAll` |  |
| `adjustment/remove` | `adjustment/setAll` |  |
| `adjustment/update` | `adjustment/setAll` |  |

## `audio/`

| action | OpenReel counterpart | note |
|---|---|---|
| `audio/add` | — | an `<Audio>` placed like `clip/add`; `duration: "fill"` runs to the end |
| `audio/setAutomation` | `audio/addAutomation` |  |
| `audio/setDuck` | — | OpenReel's ducking bypasses its action system |
| `audio/setFade` | `audio/setFade` |  |
| `audio/setVolume` | `audio/setVolume` |  |

## `audioEffect/`

| action | OpenReel counterpart | note |
|---|---|---|
| `audioEffect/add` | `audio/addEffect` |  |
| `audioEffect/remove` | `audio/removeEffect` |  |
| `audioEffect/restore` | `audio/restoreEffect` |  |
| `audioEffect/setOrder` | — | parity with the video stack |
| `audioEffect/setStack` | — | parity with the video stack |
| `audioEffect/toggle` | `audio/toggleEffect` |  |
| `audioEffect/update` | `audio/updateEffect` |  |

## `batch/`

| action | OpenReel counterpart | note |
|---|---|---|
| `batch/apply` | `speed/setRampData` | one history entry for multi-action gestures and compound inverses |

## `caption/`

| action | OpenReel counterpart | note |
|---|---|---|
| `caption/add` | `subtitle/add` |  |
| `caption/import` | `subtitle/import` |  |
| `caption/remove` | `subtitle/remove` |  |
| `caption/restore` | `subtitle/restore` |  |
| `caption/setAll` | `subtitle/setAll`, `subtitle/restoreAll` |  |
| `caption/setAnimation` | — | caption animation style as its own action |
| `caption/setStyle` | `subtitle/setStyle` |  |
| `caption/update` | `subtitle/update`, `subtitle/replace` |  |

## `clip/`

| action | OpenReel counterpart | note |
|---|---|---|
| `clip/add` | `clip/add` |  |
| `clip/closeGapBefore` | `clip/closeGapBefore` |  |
| `clip/merge` | `clip/merge` |  |
| `clip/move` | `clip/move` |  |
| `clip/remove` | `clip/remove` |  |
| `clip/restore` | `clip/restore` |  |
| `clip/restoreTiming` | `clip/restoreTiming` |  |
| `clip/rippleDelete` | `clip/rippleDelete` |  |
| `clip/rippleRestore` | `clip/rippleRestore` |  |
| `clip/roll` | `clip/roll` |  |
| `clip/setAnchor` | — | connected clips (anchors) have no OpenReel equivalent |
| `clip/setBlend` | `clip/setBlendMode`, `clip/setBlendOpacity` |  |
| `clip/setChromaKey` | `clip/setChromaKey` |  |
| `clip/setEmphasis` | `clip/setEmphasisAnimation` |  |
| `clip/setFit` | — | OpenReel folds it into transform/update |
| `clip/setPitchCorrection` | `clip/setPitchCorrection` |  |
| `clip/setReverse` | `clip/setReverse` |  |
| `clip/setSmoothSlowMo` | — | OpenReel sets this via raw store writes |
| `clip/setSource` | — | media-slot replacement |
| `clip/setSpeed` | `clip/setSpeed` |  |
| `clip/setStabilization` | `clip/setStabilization` |  |
| `clip/slide` | `clip/slide` |  |
| `clip/slip` | `clip/slip` |  |
| `clip/split` | `clip/split` |  |
| `clip/trim` | `clip/trim` |  |
| `clip/trimToPlayhead` | `clip/trimToPlayhead` |  |

## `colorGrade/`

| action | OpenReel counterpart | note |
|---|---|---|
| `colorGrade/set` | `clip/setColorGrading` |  |

## `composition/`

| action | OpenReel counterpart | note |
|---|---|---|
| `composition/setBackground` | `project/setCanvasBackground` |  |
| `composition/setProps` | — | the tweaks panel: rewrites the file's `defaults` literal |
| `composition/setTheme` | — | the file's theme: swap it, extend it or remove it in one step |
| `composition/updateSettings` | `project/updateSettings` |  |

## `effect/`

| action | OpenReel counterpart | note |
|---|---|---|
| `effect/add` | `effect/add` |  |
| `effect/remove` | `effect/remove` |  |
| `effect/restore` | `effect/restore` |  |
| `effect/setOrder` | `effect/reorder`, `effect/setOrder` |  |
| `effect/setStack` | `effect/setStack` |  |
| `effect/toggle` | `effect/toggle` |  |
| `effect/update` | `effect/update` |  |

## `graphic/`

| action | OpenReel counterpart | note |
|---|---|---|
| `graphic/create` | — | a built-in graphic kind (`<Graphic>`) |
| `graphic/remove` | — | a built-in graphic kind (`<Graphic>`) |
| `graphic/update` | — | a built-in graphic kind (`<Graphic>`) |

## `keyframe/`

| action | OpenReel counterpart | note |
|---|---|---|
| `keyframe/add` | `keyframe/add` |  |
| `keyframe/move` | — | named but never implemented in OpenReel |
| `keyframe/remove` | `keyframe/remove` |  |
| `keyframe/restore` | — | undo of keyframe/remove keeps easing and handles |
| `keyframe/setAll` | `keyframe/setAll` |  |
| `keyframe/update` | `keyframe/update` |  |

## `layer/`

| action | OpenReel counterpart | note |
|---|---|---|
| `layer/setProps` | — | the handles of a Layer's component |
| `layer/setTiming` | — | the &lt;Layer> escape hatch |
| `layer/setTransform` | — | the &lt;Layer> escape hatch |

## `marker/`

| action | OpenReel counterpart | note |
|---|---|---|
| `marker/add` | `marker/add` |  |
| `marker/remove` | `marker/remove` |  |
| `marker/restore` | `marker/restore` |  |
| `marker/update` | `marker/update` |  |

## `mask/`

| action | OpenReel counterpart | note |
|---|---|---|
| `mask/create` | `mask/setAll` |  |
| `mask/remove` | `mask/setAll` |  |
| `mask/restore` | — | undo of mask/remove |
| `mask/setPath` | `mask/setAll` |  |
| `mask/update` | `mask/setAll` |  |

## `multicam/`

| action | OpenReel counterpart | note |
|---|---|---|
| `multicam/addCut` | `multicam/setAll` |  |
| `multicam/create` | `multicam/setAll` |  |
| `multicam/flatten` | `multicam/applyEdit` |  |
| `multicam/moveCut` | `multicam/setAll` |  |
| `multicam/remove` | — | a multicam group is an element and can be deleted |
| `multicam/removeCut` | `multicam/setAll` |  |
| `multicam/restore` | `multicam/restoreEdit` |  |
| `multicam/restoreCut` | — | undo of removeCut |
| `multicam/setActiveAngle` | — | angle selection |

## `nested/`

| action | OpenReel counterpart | note |
|---|---|---|
| `nested/create` | `nested/setAll` |  |
| `nested/extract` | `nested/setAll` |  |
| `nested/remove` | `nested/setAll` |  |
| `nested/update` | `nested/setAll` |  |

## `shape/`

| action | OpenReel counterpart | note |
|---|---|---|
| `shape/create` | `shape/create` |  |
| `shape/remove` | `shape/remove` |  |
| `shape/update` | `shape/update` |  |

## `source/`

| action | OpenReel counterpart | note |
|---|---|---|
| `source/bake` | — | expand generated elements into literals |
| `source/setProp` | — | generic inspector write |
| `source/setProps` | — | the inverse of every prop-writing action |

## `speed/`

| action | OpenReel counterpart | note |
|---|---|---|
| `speed/setFreezes` | `speed/setFreezeFrames` |  |
| `speed/setKeys` | `speed/setKeyframes` |  |

## `sticker/`

| action | OpenReel counterpart | note |
|---|---|---|
| `sticker/create` | `sticker/create` |  |
| `sticker/remove` | `sticker/remove` |  |
| `sticker/update` | `sticker/update` |  |

## `svg/`

| action | OpenReel counterpart | note |
|---|---|---|
| `svg/create` | `svg/create` |  |
| `svg/remove` | `svg/remove` |  |
| `svg/update` | `svg/update` |  |

## `text/`

| action | OpenReel counterpart | note |
|---|---|---|
| `text/create` | `text/create` |  |
| `text/remove` | `text/remove` |  |
| `text/setContent` | — |  |
| `text/update` | `text/update` |  |

## `theme/`

| action | OpenReel counterpart | note |
|---|---|---|
| `theme/setToken` | — | one palette colour, font role or radius in the file's theme |

## `track/`

| action | OpenReel counterpart | note |
|---|---|---|
| `track/add` | `track/add` |  |
| `track/consolidate` | `track/consolidate` |  |
| `track/duplicate` | `track/duplicate` |  |
| `track/remove` | `track/remove` |  |
| `track/rename` | `track/rename` |  |
| `track/reorder` | `track/reorder` |  |
| `track/restore` | `track/restore` |  |
| `track/restorePositions` | `track/restorePositions` |  |
| `track/setFlag` | `track/lock`, `track/hide`, `track/mute`, `track/solo` |  |
| `track/setGroup` | — | OpenReel groups tracks via raw store writes |
| `track/setLayout` | — | sequence ↔ free |

## `transform/`

| action | OpenReel counterpart | note |
|---|---|---|
| `transform/update` | `transform/update` |  |

## `transition/`

| action | OpenReel counterpart | note |
|---|---|---|
| `transition/add` | `transition/add`, `transition/set` |  |
| `transition/remove` | `transition/remove` |  |
| `transition/restore` | `transition/restore` |  |
| `transition/update` | `transition/update` |  |
