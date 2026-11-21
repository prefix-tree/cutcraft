// What an export does when an asset fails, and when it is cancelled: stop early under "throw", go on in silence under
// "continue", and stop at once on a cancel rather than after the piece in flight.
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, type LoadedVideo, loadVideo, renderVideo } from "../../src";

const composition = join(import.meta.dirname, "..", "..", "..", "player", "e2e", "app", "composition.tsx");
let loaded: LoadedVideo;
let dir = "";

beforeAll(async () => {
  generateMedia();
  dir = mkdtempSync(join(tmpdir(), "uberscene-asset-errors-"));
  loaded = await loadVideo(composition);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const nowhere = () => directoryResolver(join(dir, "nowhere"), loaded.manifest);

describe("an asset that fails", () => {
  it("stops the export after the first piece it fails in, not after the last", async () => {
    const progress: number[] = [];
    await expect(
      renderVideo({
        state: loaded.state,
        source: loaded.source,
        media: nowhere(),
        out: join(dir, "stops.webm"),
        silent: true,
        onProgress: (p) => progress.push(p.frame),
      }),
    ).rejects.toThrow(/no media file for asset/);
    // The composition is four pieces long: before, every one was drawn and reported first.
    expect(progress).toEqual([]);
  });

  it("is silent under continue, with a warning, when it is a clip with sound", async () => {
    const out = join(dir, "continues.webm");
    const result = await renderVideo({
      state: loaded.state,
      source: loaded.source,
      media: nowhere(),
      out,
      to: 2,
      onAssetError: "continue",
    });
    expect(existsSync(out)).toBe(true);
    expect(result.frames).toBe(60);
    expect(result.warnings.some((w) => /asset error: .*is silent/.test(w))).toBe(true);
    expect(result.warnings.some((w) => /^asset error: .*no media file/.test(w))).toBe(true);
  });
});

describe("a cancelled export", () => {
  it("stops while a piece is being drawn, not after it", async () => {
    const controller = new AbortController();
    const media = directoryResolver(mediaDir, loaded.manifest);
    const progress: number[] = [];
    let reportedAtCancel = -1;
    // Cancelled when the page asks for the logo, which it does while a later piece is drawn.
    const cancelling = {
      resolve: (id: string) => {
        if (id === "logo" && !controller.signal.aborted) {
          reportedAtCancel = progress.length;
          controller.abort();
        }
        return media.resolve(id);
      },
    };
    const out = join(dir, "cancelled.webm");
    await expect(
      renderVideo({
        state: loaded.state,
        source: loaded.source,
        media: cancelling,
        out,
        silent: true,
        signal: controller.signal,
        onProgress: (p) => progress.push(p.frame),
      }),
    ).rejects.toThrow("render aborted");
    // The pieces done before the cancel were reported; the one in flight is not finished and reported after it.
    expect(reportedAtCancel).toBeGreaterThanOrEqual(0);
    expect(progress).toHaveLength(reportedAtCancel);
    expect(existsSync(out)).toBe(false);
    expect(existsSync(`${out}.partial`)).toBe(false);
  });

  it("does not start when cancelled before it begins", async () => {
    await expect(
      renderVideo({
        state: loaded.state,
        source: loaded.source,
        media: directoryResolver(mediaDir, loaded.manifest),
        out: join(dir, "never.webm"),
        signal: AbortSignal.abort(),
      }),
    ).rejects.toThrow("render aborted");
  });
});
