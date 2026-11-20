# 0014. Captions follow the clips

## Context

A caption's `start` and `end` took composition seconds, and a `word:`
reference on a caption resolved to the word's time *in the asset*, which is
not where the word plays once the clip is trimmed. `<Captions src>` was
documented as generating cues from the transcript and did not. The model
computed caption times by hand from the clip placement, and a trim broke
them.

## Decision

1. A word, shot or silence reference on a `<Caption>` under
   `<Captions src="asset:x">` means the composition time at which that
   asset second plays: the first clip or audio on a visible track that plays
   `x` and covers the second gives `start + (second − in) / speed`. A second
   no clip plays is `UNKNOWN_REF`. Numbers and `marker:` references keep
   their meaning.
2. `<Captions src>` with no literal `<Caption>` children generates them in
   the resolver, from every transcript word the timeline plays, grouped into
   cues that break at a sentence end, at a pause longer than `maxGap`, at a
   clip boundary, or when a cue would pass `maxChars` or `maxDuration`. The
   cues are generated elements (`editable: "generated"`, parent the
   `<Captions>`), with `words` in composition time.
3. The first edit to a generated cue writes all cues into the file as
   literal children, as patches, then applies the edit. The inverse is
   `caption/setAll` with no nodes, which removes the literals so generation
   resumes. The fold needs nothing new; `bake` prints generated cues inside
   their parent, not after it.

## Consequences

- A caption is written once and survives every trim of the clip it belongs
  to. The model writes `start="word:12"`, not `start={0}`.
- Captions resolve after track placement, in a pass of their own, and the
  generated nodes are memoised per `<Captions>` on the plays of their asset,
  so an unchanged timeline keeps the same placements.
- Multicam cuts still bake as siblings after the generator; cues bake as
  children. The rule is whether the parent's capabilities list the kind.
- Speed ramps and reversed clips are not followed by captions yet; the
  mapping uses the clip's constant `speed`.
