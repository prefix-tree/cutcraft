# 0006. Time references resolve against an asset manifest

## Context

The model never sees pixels or hears audio. It edits against what an ingest
step knows: a transcript with word timings, shot boundaries, silences. If the
file stored seconds, a re-transcription or a re-ingest would silently shift
every cut.

## Decision

`in`, `out`, `at` and caption times accept `TimeRef`s: `"word:12"`,
`"word:23.end"`, `"shot:1"`, `"silence:2"`, `"marker:intro"`, resolved by the
resolver against the manifest. A gesture that changes such a prop writes
seconds. The manifest is data the editor and the player receive with the file.

## Consequences

- The model trims by meaning ("the sentence from word 12 to 23"), which is how
  it reasons anyway.
- The lint checks every `src` against the manifest (`missing-asset`).
- Captions take composition seconds today; generating `<Caption>` children from
  the transcript is a known gap.
