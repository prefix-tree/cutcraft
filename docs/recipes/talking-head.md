# Talking-head cut

A podcast answer cut to its sentences, with the flubbed take dropped, generated captions, a title and a ducked music bed.

## What the manifest gives it

The `podcast` asset has a two-speaker transcript with punctuation and silences. Sentence 5 is a retake of sentence 4 after "Let me say that again."

## What the file shows

- Every clip is one sentence trimmed by `word:` references, so a retranscription or a retrim keeps the edit.
- The retake wins: the first answer and the "say that again" are not on the timeline.
- `<Captions src="asset:podcast" />` is empty, so the cues are generated from the words the timeline plays and follow every trim.
- The bed ducks under the dialogue track by its id.

## The file

<<< ../../recipes/talking-head.tsx

## What the editor can do

- Drag any clip edge: the cue under it follows.
- Edit a cue's text: every cue becomes literal in the file, then the edit applies. Undo brings generation back.
- The title's `color` is bound to `accent`; an inspector change writes `defaults`.

## What to check

- No lint warnings expected.
- `captureSheet([0.2, 4, 12, 20])`: the title over the first sentence, a caption on each frame, nothing black.
