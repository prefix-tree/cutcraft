import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { partialPath, writeAtomically } from "../src/atomic";

const scratch = join(import.meta.dirname, ".tmp", "atomic");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "w-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("writeAtomically", () => {
  it("writes a new file and leaves nothing beside it", async () => {
    const out = join(dir, "new.png");
    await writeAtomically(out, new Uint8Array([1, 2, 3]));
    expect([...readFileSync(out)]).toEqual([1, 2, 3]);
    expect(existsSync(partialPath(out))).toBe(false);
  });

  it("replaces the file that was there", async () => {
    const out = join(dir, "old.png");
    writeFileSync(out, "before");
    await writeAtomically(out, new Uint8Array([9]));
    expect([...readFileSync(out)]).toEqual([9]);
    expect(existsSync(partialPath(out))).toBe(false);
  });

  it("keeps the old file and removes the partial when the rename fails", async () => {
    // A folder at the path cannot be renamed over by a file, so the write succeeds and the rename fails.
    const out = join(dir, "taken");
    mkdirSync(out);
    writeFileSync(join(out, "inside"), "kept");
    await expect(writeAtomically(out, new Uint8Array([1]))).rejects.toThrow();
    expect(readFileSync(join(out, "inside"), "utf8")).toBe("kept");
    expect(existsSync(partialPath(out))).toBe(false);
  });

  it("leaves the old file when the partial cannot be written", async () => {
    const out = join(dir, "blocked.png");
    writeFileSync(out, "before");
    // A folder where the partial would go makes the write itself fail.
    mkdirSync(partialPath(out));
    await expect(writeAtomically(out, new Uint8Array([1]))).rejects.toThrow();
    expect(readFileSync(out, "utf8")).toBe("before");
  });
});
