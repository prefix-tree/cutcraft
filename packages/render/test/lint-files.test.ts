// `uberscene lint`: the kit's checks from the command line, and `--fix` writing what the findings carry.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { formatLint, lintErrors, lintFiles } from "../src/index";

const video = (body: string, extra = "") => `import { Clip, Composition, Layer, Title, Track } from "@uberscene/kit";
${extra}
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="a" src="asset:talk" in={0} out={2} />
      </Track>
      <Track id="over" layout="free">
        ${body}
      </Track>
    </Composition>
  );
}
`;
const MANIFEST = { assets: { talk: { id: "talk", kind: "video", duration: 10, fps: 30, width: 1920, height: 1080 } } };

const CLEAN = video('<Title id="t" start={0} duration={2}>Hi</Title>');
/** An error (two elements share an id) and a fixable warning (the browser's clock through `window`). */
const BROKEN = video(
  '<Title id="a" start={0} duration={2}>Hi</Title>\n        <Layer id="l" start={0} duration={2}><Free /></Layer>',
  "function Free() {\n  return <div>{window.performance.now()}</div>;\n}",
);
/** Only the fixable warning. */
const FIXABLE = video(
  '<Layer id="l" start={0} duration={2}><Free /></Layer>',
  "function Free() {\n  return <div>{window.performance.now()}</div>;\n}",
);

function project(files: Record<string, string>, manifest: unknown = MANIFEST): string {
  const dir = mkdtempSync(join(tmpdir(), "uberscene-lint-"));
  if (manifest !== null) writeFileSync(join(dir, "uberscene.json"), JSON.stringify(manifest));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

describe("lintFiles", () => {
  it("reports nothing for a clean file", () => {
    const dir = project({ "video.tsx": CLEAN });
    const results = lintFiles([join(dir, "video.tsx")]);
    expect(results.map((r) => r.diagnostics)).toEqual([[]]);
    expect(lintErrors(results)).toBe(0);
    expect(formatLint(results)).toBe("");
  });

  it("places each finding by line and column and says whether a fix is there", () => {
    const dir = project({ "video.tsx": BROKEN });
    const file = join(dir, "video.tsx");
    const results = lintFiles([file]);
    expect(results[0]?.diagnostics.map((d) => [d.line, d.column, d.severity, d.rule, d.fixable])).toEqual([
      [3, 16, "warning", "free-code-clock", true],
      [12, 16, "error", "unique-ids", false],
    ]);
    expect(lintErrors(results)).toBe(1);
    expect(formatLint(results).split("\n")[1]).toBe(`${file}:12:16 error unique-ids id "a" is used more than once`);
  });

  it("reads the nearest manifest, takes one by name, and without any skips the checks that need one", () => {
    const text = video('<Clip id="b" src="asset:gone" start={0} duration={1} />');
    const dir = project({ "video.tsx": text });
    const rules = (file: string, manifest?: string) =>
      lintFiles([file], manifest ? { manifest } : {})[0]?.diagnostics.map((d) => d.rule);
    expect(rules(join(dir, "video.tsx"))).toEqual(["missing-asset"]);
    const bare = project({ "video.tsx": text }, null);
    // tmpdir has no uberscene.json above it.
    expect(rules(join(bare, "video.tsx"))).toEqual([]);
    expect(rules(join(bare, "video.tsx"), join(dir, "uberscene.json"))).toEqual(["missing-asset"]);
  });

  it("with fix, writes the file mended and reports what is left", () => {
    const dir = project({ "video.tsx": BROKEN });
    const file = join(dir, "video.tsx");
    const results = lintFiles([file], { fix: true });
    expect(readFileSync(file, "utf8")).toBe(BROKEN.replace("window.performance", "performance"));
    expect(results[0]?.fixed.map((d) => [d.line, d.rule])).toEqual([[3, "free-code-clock"]]);
    expect(results[0]?.diagnostics.map((d) => d.rule)).toEqual(["unique-ids"]);
  });

  it("with fix, moves old spellings a caller's table names", () => {
    const dir = project({ "video.tsx": video('<Title id="t" size={64} start={0} duration={2}>Hi</Title>') });
    const file = join(dir, "video.tsx");
    const results = lintFiles([file], {
      fix: true,
      lint: { deprecations: [{ element: "Title", prop: "size", to: { into: "style" }, since: "0.6.0" }] },
    });
    expect(readFileSync(file, "utf8")).toContain('<Title id="t" style={{ size: 64 }} start={0} duration={2}>');
    expect(results[0]?.diagnostics).toEqual([]);
  });

  it("names a file that is not there", () => {
    expect(() => lintFiles(["/nowhere/video.tsx"])).toThrow("/nowhere/video.tsx does not exist");
  });
});

describe("uberscene lint", () => {
  // The command runs in a folder outside the repository, so the TypeScript loader is named by its file.
  const tsx = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
  const run = (cwd: string, ...args: string[]) =>
    spawnSync(process.execPath, ["--import", tsx, join(import.meta.dirname, "..", "src", "cli.ts"), "lint", ...args], {
      cwd,
      encoding: "utf8",
    });

  it("exits 0 and prints nothing for clean files, 1 when an error is left", () => {
    const dir = project({ "clean.tsx": CLEAN, "broken.tsx": BROKEN, "warned.tsx": FIXABLE });
    const clean = run(dir, "clean.tsx");
    expect([clean.status, clean.stdout]).toEqual([0, ""]);
    // A warning alone does not fail the command.
    const warned = run(dir, "warned.tsx");
    expect(warned.status).toBe(0);
    expect(warned.stdout).toMatch(/^warned\.tsx:3:16 warning free-code-clock window\.performance /);
    const both = run(dir, "clean.tsx", "broken.tsx");
    expect(both.status).toBe(1);
    expect(both.stdout.split("\n").map((l) => l.split(" ").slice(0, 3).join(" "))).toEqual([
      "broken.tsx:3:16 warning free-code-clock",
      "broken.tsx:12:16 error unique-ids",
      "",
    ]);
  });

  it("--json prints the findings as data", () => {
    const dir = project({ "broken.tsx": BROKEN });
    const out = run(dir, "broken.tsx", "--json");
    expect(out.status).toBe(1);
    const data = JSON.parse(out.stdout) as { file: string; diagnostics: Record<string, unknown>[]; fixed: unknown[] }[];
    expect(data).toHaveLength(1);
    expect(data[0]?.file).toBe("broken.tsx");
    expect(data[0]?.fixed).toEqual([]);
    expect(data[0]?.diagnostics[1]).toEqual({
      rule: "unique-ids",
      severity: "error",
      message: 'id "a" is used more than once',
      line: 12,
      column: 16,
      id: "a",
      fixable: false,
    });
  });

  it("--fix rewrites the file, says how many it fixed, and exits by what is left", () => {
    const dir = project({ "warned.tsx": FIXABLE, "broken.tsx": BROKEN });
    const warned = run(dir, "warned.tsx", "--fix");
    expect([warned.status, warned.stdout, warned.stderr]).toEqual([0, "", "warned.tsx: fixed 1\n"]);
    expect(readFileSync(join(dir, "warned.tsx"), "utf8")).toBe(FIXABLE.replace("window.performance", "performance"));
    const broken = run(dir, "broken.tsx", "--fix");
    expect(broken.status).toBe(1);
    expect(broken.stdout).toMatch(/^broken\.tsx:12:16 error unique-ids /);
  });

  it("wants a file", () => {
    const out = run(project({}));
    expect(out.status).toBe(2);
    expect(out.stderr).toContain("uberscene lint <file.tsx>...");
  });
});
