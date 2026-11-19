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
import { Clip, Composition, Title, Track } from "@uberscene/kit";
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
    const file = cut("lib.tsx", `import { length } from "lengths";`, "length");
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

describe("loadVideo, the file's own modules", () => {
  const VIDEO = `import { Composition, Layer, Track } from "@uberscene/kit";
import { Badge } from "./blocks/badge";
${MANIFEST}
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="o" layout="free"><Layer id="badge" start={0} duration={1}><Badge text="hi" /></Layer></Track>
    </Composition>
  );
}
`;

  it("reads them from the project and passes them on to the export", async () => {
    const project = mkdtempSync(join(scratch, "own-"));
    mkdirSync(join(project, "blocks"));
    writeFileSync(
      join(project, "blocks", "badge.tsx"),
      `import { tone } from "../lib/tone";\nexport const Badge = ({ text }: { text: string }) => <b style={{ color: tone }}>{text}</b>;`,
    );
    mkdirSync(join(project, "lib"));
    writeFileSync(join(project, "lib", "tone.ts"), `export const tone = "#ff5a1f";`);
    writeFileSync(join(project, "video.tsx"), VIDEO);
    const video = await loadVideo(join(project, "video.tsx"));
    expect(video.state.errors).toEqual([]);
    expect(Object.keys(video.source.files ?? {}).sort()).toEqual(["blocks/badge.tsx", "lib/tone.ts"]);
  });

  it("says which import is missing, and where it looked", async () => {
    const project = mkdtempSync(join(scratch, "own-"));
    writeFileSync(join(project, "video.tsx"), VIDEO);
    await expect(loadVideo(join(project, "video.tsx"))).rejects.toThrow(
      /imports "\.\/blocks\/badge", which is not there \(looked for blocks\/badge\.tsx, blocks\/badge\.ts/,
    );
  });

  it("refuses a module outside the project, the folder of the nearest uberscene.json", async () => {
    const outer = mkdtempSync(join(scratch, "own-"));
    const project = join(outer, "project");
    mkdirSync(join(project, "videos"), { recursive: true });
    writeFileSync(join(project, "uberscene.json"), JSON.stringify({ assets: {} }));
    writeFileSync(join(project, "shared.tsx"), "export const Badge = () => null;");
    writeFileSync(join(outer, "secret.tsx"), "export const Badge = () => null;");
    // Up a folder, but still inside the project: allowed.
    writeFileSync(join(project, "videos", "ok.tsx"), VIDEO.replace("./blocks/badge", "../shared"));
    expect((await loadVideo(join(project, "videos", "ok.tsx"))).source.files).toHaveProperty(["../shared.tsx"]);
    writeFileSync(join(project, "videos", "out.tsx"), VIDEO.replace("./blocks/badge", "../../secret"));
    await expect(loadVideo(join(project, "videos", "out.tsx"))).rejects.toThrow(
      /\.\.\/\.\.\/secret\.tsx is outside the project/,
    );
  });
});
