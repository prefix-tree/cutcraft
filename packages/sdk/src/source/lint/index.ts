import type { AssetManifest } from "../../manifest/types";
import { applyEdits, type SourceEdit } from "../edits";
import { buildSourceIndex, type SourceIndex } from "../index";
import type { Range } from "../parse";
import type { Deprecation } from "./deprecations";
import { rules } from "./rules";

export interface Diagnostic {
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly range: Range;
  readonly id?: string;
  readonly prop?: string;
  /**
   * The edits that put it right, when there is one right answer: `fixSource` applies them. Two diagnostics with the
   * same edits are one fix, so a rule may give every finding on an element the edits that mend the whole element.
   */
  readonly fix?: readonly SourceEdit[];
}

export interface LintOptions {
  readonly manifest?: AssetManifest;
  readonly rules?: readonly string[];
  /** Old spellings to report, beside the kit's own list: what the `deprecated-props` rule reads. */
  readonly deprecations?: readonly Deprecation[];
}

export type LintRule = (index: SourceIndex, options: LintOptions) => Diagnostic[];

/** Static checks on a video file: the conventions that keep it editable by the UI. */
export function lint(text: string, options: LintOptions = {}): Diagnostic[] {
  const index = buildSourceIndex(text);
  const enabled = options.rules ? rules.filter((r) => options.rules!.includes(r.name)) : rules;
  const out: Diagnostic[] = [];
  for (const rule of enabled) out.push(...rule.check(index, options));
  return out.sort((a, b) => a.range[0] - b.range[0]);
}

export interface FixResult {
  /** The file with every fix applied. */
  readonly text: string;
  /** The diagnostics whose fix was applied, in the order they were mended. */
  readonly applied: readonly Diagnostic[];
  /** What the fixed file still reports: findings with no fix, and any a fix could not reach. */
  readonly remaining: readonly Diagnostic[];
}

/** How many times `fixSource` lints and fixes before it stops: a fix that keeps making work for itself ends here. */
const FIX_ROUNDS = 10;

/**
 * Lints the file and applies every fix the diagnostics carry, then lints again, until none applies. In one round a
 * fix that touches text another fix already claimed waits for the next, so no two edits ever overlap.
 */
export function fixSource(text: string, options: LintOptions = {}): FixResult {
  const applied: Diagnostic[] = [];
  let current = text;
  for (let round = 0; round < FIX_ROUNDS; round++) {
    const fixable = lint(current, options).filter((d) => d.fix && d.fix.length > 0);
    const claimed: Range[] = [];
    const chosen = new Set<string>();
    const edits: SourceEdit[] = [];
    let mended = 0;
    for (const diagnostic of fixable) {
      const fix = diagnostic.fix as readonly SourceEdit[];
      const key = JSON.stringify(fix);
      if (!chosen.has(key)) {
        const ranges = fix.flatMap(rangesOf);
        if (ranges.some((r) => claimed.some((c) => touches(r, c)))) continue;
        claimed.push(...ranges);
        edits.push(...fix);
        chosen.add(key);
      }
      applied.push(diagnostic);
      mended++;
    }
    if (mended === 0) break;
    const next = applyEdits(current, edits);
    if (next === current) break;
    current = next;
  }
  return { text: current, applied, remaining: lint(current, options) };
}

function rangesOf(edit: SourceEdit): Range[] {
  return edit.kind === "move" ? [edit.range, edit.from] : [edit.range];
}

/** Two ranges that share text, or meet at a point: either way their order would matter. */
function touches(a: Range, b: Range): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

export { rules };
