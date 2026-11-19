import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { directoryResolver, findManifest, loadVideo } from "../src";
import { mediaFolders } from "../src/manifest-file";

const scratch = join(import.meta.dirname, ".tmp", "manifest-file");
let root = "";

const manifest = (id: string) =>
  JSON.stringify({ assets: { [id]: { id, kind: "video", duration: 10, fps: 30, width: 640, height: 360 } } });

const CUT = (id: string) => `import { Clip, Composition, Track } from "@uberscene/kit";
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t"><Clip id="c" src="asset:${id}" in={0} out={1} /></Track>
    </Composition>
  );
}
`;

function folder(...parts: string[]): string {
  const dir = join(root, ...parts);
  mkdirSync(dir, { recursive: true });
  return dir;
}

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  root = mkdtempSync(join(scratch, "m-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("findManifest", () => {
  it("still finds a cutcraft.json from before the rename", () => {
    const top = folder("legacy");
    const deep = folder("legacy", "videos");
    writeFileSync(join(top, "cutcraft.json"), manifest("a"));
    expect(findManifest(deep).path).toBe(join(top, "cutcraft.json"));
  });

  it("finds uberscene.json in a parent folder, and the nearest one first", () => {
    const top = folder("near");
    const deep = folder("near", "videos", "launch");
    writeFileSync(join(top, "uberscene.json"), manifest("far"));
    expect(findManifest(deep).path).toBe(join(top, "uberscene.json"));
    writeFileSync(join(top, "videos", "uberscene.json"), manifest("near"));
    const found = findManifest(deep);
    expect(found.path).toBe(join(top, "videos", "uberscene.json"));
    expect(found.checked).toEqual([deep, join(top, "videos")]);
  });

  it("reads manifest.json beside the video but never from a parent folder", () => {
    const top = folder("old");
    const deep = folder("old", "videos");
    writeFileSync(join(top, "manifest.json"), manifest("bars"));
    expect(findManifest(top).path).toBe(join(top, "manifest.json"));
    const found = findManifest(deep);
    expect(found.path).toBeUndefined();
    expect(found.checked.slice(0, 2)).toEqual([deep, top]);
  });
});

describe("loadVideo without a manifest option", () => {
  it("uses the project's uberscene.json from a video in a subfolder", async () => {
    const top = folder("project");
    const deep = folder("project", "videos");
    writeFileSync(join(top, "uberscene.json"), manifest("bars"));
    writeFileSync(join(deep, "video.tsx"), CUT("bars"));
    const video = await loadVideo(join(deep, "video.tsx"));
    expect(video.manifestPath).toBe(join(top, "uberscene.json"));
    expect(video.state.errors).toEqual([]);
    expect(video.state.items.get("c")?.end).toBe(1);
  });

  it("lists the folders it looked in when there is none", async () => {
    const deep = folder("empty", "videos");
    writeFileSync(join(deep, "video.tsx"), CUT("bars"));
    const failure = loadVideo(join(deep, "video.tsx"));
    await expect(failure).rejects.toThrow("no uberscene.json in");
    await expect(failure).rejects.toThrow(`  ${deep}\n  ${join(root, "empty")}\n`);
    await expect(failure).rejects.toThrow("uberscene add");
  });

  it("says so when the file it found is not a manifest", async () => {
    const top = folder("wrong");
    writeFileSync(join(top, "manifest.json"), JSON.stringify({ name: "An extension", manifest_version: 3 }));
    writeFileSync(join(top, "video.tsx"), CUT("bars"));
    await expect(loadVideo(join(top, "video.tsx"))).rejects.toThrow('is not an asset manifest: it has no "assets"');
  });
});

describe("media folders", () => {
  it("looks beside the video, then beside the manifest, then in its media folder", async () => {
    const top = folder("shared");
    const deep = folder("shared", "videos");
    const media = folder("shared", "media");
    writeFileSync(join(media, "bars.webm"), "");
    const folders = mediaFolders(deep, join(top, "uberscene.json"));
    expect(folders).toEqual([deep, top, media]);
    const resolver = directoryResolver(folders, JSON.parse(manifest("bars")));
    await expect(resolver.resolve("bars")).resolves.toEqual({ kind: "path", path: join(media, "bars.webm") });
    await expect(resolver.resolve("nope")).rejects.toThrow(`in ${deep} or ${top} or ${media} (it is not in`);
  });

  it("is the video's folder alone when the manifest is not a file", () => {
    expect(mediaFolders("/a/b", undefined)).toEqual(["/a/b"]);
    expect(mediaFolders("/a/b", "/a/b/uberscene.json")).toEqual(["/a/b", "/a/b/media"]);
  });
});
