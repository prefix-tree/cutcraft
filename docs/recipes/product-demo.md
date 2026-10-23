# Product demo with zoom-ins

A screen recording with a crop that zooms into the first click and back, a highlight ring on every click, a narrated voice-over with generated captions.

## What the manifest gives it

The `screen` asset has no transcript, so it is trimmed by seconds. The `voice` asset has one, so its captions are generated. The clicks are markers at 3, 9 and 15 s.

## What the file shows

- `transform.crop.*` keyframes zoom to the click and back; the times are element-relative seconds.
- The rings anchor to the recording with an `offset`, so a retrim moves them with it.
- Markers name the clicks for the next edit; a marker takes seconds.
- The bed ducks under the `voice` track.

## The file

<<< ../../recipes/product-demo.tsx

## What the editor can do

- Move a ring: its `offset` changes, nothing else.
- Drag a keyframe in the timeline: `at` changes; the crop path is otherwise locked to the file.
- The ring colour is bound to `accent`.

## What to check

- No lint warnings expected.
- `captureSheet([2.5, 3.5, 5, 9.5])`: full frame, the zoomed frame, the hold, the second ring.
