import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { installSkill } from "../src";

const scratch = join(import.meta.dirname, ".tmp", "skills");
let project = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  project = mkdtempSync(join(scratch, "p-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("installSkill", () => {
  it("writes the skill and its references into .claude/skills/uberscene, with a record of what it wrote", () => {
    const result = installSkill({ cwd: project });
    expect(result.dir).toBe(join(project, ".claude", "skills", "uberscene"));
    expect(result.files).toContain("SKILL.md");
    expect(result.files).toContain(join("references", "cli.md"));
    const skill = readFileSync(join(result.dir, "SKILL.md"), "utf8");
    expect(skill).toMatch(/^---\nname: uberscene\n/);
    const marker = JSON.parse(readFileSync(join(result.dir, ".uberscene-skill.json"), "utf8"));
    expect(marker.version).toBe(result.version);
    expect(Object.keys(marker.files)).toEqual(result.files);
  });

  it("replaces a folder it wrote when nothing in it changed, and names the version it held", () => {
    const result = installSkill({ cwd: project });
    expect(result.previous).toBe(result.version);
  });

  it("keeps edits to the installed skill unless forced", () => {
    const dir = join(project, ".claude", "skills", "uberscene");
    writeFileSync(join(dir, "SKILL.md"), "my own notes\n");
    writeFileSync(join(dir, "extra.md"), "added by hand\n");
    expect(() => installSkill({ cwd: project })).toThrow(
      /changes since the skill was installed \(SKILL\.md, extra\.md\)/,
    );
    expect(readFileSync(join(dir, "SKILL.md"), "utf8")).toBe("my own notes\n");
    installSkill({ cwd: project, force: true });
    expect(readFileSync(join(dir, "SKILL.md"), "utf8")).toMatch(/^---\nname: uberscene/);
    expect(existsSync(join(dir, "extra.md"))).toBe(false);
  });

  it("does not write over a folder it did not write, and takes another folder with dir", () => {
    const other = mkdtempSync(join(scratch, "o-"));
    mkdirSync(join(other, "skills", "uberscene"), { recursive: true });
    writeFileSync(join(other, "skills", "uberscene", "SKILL.md"), "someone else's\n");
    expect(() => installSkill({ cwd: other, dir: "skills/uberscene" })).toThrow(
      /did not write; run again with --force/,
    );
    const fresh = installSkill({ cwd: other, dir: ".agents/skills/uberscene" });
    expect(fresh.dir).toBe(join(other, ".agents", "skills", "uberscene"));
  });
});
