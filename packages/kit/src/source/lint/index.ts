import type { AssetManifest } from "../../manifest/types";
import { buildSourceIndex, type SourceIndex } from "../index";
import type { Range } from "../parse";
import { rules } from "./rules";

export interface Diagnostic {
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly range: Range;
  readonly id?: string;
  readonly prop?: string;
}

export interface LintOptions {
  readonly manifest?: AssetManifest;
  readonly rules?: readonly string[];
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

export { rules };
