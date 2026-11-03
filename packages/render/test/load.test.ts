import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadVideo } from "../src";

const scratch = join(import.meta.dirname, ".tmp", "load");
let dir = "";

const MANIFEST = `export const manifest = { assets: { bars: { id: "bars", kind: "video", duration: 10, fps: 30, width: 640, height: 360 } } };`;

function cut(name: string, imports: string, duration = "1"): string {
  const file = join(dir, name);
  writeFileSync(
    file,
    `${imports}
import { Clip, Composition, Title, Track } from "@cutcraft/kit";
${MANIFEST}
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t"><Clip id="c" src="asset:bars" in={0} out={1} /></Track>
      <Track id="o" layout="free"><Title id="title" start={0} duration={${duration}}>hello</Title></Track>
    </Composition>
  );
}
`,
  );
  return file;
}

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "load-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("loadVideo", () => {
  it("reads the file's own manifest export", async () => {
    const video = await loadVideo(cut("plain.tsx", ""));
    expect(video.manifest.assets.bars?.kind).toBe("video");
    expect(video.state.errors).toEqual([]);
    expect(video.state.items.get("title")?.props.duration).toBe(1);
  });

  it("fails on an import the host does not offer, with the editor's message", async () => {
    const file = cut("lib.tsx", `import { length } from "./lengths";`, "length");
    await expect(loadVideo(file)).rejects.toThrow("which this host does not offer");
  });

  it("loads a module the host offers, relative to the file", async () => {
    writeFileSync(join(dir, "lengths.mjs"), `export const length = 2; export default 0.5;`);
    const file = cut("offered.tsx", `import half, { length } from "./lengths";`, "length + half");
    const video = await loadVideo(file, { imports: { "./lengths": "./lengths.mjs" } });
    expect(video.state.errors).toEqual([]);
    expect(video.state.items.get("title")?.props.duration).toBe(2.5);
  });
});
