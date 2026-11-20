// `uberscene lint`: the kit's static checks on video files, from the command line, with `--fix` writing the fixes
// the diagnostics carry. A file is read as text and never run, so one that no longer loads can still be mended.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { AssetManifest } from "@uberscene/sdk";
import { type Diagnostic, fixSource, type LintOptions, lint } from "@uberscene/sdk";

import { findManifest } from "./manifest-file";

export interface LintFilesOptions {
  /** A manifest file for every file. Default: each file's nearest `uberscene.json`; with none, the checks that need one are skipped. */
  readonly manifest?: string;
  /** Write each file with its fixes applied. */
  readonly fix?: boolean;
  /** Passed to the kit's `lint`: a subset of rules, more deprecations. */
  readonly lint?: Omit<LintOptions, "manifest">;
}

/** A diagnostic with its place as an editor shows it. */
export interface PlacedDiagnostic {
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  /** 1-based. */
  readonly line: number;
  /** 1-based. */
  readonly column: number;
  readonly id?: string;
  readonly prop?: string;
  /** Whether `--fix` would mend it. */
  readonly fixable: boolean;
}

export interface LintedFile {
  readonly file: string;
  /** What the file reports: after the fixes, with `fix`. */
  readonly diagnostics: readonly PlacedDiagnostic[];
  /** With `fix`: what was mended, placed where it was before the fix that mended it. */
  readonly fixed: readonly PlacedDiagnostic[];
}

/** Lints each file; with `fix`, applies every fix and writes the files that changed. */
export function lintFiles(files: readonly string[], options: LintFilesOptions = {}): LintedFile[] {
  return files.map((file) => {
    const path = resolve(file);
    if (!existsSync(path)) throw new Error(`${file} does not exist`);
    const text = readFileSync(path, "utf8");
    const manifest = manifestFor(path, options.manifest);
    const lintOptions: LintOptions = { ...options.lint, ...(manifest ? { manifest } : {}) };
    if (!options.fix) return { file, diagnostics: lint(text, lintOptions).map((d) => place(text, d)), fixed: [] };
    const result = fixSource(text, lintOptions);
    if (result.text !== text) writeFileSync(path, result.text);
    return {
      file,
      diagnostics: result.remaining.map((d) => place(result.text, d)),
      // Each was found in the text of its own round; the line in the file as it was is the nearest true answer.
      fixed: result.applied.map((d) => place(text, d)),
    };
  });
}

/** One line per diagnostic, as a compiler prints them: `file:line:column severity rule message`. */
export function formatLint(results: readonly LintedFile[]): string {
  return results
    .flatMap((r) => r.diagnostics.map((d) => `${r.file}:${d.line}:${d.column} ${d.severity} ${d.rule} ${d.message}\n`))
    .join("");
}

/** How many error diagnostics are left in all the files. */
export function lintErrors(results: readonly LintedFile[]): number {
  return results.reduce((n, r) => n + r.diagnostics.filter((d) => d.severity === "error").length, 0);
}

function manifestFor(path: string, given: string | undefined): AssetManifest | undefined {
  const file = given ? resolve(given) : findManifest(dirname(path)).path;
  if (!file) return undefined;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as AssetManifest;
  } catch (error) {
    throw new Error(`cannot read the manifest ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function place(text: string, d: Diagnostic): PlacedDiagnostic {
  const at = Math.min(d.range[0], text.length);
  const before = text.slice(0, at);
  const line = before.split("\n").length;
  return {
    rule: d.rule,
    severity: d.severity,
    message: d.message,
    line,
    column: at - (before.lastIndexOf("\n") + 1) + 1,
    ...(d.id === undefined ? {} : { id: d.id }),
    ...(d.prop === undefined ? {} : { prop: d.prop }),
    fixable: d.fix !== undefined && d.fix.length > 0,
  };
}
