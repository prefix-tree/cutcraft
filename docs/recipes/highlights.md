# Multicam highlights

Two cameras of one scene switched at camera B's shot boundaries, with the dense segment picked by the transcript's silences.

## What the manifest gives it

`cam-b` has shots at 0, 10, 25 and 40 s; `cam-a` has the transcript and its silences. Cuts take seconds.

## What the file shows

- `<Multicam>` on a free track places the cuts at their absolute times; the resolver generates one clip per cut.
- `multicam/flatten` writes the generated clips as literal `<Clip>`s once the switching is settled.
- The pull quote between the first long pause and the second is kept on a hidden track as a reference.

## The file

<<< ../../recipes/highlights.tsx

## What the editor can do

- Move a cut: `at` changes, the previous clip shortens, the next lengthens.
- Flatten, then trim and reorder the clips like any other.

## What to check

- No lint warnings expected.
- `captureSheet([2, 12, 27])`: camera A, camera B, camera A again.
