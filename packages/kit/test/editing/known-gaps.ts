// Edits the editor accepts today though they leave the timeline with errors. Each entry is checked to still produce
// exactly these errors, so fixing one makes its test fail: then delete the entry. Nothing here is a write-back bug:
// the file folded back from these edits holds the same errors the editor does.
//
// The causes, by error:
// - DANGLING_ANCHOR: a clip is deleted and the titles anchored to it are left pointing at nothing.
// - NOT_ADJACENT: a clip is deleted and the transition that joined it to its neighbour is left with one side.
// - INVALID_ANCHOR: a trim or a split takes away the word a title is anchored on (after a split the word is in the
//   new second half, but the title still names the first).
// - UNKNOWN_REF: a trim takes away a word that a caption cue starts or ends on.

/** `[file, edit, the error codes it leaves]`. */
export const KNOWN_GAPS: readonly (readonly [string, string, readonly string[]])[] = [
  ["recipes/product-demo.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR"]],
  ["recipes/stats.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR"]],
  ["recipes/talking-head.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR"]],
  ["recipes/variants.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR"]],
  ["recipes/vertical-podcast.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR"]],
  ["examples/showcase/captions.tsx", "splits a clip in two", ["INVALID_ANCHOR"]],
  ["examples/showcase/captions.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR"]],
  ["examples/showcase/data.tsx", "trims the start of a clip", ["INVALID_ANCHOR"]],
  ["examples/showcase/data.tsx", "splits a clip in two", ["INVALID_ANCHOR"]],
  ["examples/showcase/data.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR"]],
  ["examples/showcase/edit.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR", "NOT_ADJACENT"]],
  ["examples/showcase/kinetic.tsx", "trims the start of a clip", ["INVALID_ANCHOR"]],
  ["examples/showcase/kinetic.tsx", "splits a clip in two", ["INVALID_ANCHOR"]],
  ["examples/showcase/kinetic.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR"]],
  ["examples/showcase/launch.tsx", "splits a clip in two", ["INVALID_ANCHOR"]],
  ["examples/showcase/launch.tsx", "deletes a clip from a sequence", ["DANGLING_ANCHOR", "NOT_ADJACENT"]],
  ["examples/launch-recap/video.tsx", "trims the end of a clip", ["UNKNOWN_REF"]],
  ["examples/launch-recap/video.tsx", "trims the start of a clip", ["UNKNOWN_REF"]],
  ["examples/launch-recap/video.tsx", "deletes a clip from a sequence", ["NOT_ADJACENT", "UNKNOWN_REF"]],
]; // biome-ignore format: one gap per line

/** The error codes an edit is known to leave in a file, or nothing when it must leave none. */
export function knownGap(file: string, edit: string): readonly string[] | undefined {
  return KNOWN_GAPS.find(([f, e]) => f === file && e === edit)?.[2];
}
