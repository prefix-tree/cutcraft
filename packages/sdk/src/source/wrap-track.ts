// The clips written straight in a `<Composition>` are its main track, with no tag of its own. A setting of that
// track (a mute, a lock, a place above another track) needs one: this writes `<Track id="main">` around them.
import { MAIN_TRACK_ID } from "@uberscene/kit/schema";

import { applyEdits, lineRange, type SourceEdit } from "./edits";
import { buildSourceIndex } from "./index";
import { kitImportEdit } from "./insert-layer";
import type { Range } from "./parse";

/**
 * The text with its main clips wrapped in `<Track id="main">`, where the first of them stands; clips written further
 * down, between tracks, are gathered into it in order. `also` names more ranges that belong to the track (a helper
 * call that makes its clips). A file whose main track already has its tag, or has no main clips, is returned as it is.
 */
export function wrapMainTrack(text: string, also: readonly Range[] = []): string {
  const index = buildSourceIndex(text);
  const track = index.elements.get(MAIN_TRACK_ID);
  if (!track?.implicit) return text;
  const lines = [...[...index.elements.values()].filter((e) => e.parent === MAIN_TRACK_ID).map((e) => e.range), ...also]
    .map((range) => lineRange(text, range))
    .sort((a, b) => a[0] - b[0]);
  // Runs of lines that follow one another: the first run is where the track is written.
  const runs: Range[] = [];
  for (const line of lines) {
    const last = runs[runs.length - 1];
    if (last && /^\s*$/.test(text.slice(last[1], line[0]))) runs[runs.length - 1] = [last[0], line[1]];
    else if (!last || line[0] >= last[1]) runs.push(line);
  }
  const first = runs[0];
  if (!first) return text;
  const indent = track.indent;
  const body = runs
    .map((run) => reindent(text.slice(run[0], run[1]), indent))
    .join("")
    .replace(/\n*$/, "\n");
  const eol = text.slice(first[1] - 1, first[1]) === "\n" ? "\n" : "";
  const wrapped = `${indent}<Track id="${MAIN_TRACK_ID}">\n${body}${indent}</Track>${eol}`;
  const edits: SourceEdit[] = [{ kind: "text", id: MAIN_TRACK_ID, range: first, text: wrapped }];
  for (const run of runs.slice(1)) edits.push({ kind: "remove", id: MAIN_TRACK_ID, range: run, text: "" });
  const imported = kitImportEdit(text, MAIN_TRACK_ID, "Track");
  if (imported) edits.push(imported);
  return applyEdits(text, edits);
}

/** The lines one step under `indent`, keeping how they sit against each other. */
function reindent(block: string, indent: string): string {
  const rows = block.replace(/\n$/, "").split("\n");
  const depth = Math.min(...rows.filter((r) => r.trim() !== "").map((r) => r.length - r.trimStart().length));
  return `${rows.map((r) => (r.trim() === "" ? "" : `${indent}  ${r.slice(depth)}`)).join("\n")}\n`;
}
