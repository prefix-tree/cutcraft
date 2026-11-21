import { useMemo } from "react";

import { useEditor } from "@uberscene/editor";
import { foldToSource } from "@uberscene/sdk";

export interface SourceView {
  /** The file with every edit so far written into it. */
  readonly text: string;
  /** The 0-based lines of `text` that differ from the file as it was opened. */
  readonly changed: ReadonlySet<number>;
  /** Edits the fold could not write, with the reason (an element built by code, for one). */
  readonly skipped: readonly { readonly id: string; readonly reason: string }[];
}

/** The file as the edits so far leave it: the executor's log folded into the opened text. */
export function useSource(original: string): SourceView {
  const { state, executor } = useEditor();
  return useMemo(() => {
    if (!executor || executor.log().net.size === 0) return { text: original, changed: new Set<number>(), skipped: [] };
    const folded = foldToSource(original, executor.log(), state);
    return { text: folded.text, changed: changedLines(original, folded.text), skipped: folded.skipped };
  }, [original, executor, state]);
}

/** The lines of `after` that a line diff against `before` does not keep (a longest common subsequence). */
function changedLines(before: string, after: string): Set<number> {
  const a = before.split("\n");
  const b = after.split("\n");
  // The common head and tail are kept as they are; only the middle is diffed.
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const x = a.slice(head, a.length - tail);
  const y = b.slice(head, b.length - tail);
  const lcs: number[][] = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      lcs[i]![j] = x[i] === y[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  const changed = new Set<number>();
  let i = 0;
  let j = 0;
  while (j < y.length) {
    if (i < x.length && x[i] === y[j]) {
      i++;
      j++;
    } else if (i < x.length && lcs[i + 1]![j]! >= lcs[i]![j + 1]!) i++;
    else changed.add(head + j++);
  }
  return changed;
}
