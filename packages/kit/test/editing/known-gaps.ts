// Edits the editor accepts today though they leave the timeline with errors. Each entry is checked to still produce
// exactly these errors, so fixing one makes its test fail: then delete the entry. Nothing here is a write-back bug:
// the file folded back from these edits holds the same errors the editor does.
//
// What is left, by error:
// - UNKNOWN_REF: a trim or a delete takes away a word that a caption cue starts or ends on. Decision 0014 makes a word
//   no clip plays an error, so the cue is not clipped to what still plays; the edit does not move the cue either.

/** `[file, edit, the error codes it leaves]`. */
export const KNOWN_GAPS: readonly (readonly [string, string, readonly string[]])[] = [
  ["examples/launch-recap/video.tsx", "trims the end of a clip", ["UNKNOWN_REF"]],
  ["examples/launch-recap/video.tsx", "trims the start of a clip", ["UNKNOWN_REF"]],
  ["examples/launch-recap/video.tsx", "deletes a clip from a sequence", ["UNKNOWN_REF"]],
]; // biome-ignore format: one gap per line

/** The error codes an edit is known to leave in a file, or nothing when it must leave none. */
export function knownGap(file: string, edit: string): readonly string[] | undefined {
  return KNOWN_GAPS.find(([f, e]) => f === file && e === edit)?.[2];
}
