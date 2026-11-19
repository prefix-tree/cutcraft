import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type AssetManifest, collectModule, Executor } from "@uberscene/kit";
import { buildSourceIndex, foldToSource, gatherLocalFiles, loadModule } from "@uberscene/kit/source";

import { addBlock, lineDiff, placeBlock, timingOf, updateBlocks } from "../src/blocks-add";
import { loadVideo } from "../src/load";

const scratch = join(import.meta.dirname, ".tmp", "blocks-add");
const project = join(scratch, "project");
const manifestPath = join(project, "uberscene.json");
const videoPath = join(project, "video.tsx");

const VIDEO = `import { Clip, Composition, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1080} height={1920}>
      <Track id="main">
        <Clip id="talk" src="asset:talk" in={0} out={8} />
      </Track>
      <Track id="graphics" layout="free" />
    </Composition>
  );
}
`;

beforeEach(() => {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(join(project, "scenes"), { recursive: true });
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ assets: { talk: { id: "talk", kind: "video", duration: 10 } } }, null, 2)}\n`,
  );
  writeFileSync(videoPath, VIDEO);
});
afterEach(() => rmSync(scratch, { recursive: true, force: true }));

const manifest = () => JSON.parse(readFileSync(manifestPath, "utf8")) as AssetManifest;
const shipped = (name: string) =>
  readFileSync(join(import.meta.dirname, "..", "..", "..", "blocks", name, "block.tsx"), "utf8");

describe("addBlock", () => {
  it("copies the block beside the manifest and records its version and hash, keeping the assets", () => {
    const added = addBlock("hundred-cells", { cwd: join(project, "scenes") });
    expect(added).toMatchObject({
      status: "copied",
      component: "HundredCells",
      file: join(project, "blocks", "hundred-cells.tsx"),
    });
    expect(readFileSync(added.file, "utf8")).toBe(shipped("hundred-cells"));
    const m = manifest();
    expect(Object.keys(m.assets)).toEqual(["talk"]);
    expect(m.blocks?.["hundred-cells"]?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(m.blocks?.["hundred-cells"]?.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(addBlock("hundred-cells", { cwd: project }).status).toBe("unchanged");
  });

  it("refuses to replace a different file unless forced, and names the blocks for an unknown one", () => {
    addBlock("point-list", { cwd: project });
    const file = join(project, "blocks", "point-list.tsx");
    writeFileSync(file, `${readFileSync(file, "utf8")}// mine\n`);
    expect(() => addBlock("point-list", { cwd: project })).toThrow(/differs from the block; --force replaces it/);
    expect(addBlock("point-list", { cwd: project, force: true }).status).toBe("copied");
    expect(readFileSync(file, "utf8")).toBe(shipped("point-list"));
    expect(() => addBlock("nope", { cwd: project })).toThrow(
      /no block "nope"; the blocks are bar-race, character-wall, chat-reveal, hundred-cells, phone-tap, point-list, quote-build, ranked-list, terminal-typing/,
    );
  });

  it("writes into --dir and starts a manifest when the project has none", () => {
    rmSync(manifestPath);
    const added = addBlock("character-wall", { cwd: project, dir: "src/parts" });
    expect(added.file).toBe(join(project, "src", "parts", "character-wall.tsx"));
    expect(manifest()).toMatchObject({ assets: {}, blocks: { "character-wall": {} } });
  });
});

