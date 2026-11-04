# Actions

Generated from the registered handlers (119). Do not edit by hand; run `pnpm docs:gen`.

Every action has `validate`, `apply`, `invert` and `fold`; the inverse is never null. Params are typed in `packages/kit/src/actions/types/index.ts`.

## `adjustment/`

| action | note |
|---|---|
| `adjustment/create` |  |
| `adjustment/remove` |  |
| `adjustment/update` |  |

## `audio/`

| action | note |
|---|---|
| `audio/add` |  |
| `audio/setAutomation` |  |
| `audio/setDuck` |  |
| `audio/setFade` |  |
| `audio/setVolume` |  |

## `batch/`

| action | note |
|---|---|
| `batch/apply` | one history entry for multi-action gestures and compound inverses |

## `caption/`

| action | note |
|---|---|
| `caption/add` |  |
| `caption/import` |  |
| `caption/remove` |  |
| `caption/restore` |  |
| `caption/setAll` |  |
| `caption/setAnimation` | caption animation style as its own action |
| `caption/setStyle` |  |
| `caption/update` |  |

## `clip/`

| action | note |
|---|---|
| `clip/add` |  |
| `clip/closeGapBefore` |  |
| `clip/merge` |  |
| `clip/move` |  |
| `clip/remove` |  |
| `clip/restore` |  |
| `clip/restoreTiming` |  |
| `clip/rippleDelete` |  |
| `clip/rippleRestore` |  |
| `clip/roll` |  |
| `clip/setAnchor` |  |
| `clip/setBlend` |  |
| `clip/setFit` |  |
| `clip/setReverse` |  |
| `clip/setSource` | media-slot replacement |
| `clip/setSpeed` |  |
| `clip/slide` |  |
| `clip/slip` |  |
| `clip/split` |  |
| `clip/trim` |  |
| `clip/trimToPlayhead` |  |

## `colorGrade/`

| action | note |
|---|---|
| `colorGrade/set` |  |

## `composition/`

| action | note |
|---|---|
| `composition/setBackground` |  |
| `composition/setProps` | the tweaks panel: rewrites the file's `defaults` literal |
| `composition/setTheme` | the file's theme: swap it, extend it or remove it in one step |
| `composition/updateSettings` |  |

## `effect/`

| action | note |
|---|---|
| `effect/add` |  |
| `effect/remove` |  |
| `effect/restore` |  |
| `effect/setOrder` |  |
| `effect/setStack` |  |
| `effect/toggle` |  |
| `effect/update` |  |

## `graphic/`

| action | note |
|---|---|
| `graphic/create` | a built-in graphic kind (`<Graphic>`) |
| `graphic/remove` | a built-in graphic kind (`<Graphic>`) |
| `graphic/update` | a built-in graphic kind (`<Graphic>`) |

## `keyframe/`

| action | note |
|---|---|
| `keyframe/add` |  |
| `keyframe/move` |  |
| `keyframe/remove` |  |
| `keyframe/restore` | undo of keyframe/remove keeps its easing |
| `keyframe/setAll` |  |
| `keyframe/update` |  |

## `layer/`

| action | note |
|---|---|
| `layer/setProps` | the handles of a Layer's component |
| `layer/setTiming` | the &lt;Layer> escape hatch |
| `layer/setTransform` | the &lt;Layer> escape hatch |

## `marker/`

| action | note |
|---|---|
| `marker/add` |  |
| `marker/remove` |  |
| `marker/restore` |  |
| `marker/update` |  |

## `mask/`

| action | note |
|---|---|
| `mask/create` |  |
| `mask/remove` |  |
| `mask/restore` | undo of mask/remove |
| `mask/setPath` |  |
| `mask/update` |  |

## `multicam/`

| action | note |
|---|---|
| `multicam/addCut` |  |
| `multicam/create` |  |
| `multicam/flatten` |  |
| `multicam/moveCut` |  |
| `multicam/remove` | a multicam group is an element and can be deleted |
| `multicam/removeCut` |  |
| `multicam/restore` |  |
| `multicam/restoreCut` | undo of removeCut |
| `multicam/setActiveAngle` | angle selection |

## `nested/`

| action | note |
|---|---|
| `nested/create` |  |
| `nested/extract` |  |
| `nested/remove` |  |
| `nested/update` |  |

## `shape/`

| action | note |
|---|---|
| `shape/create` |  |
| `shape/remove` |  |
| `shape/update` |  |

## `source/`

| action | note |
|---|---|
| `source/bake` | expand generated elements into literals |
| `source/setProp` | generic inspector write |
| `source/setProps` | the inverse of every prop-writing action |

## `speed/`

| action | note |
|---|---|
| `speed/setFreezes` |  |
| `speed/setKeys` |  |

## `sticker/`

| action | note |
|---|---|
| `sticker/create` |  |
| `sticker/remove` |  |
| `sticker/update` |  |

## `svg/`

| action | note |
|---|---|
| `svg/create` |  |
| `svg/remove` |  |
| `svg/update` |  |

## `text/`

| action | note |
|---|---|
| `text/create` |  |
| `text/remove` |  |
| `text/setContent` |  |
| `text/update` |  |

## `theme/`

| action | note |
|---|---|
| `theme/setToken` | one palette colour, font role or radius in the file's theme |

## `track/`

| action | note |
|---|---|
| `track/add` |  |
| `track/consolidate` |  |
| `track/duplicate` |  |
| `track/remove` |  |
| `track/rename` |  |
| `track/reorder` |  |
| `track/restore` |  |
| `track/restorePositions` |  |
| `track/setFlag` |  |
| `track/setGroup` |  |
| `track/setLayout` | sequence ↔ free |

## `transform/`

| action | note |
|---|---|
| `transform/update` |  |

## `transition/`

| action | note |
|---|---|
| `transition/add` |  |
| `transition/remove` |  |
| `transition/restore` |  |
| `transition/update` |  |
