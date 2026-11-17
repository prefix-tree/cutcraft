// Every edit an editor offers, on every video in the repository, written back into the file. For each file and each
// edit that applies to it:
//
// - the edit runs and changes the timeline;
// - it leaves no errors behind, unless it is a known gap (known-gaps.ts), which must leave exactly its errors;
// - it folds into the file's text with nothing skipped, and the file read back resolves to the same timeline the
//   editor holds, errors included: what the editor shows is what the file says;
// - it undoes, back to the timeline the file started with.
//
// Edits the editor must refuse are refused with a reason and change nothing. A last case applies every edit in a row
// to the same file and folds them once, as a session in the editor does.
import { describe, expect, it } from "vitest";

import type { ActionInput, ResolvedState } from "@cutcraft/kit";
import { foldToSource, lint } from "@cutcraft/kit/source";

import { serialize } from "../helpers";
import { CORPUS, type CorpusFile, executorFor, resolveText } from "./corpus";
import { EDITS, REFUSALS } from "./edits";
import { KNOWN_GAPS, knownGap } from "./known-gaps";

/** The errors of a timeline, comparable across two resolves of it. */
const errorsOf = (state: ResolvedState): string[] =>
  [...state.errors].map((e) => `${e.code} ${e.id ?? ""} ${"prop" in e ? (e.prop ?? "") : ""}`).sort();
const codesOf = (state: ResolvedState): string[] => [...new Set(state.errors.map((e) => e.code))].sort();

/** Folds what the editor did into the file, reads the file back as the next session would, and checks they agree. */
function expectWrittenBack(file: CorpusFile, exec: ReturnType<typeof executorFor>, clean: boolean): void {
  const folded = foldToSource(file.text, exec.log(), exec.state());
  expect(folded.skipped).toEqual([]);
  const reloaded = resolveText(folded.text, file.manifest);
  expect(errorsOf(reloaded)).toEqual(errorsOf(exec.state()));
  expect(serialize(reloaded)).toEqual(serialize(exec.state()));
  if (clean) expect(lint(folded.text, { manifest: file.manifest }).filter((d) => d.severity === "error")).toEqual([]);
}

describe.each(CORPUS.map((file) => [file.name, file] as const))("%s", (name, file) => {
  const start = resolveText(file.text, file.manifest);
  const picked = EDITS.map((edit) => ({ edit, input: edit.pick(start) })).filter(
    (e): e is { edit: (typeof EDITS)[number]; input: ActionInput } => e.input !== undefined,
  );

  it("loads with no errors", () => {
    expect(start.errors).toEqual([]);
  });

  it.each(picked.map((p) => [p.edit.name, p.input] as const))("%s", (edit, input) => {
    const exec = executorFor(file);
    const before = serialize(exec.state());
    const result = exec.execute(input);
    expect(result.errors ?? []).toEqual([]);
    expect(result.ok).toBe(true);
    expect(serialize(exec.state())).not.toEqual(before);

    const gap = knownGap(name, edit);
    // A gap that no longer happens is fixed: remove it from known-gaps.ts.
    expect(codesOf(exec.state())).toEqual(gap ? [...gap].sort() : []);

    expectWrittenBack(file, exec, gap === undefined);

    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
  });

  const refused = REFUSALS.map((r) => ({ refusal: r, input: r.pick(start) })).filter((r) => r.input !== undefined);
  it.each(refused.map((r) => [r.refusal.name, r.refusal.code, r.input as ActionInput] as const))(
    "%s",
    (_name, code, input) => {
      const exec = executorFor(file);
      const before = serialize(exec.state());
      const result = exec.execute(input);
      expect(result.ok).toBe(false);
      expect(result.errors?.map((e) => e.code)).toContain(code);
      expect(serialize(exec.state())).toEqual(before);
      expect(foldToSource(file.text, exec.log(), exec.state()).text).toBe(file.text);
    },
  );

  it("takes every edit in a row and writes them back at once", () => {
    const exec = executorFor(file);
    let applied = 0;
    for (const { input } of picked) {
      // A later edit may no longer apply (its clip was deleted or split): that is the editor refusing, not a bug.
      if (exec.execute(input).ok) applied++;
    }
    expect(applied).toBeGreaterThan(0);
    expectWrittenBack(file, exec, exec.state().errors.length === 0);
  });
});

describe("the known gaps", () => {
  it("each name a file and an edit that exist", () => {
    const names = new Set(EDITS.map((e) => e.name));
    for (const [file, edit] of KNOWN_GAPS) {
      expect(CORPUS.some((f) => f.name === file)).toBe(true);
      expect(names.has(edit)).toBe(true);
    }
  });
});
