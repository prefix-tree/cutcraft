# Slideshow with motion

Four photos held four seconds each with a slow push, crossfades between them, a bed that fades out with the last one.

## What the manifest gives it

Image assets report a duration of 0 and are held for `duration`. The push is two scale keyframes per photo.

## What the file shows

- `Photo` is a helper used four times, so its clips and keyframes are generated; the first edit to one bakes that call into literals.
- Transitions sit between siblings on the sequence track and overlap the neighbours by 0.6 s.
- The bed is `duration="fill"` with a 2 s fade out.

## The file

<<< ../../recipes/slideshow.tsx

## What the editor can do

- Trim a photo: the keyframes keep their `at`, the push ends early.
- Change `from` or `to` on a `Photo` call: edit the call site, the file re-evaluates.

## What to check

- No lint warnings expected.
- `captureSheet([0.5, 3.7, 7.5, 13.5])`: the title, a crossfade mid-way, a pushed-in photo, the last photo.
