import type { Range } from "./parse";

export type SourceEdit =
  | { readonly kind: "prop"; readonly id: string; readonly prop: string; readonly range: Range; readonly text: string }
  | { readonly kind: "text"; readonly id: string; readonly range: Range; readonly text: string }
  | { readonly kind: "insert"; readonly id: string; readonly range: Range; readonly text: string }
  | { readonly kind: "remove"; readonly id: string; readonly range: Range; readonly text: "" }
  | { readonly kind: "move"; readonly id: string; readonly range: Range; readonly text: string; readonly from: Range }
  | { readonly kind: "bake"; readonly id: string; readonly range: Range; readonly text: string }
  | { readonly kind: "defaults"; readonly id: string; readonly range: Range; readonly text: string };

/** Splice edits into the text, last range first, refusing overlaps. */
export function applyEdits(text: string, edits: readonly SourceEdit[]): string {
  const splices: { range: Range; text: string }[] = [];
  for (const e of edits) {
    if (e.kind === "move") {
      splices.push({ range: e.from, text: "" });
      splices.push({ range: e.range, text: e.text });
    } else {
      splices.push({ range: e.range, text: e.text });
    }
  }
  splices.sort((a, b) => b.range[0] - a.range[0] || b.range[1] - a.range[1]);
  let out = text;
  let lastStart = Number.POSITIVE_INFINITY;
  for (const s of splices) {
    if (s.range[1] > lastStart) throw new Error(`overlapping edits at ${s.range[0]}..${s.range[1]}`);
    out = out.slice(0, s.range[0]) + s.text + out.slice(s.range[1]);
    lastStart = s.range[0];
  }
  return out;
}

/** Widen an element range to swallow its own line(s): leading indentation and the trailing newline. */
export function lineRange(text: string, range: Range): Range {
  let start = range[0];
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  if (/^\s*$/.test(text.slice(lineStart, start))) start = lineStart;
  let end = range[1];
  const rest = text.slice(end).match(/^[ \t]*\r?\n/);
  if (rest) end += rest[0].length;
  return [start, end];
}
