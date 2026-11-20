---
editLink: false
---

# Actions

Generated from the registered handlers (99). Do not edit by hand; run `pnpm docs:gen`.

Every action has `validate`, `apply`, `invert` and `fold`; the inverse is never null. Each runs as `{ type, params }`; the params and notes here are read from `packages/sdk/src/actions/types/index.ts`.

## `audio/`

| action | params | what it does |
|---|---|---|
| `audio/add` | `{ id, trackId, src, place, in?, out?, duration? }` | An &lt;Audio> (sound only: music, a voice-over), placed like a clip; `duration: "fill"` runs to the composition's end. |
| `audio/setAutomation` | `{ id, lane, points }` | Replaces one automation lane, `volume` or `pan`, with `[seconds, value]` points. |
| `audio/setDuck` | `{ id, duck? }` | Turns this sound down to `to` while the track `under` plays, over `attack` and `release` seconds; omit `duck` to stop ducking. `under` is a track id or a track role, as in a file. |
| `audio/setFade` | `{ id, in?, out? }` | Sets the fade-in and/or fade-out length in seconds; merges into `fade`. |
| `audio/setVolume` | `{ id, volume }` | Sets the element's volume, 0 to 4 (1 leaves it as recorded). |

## `batch/`

| action | params | what it does |
|---|---|---|
| `batch/apply` | `{ actions }` | Runs several actions as one history entry, each checked against the state the one before left; its undo is their inverses in reverse. Multi-action gestures and compound inverses use it. |

## `box/`

