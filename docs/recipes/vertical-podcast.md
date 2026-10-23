# Vertical clip from a podcast

A 9:16 cut of a landscape podcast: one clip per sentence with a crop on whoever speaks, a name tag on each speaker change, short karaoke captions.

## What the manifest gives it

The `podcast` transcript carries a `speaker` per word, which chose each clip's crop. The crop width 0.3164 is a 9:16 window on a 16:9 source.

## What the file shows

- The composition is 1080×1920; `fit="cover"` and a `crop` per clip do the reframing.
- The crop is a literal per clip, so the editor can nudge each one; a per-speaker face box in the manifest would let the model place them blind.
- `maxChars={28}` keeps generated cues to two short lines on a phone.

## The file

<<< ../../recipes/vertical-podcast.tsx

## What the editor can do

- Drag a clip's crop: one `transform.crop` literal changes.
- Edit a cue: all cues become literal, then the edit applies.

## What to check

- No lint warnings expected.
- `captureSheet([0.3, 2.2, 6, 14])`: Ana, Ben, a name tag, a caption with the current word highlighted.
