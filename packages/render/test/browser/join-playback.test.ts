// A file made of copied and re-encoded pieces must play in a browser straight through its joins, and seek across them.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

import { manifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderVideo } from "../../src";

const scratch = join(import.meta.dirname, "..", ".tmp", "join-playback");

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

it("plays a file with copied pieces through to the end without an error, and seeks across the joins", async () => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  const dir = mkdtempSync(join(scratch, "j-"));
  const file = join(dir, "video.tsx");
  // Source frames 66-182 of bars.webm, whose keyframes are at 90 and 180: the pieces join at output frames 24 and 114.
  writeFileSync(
    file,
    `import { Clip, Composition, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(manifest)};
export default function Video() {
  return <Composition fps={30} width={640} height={360}><Track id="m"><Clip id="c" src="asset:bars" in={2.2} out={6.1} /></Track></Composition>;
}
`,
  );
  const loaded = await loadVideo(file);
  const out = join(dir, "out.webm");
  const result = await renderVideo({
    state: loaded.state,
    media: directoryResolver(mediaDir, loaded.manifest),
    out,
    keyFrameInterval: 1,
    smartCopy: true,
    silent: true,
  });
  expect(result.copiedFrames).toBe(90);

  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${out}`);
    const played = await page.evaluate(async () => {
      const v = document.querySelector("video") as HTMLVideoElement;
      v.muted = true;
      await v.play();
      await new Promise((resolve) => v.addEventListener("ended", resolve, { once: true }));
      const quality = v.getVideoPlaybackQuality();
      const seeks: number[] = [];
      for (const t of [0.5, 0.82, 1.5, 3.7, 3.85, 1.0, 3.88]) {
        v.currentTime = t;
        await new Promise((resolve) => v.addEventListener("seeked", resolve, { once: true }));
        seeks.push(Math.round(v.currentTime * 100) / 100);
      }
      return { error: v.error?.message ?? null, duration: v.duration, total: quality.totalVideoFrames, seeks };
    });
    expect(played.error).toBeNull();
    expect(played.duration).toBeCloseTo(3.9, 1);
    expect(played.total).toBe(117);
    expect(played.seeks).toEqual([0.5, 0.82, 1.5, 3.7, 3.85, 1, 3.88]);
  } finally {
    await browser.close();
  }
}, 120_000);