| action | params | what it does |
|---|---|---|
| `box/update` | `{ id, box }` | Places an element or the captions: merges `box` (`x`, `y` in pixels from the frame's top left, `origin`) into its box; only the fields given change, and a field set to null is removed, so that axis is centred again. |

## `caption/`

| action | params | what it does |
|---|---|---|
| `caption/add` | `{ captionsId, captionId, start, end, text, words? }` | Adds one cue; if the cues were generated from `src`, they all become literal first. |
| `caption/import` | `{ captionsId, src?, items? }` | Creates the composition's one &lt;Captions> from `src` or `items`, or replaces the src and items of the existing one. |
| `caption/remove` | `{ captionId }` | Deletes one cue; deleting a generated cue makes the others literal first. |
| `caption/restore` | `{ captionsId, node, after }` | The undo of caption/remove: puts the cue back where it was. |
| `caption/setAll` | `{ captionsId, nodes, after? }` | Replaces every literal cue with `nodes`; empty `nodes` lets the cues generated from `src` come back. |
| `caption/setAnimation` | `{ captionsId, animation }` | Sets how caption words animate in (`animation`), separate from the style. |
| `caption/setStyle` | `{ captionsId, style? }` | Sets the captions' `style`; omit it to clear. |
| `caption/update` | `{ captionId, text?, start?, end?, words? }` | Changes a cue's text, times or words; editing a generated cue makes every cue literal first. |

## `clip/`

| action | params | what it does |
|---|---|---|
| `clip/add` | `{ id, trackId, src, place, in?, out?, duration? }` | Puts a &lt;Clip> of `src` on a track at `place`; `in` with `out` or `duration` picks the source range (not both). |
| `clip/closeGapBefore` | `{ id }` | Closes the gap before an element: on a free track it and every later element shift left to meet the previous one; on a sequence the &lt;Gap> before it is removed. |
| `clip/merge` | `{ id, rightId, original }` | The undo of clip/split: removes both halves and puts back the `original` element. |
| `clip/move` | `{ id, trackId?, place }` | Moves an element: reorders it in a sequence (`after`), sets its start on a free track, or re-anchors it; `trackId` moves it to another track. A generated element must be baked first. |
| `clip/restoreTiming` | `{ id, in?, out?, duration?, start? }` | Writes back the given timing props (`in`, `out`, `duration`, `start`) as they were; used to undo timing edits. |
| `clip/rippleDelete` | `{ id }` | Deletes the element and, on a free track, pulls every later element left by its length; a sequence closes up by itself. What was placed from it comes along as with element/remove. |
| `clip/rippleRestore` | `{ id, node, trackId, place, affected }` | The undo of clip/rippleDelete: puts the element back and restores the starts it shifted. |
| `clip/roll` | `{ leftId, rightId, delta }` | Moves the cut between two adjacent source clips by `delta`; the total length stays the same. |
| `clip/setAnchor` | `{ id, anchor?, offset? }` | Anchors the element to another element (or `"start"`) at `offset` seconds; omit `anchor` to unanchor. A new anchor drops a word `at`. |
| `clip/setBlend` | `{ id, mode?, opacity? }` | Sets the blend `mode` of anything that draws, and/or the blend `opacity` of a clip or a nested sequence. |
| `clip/setFit` | `{ id, value? }` | Sets how a clip or nested scene fills the frame (`fit`); omit `value` to reset it. |
| `clip/setReverse` | `{ id, value }` | Plays the source backwards, or forwards again. |
| `clip/setSource` | `{ id, src }` | Replaces the media in a slot: swaps `src` on a clip, audio, svg or sticker and keeps its timing and everything else. |
| `clip/setSpeed` | `{ id, speed }` | Sets playback speed, 0.1 to 20; the timeline length follows and `out` stays. |
| `clip/slide` | `{ id, delta }` | Moves a clip by `delta` between its neighbours, keeping its content; the previous clip's tail and the next clip's head absorb it. Both neighbours must be source clips. |
| `clip/slip` | `{ id, delta }` | Shifts the source window by `delta` seconds without moving the element on the timeline. |
| `clip/split` | `{ id, at, newId }` | Cuts an element in two at timeline time `at`; the right half gets `newId`, and keyframes, speed keys and freezes go to the half they fall in. Titles at a word of the right half, anchors on the element's end, lengths until it ends and a transition on its out edge move to `newId`. |
| `clip/trim` | `{ id, edge, value }` | Moves one edge. For a source clip `value` is the new source in or out (seconds, or a transcript or shot reference); for anything else it is the timeline time of that edge. A title at a word the trim takes away keeps its time as an offset, held inside the clip. |
| `clip/trimToPlayhead` | `{ id, at, edge }` | Trims the `in` or `out` edge to timeline time `at`, which must fall inside the element. |

## `composition/`

| action | params | what it does |
|---|---|---|
| `composition/setBackground` | `{ mode?, color? }` | Sets what shows behind every track: a `color`, or a `blur` of the picture; merges into the current `background`. |
| `composition/setProps` | `{ defaults }` | The tweaks panel: rewrites the file's `defaults` literal. |
| `composition/setTheme` | `{ theme, merge? }` | Swap the theme (or remove it with null); with `merge`, lay the given parts over the current theme instead. |
| `composition/updateSettings` | `{ fps?, width?, height?, sampleRate?, channels? }` | Sets the composition's fps, size, sample rate or channel count; only the fields given change. `fps` is a whole number of frames per second. An NTSC rate is a string in the file (`fps="29.97"`), which this action does not write. `sampleRate` must divide into whole ticks (44100, 48000, 96000). |

## `effect/`

| action | params | what it does |
|---|---|---|
| `effect/add` | `{ id, childId, type, params?, index? }` | Adds an effect of `type` (built in, or a shader the file declares) to element `id` at `index` (last by default), turned on. |
| `effect/remove` | `{ id, childId }` | Removes one effect from an element's stack. |
| `effect/restore` | `{ id, node, after }` | The undo of effect/remove: puts the effect back at its old place in the stack. |
| `effect/setOrder` | `{ id, childIds }` | Reorders an element's effect stack; `childIds` must name every effect once. |
| `effect/setStack` | `{ id, nodes, after? }` | Replaces an element's whole effect stack with `nodes`. |
| `effect/toggle` | `{ id, childId, enabled }` | Turns one effect on or off without removing it. |
| `effect/update` | `{ id, childId, params }` | Merges `params` into one effect's params. |

## `element/`

| action | params | what it does |
|---|---|---|
| `element/create` | `{ id, kind, trackId, place, props, text?, children?, after? }` | Adds a title, shape, svg, sticker, adjustment layer, nested scene or layer to a track at `place`, with its props and a title's text. |
| `element/remove` | `{ id }` | Deletes an element from its track: a clip, gap, title or anything else placed on a track. What was placed from it comes along: titles anchored to it move to the clip before it, held inside that clip (removed with it when there is none), a transition left without a clip on one side is removed, and a length that followed it becomes seconds. |
| `element/restore` | `{ id, node, trackId, place, after? }` | The undo of element/remove: puts the element back on its track at its old placement. |
| `element/update` | `{ id, props }` | Sets literal props on a title, shape, svg, sticker, adjustment layer, nested scene or layer. |

## `font/`

| action | params | what it does |
|---|---|---|
| `font/use` | `{ id?, role?, family, weight? }` | Set a font from a picker: on a title or the captions (`id`), or as a theme role (`role`: `heading`, `body`, `mono`). The family is bundled, declared in the file, or in the font catalogue; a catalogue family the file does not declare is loaded for the preview at once, and the fold writes its `googleFont()` declaration. |

## `keyframe/`

| action | params | what it does |
|---|---|---|
| `keyframe/add` | `{ id, keyId, property?, param?, at, value, easing? }` | `property` animates the element `id`; `param` animates a param of the effect `id`. One of the two. |
| `keyframe/move` | `{ id, keyId, at }` | Moves a keyframe to `at`, seconds from the element's start; it must stay inside the element. |
| `keyframe/remove` | `{ id, keyId }` | Deletes one keyframe. |
| `keyframe/restore` | `{ id, node, after }` | The undo of keyframe/remove: puts the keyframe back in place, with its value and easing. |
| `keyframe/setAll` | `{ id, nodes, after? }` | Replaces every keyframe on the element with `nodes`. |
| `keyframe/update` | `{ id, keyId, value?, easing? }` | Changes a keyframe's value and/or easing. |

## `layer/`

| action | params | what it does |
|---|---|---|
| `layer/setProps` | `{ id, props }` | Sets the handles of a Layer: the props of the one component inside it. |
| `layer/setTiming` | `{ id, duration?, anchor?, offset?, start? }` | Sets a &lt;Layer>'s duration, anchor, offset or start; the escape hatch for timing a Layer. A new anchor drops a word `at`. |

## `marker/`

| action | params | what it does |
|---|---|---|
| `marker/add` | `{ markerId, at, label?, color? }` | Adds a timeline marker at `at` seconds, with an optional label and colour. |
| `marker/remove` | `{ markerId }` | Deletes a marker. |
| `marker/restore` | `{ node, after }` | The undo of marker/remove: puts the marker back where it was. |
| `marker/update` | `{ markerId, at?, label?, color? }` | Changes a marker's time, label or colour. |

## `mask/`

| action | params | what it does |
|---|---|---|
| `mask/create` | `{ id, parentId, props }` | Adds a mask to the visual element `parentId`. |
| `mask/remove` | `{ id }` | Deletes a mask. |
| `mask/restore` | `{ id, parentId, node, after }` | The undo of mask/remove: puts the mask back on its element. |
| `mask/setPath` | `{ id, path }` | Gives a mask a drawn `path`, replacing its preset `shape`. |
| `mask/update` | `{ id, props }` | Sets literal props on a mask. |

## `multicam/`

| action | params | what it does |
|---|---|---|
| `multicam/addCut` | `{ id, cutId, at, angle }` | Adds a cut at `at` that switches the multicam to `angle`. |
| `multicam/create` | `{ id, trackId, place, angles, sync? }` | Adds a &lt;Multicam> of `angles` to a track at `place`; `sync` is the timeline time the angles line up at. |
| `multicam/flatten` | `{ id }` | Replaces the multicam by one literal &lt;Clip> per cut, at the time and source range the cut played; free tracks only. |
| `multicam/moveCut` | `{ cutId, at }` | Moves a cut to `at`. |
| `multicam/remove` | `{ id }` | Deletes a multicam group with its angles and cuts; a group is an element like any other. |
| `multicam/removeCut` | `{ cutId }` | Deletes a cut. |
| `multicam/restore` | `{ id, node, trackId, place }` | The undo of multicam/remove: puts the group back on its track at its old placement. |
| `multicam/restoreCut` | `{ id, node, after }` | The undo of multicam/removeCut: puts the cut back in place. |

## `nested/`

| action | params | what it does |
|---|---|---|
| `nested/extract` | `{ id }` | Replaces a &lt;Nested> scene by its contents: one free track per inner track, inserted below, every item at the time it played; on a sequence a &lt;Gap> keeps its slot. |

## `source/`

| action | params | what it does |
|---|---|---|
| `source/bake` | `{ id }` | Marks a generated element so the next fold writes it and its children as literals; undo is a file revert. |
| `source/setProp` | `{ id, prop, value }` | Writes one literal prop on any element; the inspector's generic write. |
| `source/setProps` | `{ id, props }` | Several literal props at once; the inverse of every prop-writing action. |

## `speed/`

| action | params | what it does |
|---|---|---|
| `speed/setFreezes` | `{ id, freezes, after? }` | Replaces the element's freeze frames with `freezes`. |
| `speed/setKeys` | `{ id, keys, after? }` | Replaces the element's speed-ramp keys with `keys`. |

## `text/`

| action | params | what it does |
|---|---|---|
| `text/setContent` | `{ id, text }` | Replaces a title's text. |

## `theme/`

| action | params | what it does |
|---|---|---|
| `theme/setToken` | `{ token, value }` | One theme value: a palette colour, a font role or `radius`, by token name without the `$`. |

## `track/`

| action | params | what it does |
|---|---|---|
| `track/add` | `{ trackId, position?, layout?, role?, name? }` | Adds an empty track at `position` (last by default), with an optional layout, role and name. |
| `track/consolidate` | `{ trackId }` | Free tracks only: packs every element from 0 with no gaps, keeping their order. |
| `track/duplicate` | `{ sourceTrackId, trackId, idMap, position? }` | Copies a track and its contents to `position` (below the source by default), named "&lt;name> Copy"; `idMap` names the copies, other ids get a `_<trackId>` suffix, and anchors inside the track follow the copies. |
| `track/remove` | `{ trackId }` | Deletes a track and everything on it. |
| `track/rename` | `{ trackId, name }` | Sets the track's name. |
| `track/reorder` | `{ trackId, position }` | Moves the track to `position` in the stack. |
| `track/restore` | `{ trackId, node, position }` | The undo of track/remove: puts the track back where it was, with its contents. |
| `track/restorePositions` | `{ trackId, positions }` | Sets the `start` of several elements at once; the undo of track/consolidate and of clip/closeGapBefore on a free track. |
| `track/setFlag` | `{ trackId, flag, value }` | Turns one track flag on or off: `locked`, `hidden`, `muted` or `solo`. |
| `track/setGroup` | `{ trackId, group? }` | Puts the track in a group, or takes it out when `group` is omitted. |
| `track/setLayout` | `{ trackId, layout }` | Switches a track between sequence and free layout, keeping every element where it played: free gets explicit starts, sequence gets a &lt;Gap> per hole. Overlapping items cannot become a sequence. |

## `transform/`

| action | params | what it does |
|---|---|---|
| `transform/update` | `{ id, transform }` | Deep-merges `transform` into a visual element's transform; only the fields given change. |

## `transition/`

| action | params | what it does |
|---|---|---|
| `transition/add` | `{ transitionId, between, type, duration, params? }` | Adds a transition between two adjacent clips on a sequence track (`between: [a, b]`), or on one edge of a clip on any track (`{ on, edge }`); it may not be longer than its clips. |
| `transition/remove` | `{ transitionId }` | Deletes a transition. |
| `transition/restore` | `{ transitionId, node, trackId, after }` | The undo of transition/remove: puts the transition back where it was. |
| `transition/update` | `{ transitionId, type?, duration?, params? }` | Changes a transition's type, duration or params; a new `type` resets params to its defaults plus any given. |