describe("placeBlock", () => {
  it("imports the copy and places it on the track; its props stay editable with the Layer's handles", async () => {
    const added = addBlock("hundred-cells", { cwd: project });
    const placed = await placeBlock(added, { video: videoPath, track: "graphics", at: "talk", duration: 4 });
    expect(placed.id).toBe("hundred-cells");
    const text = readFileSync(videoPath, "utf8");
    expect(text).toContain('import { HundredCells } from "./blocks/hundred-cells";');
    expect(text).toContain(
      '<Layer id="hundred-cells" anchor="talk" duration={4}>\n          <HundredCells />\n        </Layer>',
    );
    const video = await loadVideo(videoPath);
    expect(video.state.errors).toEqual([]);
    expect([video.state.items.get("hundred-cells")?.start, video.state.items.get("hundred-cells")?.end]).toEqual([
      0, 4,
    ]);

    const files = gatherLocalFiles(text, (p) => {
      const full = join(project, p);
      return existsSync(full) ? readFileSync(full, "utf8") : undefined;
    });
    const tree = collectModule(loadModule(text, { files }) as never, {}, { index: buildSourceIndex(text) });
    const exec = new Executor({ tree, manifest: video.manifest, now: () => 0 });
    expect(
      exec.execute({ type: "layer/setProps", params: { id: "hundred-cells", props: { total: 50, label: "DAYS" } } }).ok,
    ).toBe(true);
    const folded = foldToSource(text, exec.log(), exec.state());
    expect(folded.skipped).toEqual([]);
    expect(folded.text).toContain('<HundredCells total={50} label="DAYS" />');
  });

  it("numbers the id when the block's name is taken, and uses the block's length by default", async () => {
    const added = addBlock("point-list", { cwd: project });
    await placeBlock(added, { video: videoPath, track: "graphics", at: "1.5" });
    const second = await placeBlock(added, { video: videoPath, track: "graphics", at: "talk.end" });
    expect(second.id).toBe("point-list-2");
    const text = readFileSync(videoPath, "utf8");
    expect(text.match(/import \{ PointList \}/g)).toHaveLength(1);
    expect(text).toMatch(/<Layer id="point-list" start=\{1\.5\} duration=\{[\d.]+\}>/);
    expect(text).toContain('<Layer id="point-list-2" anchor="talk.end"');
    expect((await loadVideo(videoPath)).state.errors).toEqual([]);
  });

  it("leaves the video as it was when the placement would break it", async () => {
    const added = addBlock("hundred-cells", { cwd: project });
    await expect(placeBlock(added, { video: videoPath, track: "graphics", at: "missing" })).rejects.toThrow(
      /gave .*video\.tsx errors, so it is left as it was/,
    );
    expect(readFileSync(videoPath, "utf8")).toBe(VIDEO);
    await expect(placeBlock(added, { video: videoPath, track: "nope", at: "1" })).rejects.toThrow(
      /no <Track id="nope">/,
    );
    expect(readFileSync(videoPath, "utf8")).toBe(VIDEO);
  });

  it("reads --at as a start, an anchor or a word of a clip", () => {
    expect(timingOf("2.5")).toEqual({ start: 2.5 });
    expect(timingOf("hook")).toEqual({ anchor: "hook" });
    expect(timingOf("hook.end")).toEqual({ anchor: "hook.end" });
    expect(timingOf("hook@word:14")).toEqual({ anchor: "hook", at: "word:14" });
    expect(() => timingOf("word:14")).toThrow(/name the clip the word is in, as hook@word:14/);
    expect(() => timingOf("hook.mid")).toThrow(/not its middle/);
    expect(() => timingOf("2..4")).toThrow(/give seconds/);
  });
});

describe("placeBlock on a recipe", () => {
  it("places one of the newer blocks in a copy of a recipe, and edits its words through the Layer's handles", async () => {
    const recipes = join(import.meta.dirname, "..", "..", "..", "recipes");
    writeFileSync(manifestPath, readFileSync(join(recipes, "uberscene.json")));
    const spot = join(project, "brand-spot.tsx");
    writeFileSync(spot, readFileSync(join(recipes, "brand-spot.tsx")));
    const added = addBlock("quote-build", { cwd: project });
    const placed = await placeBlock(added, { video: spot, track: "notes", at: "2" });
    expect(placed.id).toBe("quote-build");
    const text = readFileSync(spot, "utf8");
    expect(text).toContain('import { QuoteBuild } from "./blocks/quote-build";');
    const video = await loadVideo(spot);
    expect(video.state.errors).toEqual([]);
    expect(video.state.items.get("quote-build")?.start).toBe(2);

    const files = gatherLocalFiles(text, (p) => {
      const full = join(project, p);
      return existsSync(full) ? readFileSync(full, "utf8") : undefined;
    });
    const tree = collectModule(loadModule(text, { files }) as never, {}, { index: buildSourceIndex(text) });
    const exec = new Executor({ tree, manifest: video.manifest, now: () => 0 });
    const props = { text: "Make it once, then make it better.", stress: ["better"] };
    expect(exec.execute({ type: "layer/setProps", params: { id: "quote-build", props } }).ok).toBe(true);
    const folded = foldToSource(text, exec.log(), exec.state());
    expect(folded.skipped).toEqual([]);
    expect(folded.text).toContain('<QuoteBuild text="Make it once, then make it better." stress={["better"]} />');
    writeFileSync(spot, folded.text);
    expect((await loadVideo(spot)).state.errors).toEqual([]);
  });
});

