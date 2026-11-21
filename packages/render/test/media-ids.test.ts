// An asset id reaches the file system and the export's local server, where code in the file can fetch any URL. Only
// the ids an `asset:` reference allows are looked up; anything that could name another file is refused.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { directoryResolver, isAssetId } from "../src/media";
import { servePage } from "../src/web/server";

const root = mkdtempSync(join(tmpdir(), "uberscene-media-ids-"));
const media = join(root, "media");
mkdirSync(media);
writeFileSync(join(root, "secret.txt"), "the host's own file");
writeFileSync(join(media, "clip.mp4"), "video bytes");
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("asset ids", () => {
  it("takes what an asset: reference allows", () => {
    for (const id of ["clip", "talk_2", "my-clip.v2", "a.b"]) expect(isAssetId(id)).toBe(true);
  });

  it("refuses anything that could name another file", () => {
    for (const id of ["", "..", "../secret.txt", "../../.ssh/id_rsa", "a/b", "a\\b", "x..y", "%2e%2e", "/etc/passwd"])
      expect(isAssetId(id)).toBe(false);
  });

  it("directoryResolver refuses a path before it builds one", async () => {
    const resolver = directoryResolver(media, { assets: {} });
    await expect(resolver.resolve("clip")).resolves.toMatchObject({ kind: "path" });
    await expect(resolver.resolve("../secret")).rejects.toThrow(/not an asset id/);
    await expect(resolver.resolve("../secret.txt")).rejects.toThrow(/not an asset id/);
  });

  it("the export's server answers /media/../ with nothing", async () => {
    const server = await servePage(
      { fps: 30 } as unknown as Parameters<typeof servePage>[0],
      directoryResolver(media, { assets: {} }),
    );
    try {
      const ok = await fetch(new URL("media/clip", server.url));
      expect(ok.status).toBe(200);
      expect(await ok.text()).toBe("video bytes");
      for (const path of [
        "/media/..%2Fsecret.txt",
        "/media/..%2F..%2Fsecret.txt",
        "/media/%2E%2E%2Fsecret.txt",
        "/media/..%5Csecret.txt",
      ]) {
        const res = await fetch(new URL(path.slice(1), server.url));
        expect(res.status).toBe(404);
        expect(await res.text()).not.toContain("host's own file");
      }
      expect(server.mediaErrors).toEqual([]);
    } finally {
      await server.close();
    }
  }, 60_000);
});
