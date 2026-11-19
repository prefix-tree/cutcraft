import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { blockSheet, formatBlocks, listBlocks } from "../src";
import { decodePng } from "../src/png";

const scratch = join(import.meta.dirname, ".tmp", "blocks");
beforeAll(() => mkdirSync(scratch, { recursive: true }));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("listBlocks", () => {
  it("lists the blocks that ship, in name order, each with what it is for, its props and its preview", () => {
    const blocks = listBlocks();
    expect(blocks.map((b) => b.name)).toEqual(["character-wall", "hundred-cells", "point-list"]);
    const cells = blocks.find((b) => b.name === "hundred-cells");
    expect(cells?.component).toBe("HundredCells");
    expect(cells?.useWhen.length).toBeGreaterThan(0);
    expect(cells?.beats).toEqual(["fill", "next"]);
    expect(cells?.props.find((p) => p.key === "accent")).toMatchObject({ kind: "color", value: "$accent" });
    expect(cells?.props.find((p) => p.key === "total")).toMatchObject({ kind: "number", value: 100 });
    for (const b of blocks) expect([b.name, b.preview?.endsWith("preview.png")]).toEqual([b.name, true]);
  });

  it("keeps the blocks whose words mention every word of --for", () => {
    expect(listBlocks({ for: "count" }).map((b) => b.name)).toEqual(["hundred-cells"]);
    expect(listBlocks({ for: "Background letters" }).map((b) => b.name)).toEqual(["character-wall"]);
    expect(listBlocks({ for: "steps" }).map((b) => b.name)).toEqual(["point-list"]);
    expect(listBlocks({ for: "a word no block has" })).toEqual([]);
  });

  it("keeps the blocks laid out for --aspect, and names the shapes it takes", () => {
    expect(listBlocks({ aspect: "9:16" })).toHaveLength(3);
    expect(listBlocks({ aspect: "16:9" })).toEqual([]);
    expect(() => listBlocks({ aspect: "2:1" })).toThrow(/--aspect wants one of 9:16, 16:9, 1:1, 4:5/);
  });
});

describe("formatBlocks", () => {
  it("prints each block with its uses, its props and the line that places it", () => {
    const text = formatBlocks(listBlocks({ for: "count" }));
    expect(text).toContain("1. hundred-cells  Hundred cells  (9:16, 4 s)");
    expect(text).toContain("use when: count up to a big number");
    expect(text).toContain("timed by: fill, next");
    expect(text).toContain('<Layer id="hundred-cells" …><HundredCells … /></Layer>');
    expect(formatBlocks([])).toBe("no block matches\n");
  });
});

describe("blockSheet", () => {
  it("pastes the previews into one image, a row of them, numbered in the listing's order", async () => {
    const out = join(scratch, "blocks.png");
    const blocks = listBlocks();
    const drawn = await blockSheet(blocks, out);
    const sheet = decodePng(readFileSync(out));
    const cell = decodePng(readFileSync(blocks[0]?.preview as string));
    expect(drawn.names).toEqual(blocks.map((b) => b.name));
    expect(drawn.columns).toBe(3);
    expect([sheet.width, sheet.height]).toEqual([3 * cell.width + 4 * 8, cell.height + 2 * 8]);
  });

  it("draws nothing for a filter that keeps nothing", async () => {
    await expect(blockSheet([], join(scratch, "none.png"))).rejects.toThrow(/the filter matches none/);
  });
});

describe("uberscene blocks", () => {
  const cli = (...args: string[]) =>
    execFileSync(process.execPath, ["--import", "tsx", join(import.meta.dirname, "..", "src", "cli.ts"), ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

  it("prints the blocks as JSON rows with --json", () => {
    const rows = JSON.parse(cli("blocks", "--for", "count", "--json")) as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual(["hundred-cells"]);
  });

  it("writes a sheet with --sheet and lists the blocks drawn on it", () => {
    const out = join(scratch, "cli.png");
    const text = cli("blocks", "--sheet", out);
    expect(text).toContain("3. point-list");
    expect(decodePng(readFileSync(out)).width).toBeGreaterThan(0);
  });
});
