import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { syncGeneratedFiles } from "./generated-files";

const directories = ["reference/elements", "reference/graphics"];
const obsolete = ["reference/elements.md"];
const expected = new Map([
  ["reference/elements/clip.md", "# Clip\nDuration from the schema.\n"],
  ["reference/graphics/counter.md", "# Counter\nExample: 10 → 20.\n"],
  ["reference/rendering.md", "# Rendering\nIgnored props from the runtime.\n"],
  ["sidebar.json", '{"elements":["clip"]}\n'],
]);

function fixture(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "cutcraft-reference-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("check reports missing outputs without creating files or directories", () =>
  fixture((root) => {
    const problems = syncGeneratedFiles(root, expected, { check: true, directories, obsolete });
    assert.equal(problems.length, expected.size);
    assert.ok(problems.every((problem) => problem.startsWith("missing:")));
    assert.deepEqual(readdirSync(root), []);
  }));

test("a fresh generation checks clean without rewriting file contents or timestamps", () =>
  fixture((root) => {
    syncGeneratedFiles(root, expected, { check: false, directories, obsolete });
    const before = [...expected].map(([path]) => statSync(join(root, path)).mtimeMs);
    assert.deepEqual(syncGeneratedFiles(root, expected, { check: true, directories, obsolete }), []);
    assert.deepEqual(
      [...expected].map(([path]) => statSync(join(root, path)).mtimeMs),
      before,
    );
    for (const [path, content] of expected) assert.equal(readFileSync(join(root, path), "utf8"), content);
  }));

test("check detects changed schemas/examples/rendering and sidebar content", () =>
  fixture((root) => {
    syncGeneratedFiles(root, expected, { check: false, directories, obsolete });
    for (const [path] of expected) writeFileSync(join(root, path), "stale output\n");
    const problems = syncGeneratedFiles(root, expected, { check: true, directories, obsolete });
    assert.deepEqual(problems, [...expected.keys()].map((path) => `changed: ${path}`).sort());
    for (const [path] of expected) assert.equal(readFileSync(join(root, path), "utf8"), "stale output\n");
  }));

test("deleted capabilities and obsolete outputs cannot silently survive a check", () =>
  fixture((root) => {
    syncGeneratedFiles(root, expected, { check: false, directories, obsolete });
    mkdirSync(join(root, "reference/elements/nested"));
    writeFileSync(join(root, "reference/elements/nested/removed.md"), "removed element");
    writeFileSync(join(root, obsolete[0]!), "legacy index");
    const problems = syncGeneratedFiles(root, expected, { check: true, directories, obsolete });
    assert.deepEqual(problems, ["obsolete: reference/elements.md", "unexpected: reference/elements/nested/removed.md"]);
    assert.ok(existsSync(join(root, obsolete[0]!)));
    syncGeneratedFiles(root, expected, { check: false, directories, obsolete });
    assert.deepEqual(syncGeneratedFiles(root, expected, { check: true, directories, obsolete }), []);
    assert.ok(!existsSync(join(root, obsolete[0]!)));
  }));

test("generation preserves files outside its explicitly owned output set", () =>
  fixture((root) => {
    writeFileSync(join(root, "hand-authored.md"), "keep");
    syncGeneratedFiles(root, expected, { check: false, directories, obsolete });
    assert.equal(readFileSync(join(root, "hand-authored.md"), "utf8"), "keep");
  }));
