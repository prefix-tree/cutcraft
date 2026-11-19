// Every edit an editor offers, on every video in the repository, written back into the file. For each file and each
// edit that applies to it:
//
// - the edit runs and changes the timeline;
// - it leaves no errors behind (an edit that would is refused with BREAKS_FILE; those are in REFUSALS);
// - it folds into the file's text with nothing skipped, and the file read back resolves to the same timeline the
//   editor holds, errors included: what the editor shows is what the file says;
// - it undoes, back to the timeline the file started with.
//
// Edits the editor must refuse are refused with a reason and change nothing. A last case applies every edit in a row
// to the same file and folds them once, as a session in the editor does.
//
// Before each edit and refusal runs, `can()` is asked and must give the answer `execute()` then gives, and an edit
// that is about one element is among that element's `affordances()`.
import { describe, expect, it } from "vitest";

import { type ActionInput, actionTarget, affordances, type ResolvedState } from "@uberscene/kit";
import { foldToSource, lint } from "@uberscene/kit/source";

import { serialize } from "../helpers";
import { CORPUS, type CorpusFile, executorFor, resolveText } from "./corpus";
import { EDITS, REFUSALS } from "./edits";

/** The errors of a timeline, comparable across two resolves of it. */
const errorsOf = (state: ResolvedState): string[] =>
  [...state.errors].map((e) => `${e.code} ${e.id ?? ""} ${"prop" in e ? (e.prop ?? "") : ""}`).sort();

/** Folds what the editor did into the file, reads the file back as the next session would, and checks they agree. */
function expectWrittenBack(file: CorpusFile, exec: ReturnType<typeof executorFor>, clean: boolean): void {
  const folded = foldToSource(file.text, exec.log(), exec.state());
  expect(folded.skipped).toEqual([]);
  const reloaded = resolveText(folded.text, file.manifest, file.files);
  expect(errorsOf(reloaded)).toEqual(errorsOf(exec.state()));
  expect(serialize(reloaded)).toEqual(serialize(exec.state()));
  if (clean) expect(lint(folded.text, { manifest: file.manifest }).filter((d) => d.severity === "error")).toEqual([]);
}

describe.each(CORPUS.map((file) => [file.name, file] as const))("%s", (name, file) => {
  const start = resolveText(file.text, file.manifest, file.files);
  const applies = (r: (typeof REFUSALS)[number]): boolean => r.on === undefined || r.on.includes(name);
  /** Edits this file refuses instead of taking: they are checked as refusals below. */
  const replaced = new Set(REFUSALS.filter(applies).flatMap((r) => (r.replaces ? [r.replaces] : [])));
  const picked = EDITS.filter((edit) => !replaced.has(edit.name))
    .map((edit) => ({ edit, input: edit.pick(start) }))
    .filter((e): e is { edit: (typeof EDITS)[number]; input: ActionInput } => e.input !== undefined);

  it("loads with no errors", () => {
    expect(start.errors).toEqual([]);
  });

  it.each(picked.map((p) => [p.edit.name, p.input] as const))("%s", (_edit, input) => {
    const exec = executorFor(file);
    const before = serialize(exec.state());
    const target = actionTarget(input);
    if (target !== undefined) expect(affordances(exec.state(), target)?.actions).toContain(input.type);
    expect(exec.can(input)).toEqual({ ok: true });
    const result = exec.execute(input);
    expect(result.errors ?? []).toEqual([]);
    expect(result.ok).toBe(true);
    expect(serialize(exec.state())).not.toEqual(before);

    expect(exec.state().errors).toEqual([]);

    expectWrittenBack(file, exec, true);

    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
  });

  const refused = REFUSALS.filter(applies)
    .map((r) => ({ refusal: r, input: r.pick(start) }))
    .filter((r) => r.input !== undefined);
  it.each(refused.map((r) => [r.refusal.name, r.refusal.code, r.input as ActionInput] as const))(
    "%s",
    (_name, code, input) => {
      const exec = executorFor(file);
      const before = serialize(exec.state());
      const asked = exec.can(input);
      const result = exec.execute(input);
      expect(asked).toEqual({ ok: false, errors: result.errors });
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

describe("the refusals", () => {
  it("each name files and edits that exist, and find something to refuse on each file", () => {
    const names = new Set(EDITS.map((e) => e.name));
    for (const r of REFUSALS) {
      if (r.replaces) expect(names.has(r.replaces)).toBe(true);
      for (const f of r.on ?? []) {
        const file = CORPUS.find((c) => c.name === f) as CorpusFile;
        expect(file).toBeDefined();
        expect(r.pick(resolveText(file.text, file.manifest, file.files))).toBeDefined();
      }
    }
  });
});