describe("updateBlocks", () => {
  it("replaces a copy nobody edited, and leaves an edited one with what differs", () => {
    addBlock("hundred-cells", { cwd: project });
    addBlock("point-list", { cwd: project });
    // As if both were added from an older version: the record matches the copy, the copy differs from the block.
    const old = `${shipped("hundred-cells")}// an older version\n`;
    const cells = join(project, "blocks", "hundred-cells.tsx");
    writeFileSync(cells, old);
    const m = manifest();
    const hash = createHash("sha256").update(old).digest("hex");
    writeFileSync(
      manifestPath,
      JSON.stringify({ ...m, blocks: { ...m.blocks, "hundred-cells": { version: "0.4.0", hash } } }),
    );
    const list = join(project, "blocks", "point-list.tsx");
    writeFileSync(
      list,
      readFileSync(list, "utf8").replace("export function PointList", "// tuned\nexport function PointList"),
    );

    const results = updateBlocks([], { cwd: project });
    expect(results.map((r) => [r.name, r.status])).toEqual([
      ["hundred-cells", "updated"],
      ["point-list", "edited"],
    ]);
    expect(readFileSync(cells, "utf8")).toBe(shipped("hundred-cells"));
    expect(manifest().blocks?.["hundred-cells"]?.hash).not.toBe(hash);
    expect(results[1]?.diff).toContain("+// tuned");
    expect(readFileSync(list, "utf8")).toContain("// tuned");

    const forced = updateBlocks(["point-list"], { cwd: project, force: true });
    expect(forced.map((r) => r.status)).toEqual(["replaced"]);
    expect(readFileSync(list, "utf8")).toBe(shipped("point-list"));
    expect(updateBlocks([], { cwd: project }).map((r) => r.status)).toEqual(["current", "current"]);
  });

  it("names what it cannot do: no blocks recorded, an unknown name, a copy that is gone", () => {
    expect(() => updateBlocks([], { cwd: project })).toThrow(/records no blocks/);
    addBlock("point-list", { cwd: project });
    expect(() => updateBlocks(["hundred-cells"], { cwd: project })).toThrow(/records no block "hundred-cells"/);
    rmSync(join(project, "blocks", "point-list.tsx"));
    expect(updateBlocks([], { cwd: project }).map((r) => r.status)).toEqual(["missing"]);
  });
});

describe("lineDiff", () => {
  it("shows the lines only in each text, with context", () => {
    const a = ["a", "b", "c", "d", "e", "f", "g", "h"].join("\n");
    const b = ["a", "b", "c", "D", "e", "f", "g", "h", "i"].join("\n");
    expect(lineDiff(a, b, "old", "new")).toBe(
      ["--- old", "+++ new", "@@ -1,8 +1,9 @@", " a", " b", " c", "-d", "+D", " e", " f", " g", " h", "+i", ""].join(
        "\n",
      ),
    );
  });
});

describe("uberscene blocks add and update", () => {
  const cli = (...args: string[]) =>
    execFileSync(process.execPath, ["--import", "tsx", join(import.meta.dirname, "..", "src", "cli.ts"), ...args], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

  it("adds and places a block, then updates nothing that is current", () => {
    const out = cli("blocks", "add", "hundred-cells", "--into", "video.tsx", "--track", "graphics", "--at", "2");
    expect(out).toContain('<Layer id="hundred-cells" start={2}');
    expect(readFileSync(videoPath, "utf8")).toContain('import { HundredCells } from "./blocks/hundred-cells";');
    expect(cli("blocks", "update")).toBe("");
  });

  it("prints the import line when it only copies, and exits 1 when an update leaves an edited copy", () => {
    expect(cli("blocks", "add", "point-list")).toContain('import { PointList } from "./blocks/point-list";');
    const list = join(project, "blocks", "point-list.tsx");
    writeFileSync(list, `${readFileSync(list, "utf8")}// mine\n`);
    let status = 0;
    let stdout = "";
    try {
      cli("blocks", "update");
    } catch (error) {
      ({ status, stdout } = error as { status: number; stdout: string });
    }
    expect(status).toBe(1);
    expect(stdout).toContain("+// mine");
  });
});
