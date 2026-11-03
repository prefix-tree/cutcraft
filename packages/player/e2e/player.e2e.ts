import { existsSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { mediaDir } from "./gen-media";

/** Composition time → frame number painted by bars.webm for v1 (source 0–4) and v2 (source 6–9 at 1.5×). */
function expectedCounter(t: number): number {
  if (t < 4 && t < 3.5) return Math.round(t * 30);
  if (t >= 3.5 && t < 5.5) return Math.round((6 + (t - 3.5) * 1.5) * 30);
  return Math.round(t * 30);
}

async function open(page: Page, video = "bars.webm"): Promise<void> {
  await page.goto(`/?video=${video}`);
  await page.waitForSelector("body[data-ready='1']");
}

/** Read the binary strip: ten cells across the top 45 px of the 640×360 canvas. */
async function readCounter(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas[data-el='composition']") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    let n = 0;
    for (let k = 0; k < 10; k++) {
      const x = Math.floor((k + 0.5) * 64);
      const px = ctx.getImageData(x, 20, 1, 1).data;
      if (px[0]! > 128) n |= 1 << k;
    }
    return n;
  });
}

const seek = (page: Page, t: number) => page.evaluate((t) => window.__player!.seekTo(t), t);
const time = (page: Page) => page.evaluate(() => window.__player!.getCurrentTime());

test.describe("player", () => {
  test("draws the exact frame for a time", async ({ page }) => {
    await open(page);
    await seek(page, 1.0);
    expect(await readCounter(page)).toBe(30);
    await seek(page, 2.5);
    expect(await readCounter(page)).toBe(75);
    await seek(page, 4.0);
    expect(Math.abs((await readCounter(page)) - 202)).toBeLessThanOrEqual(1);
    await expect(page.locator("[data-player]")).toHaveAttribute("data-time", "4.0000");
    await expect(page.locator("[data-player]")).toHaveAttribute("data-frame", "120");
  });

  test("seeks accurately to random times", async ({ page }) => {
    await open(page);
    let seed = 7;
    const rnd = (): number => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 20; i++) {
      const t = Math.round(rnd() * 5.4 * 30) / 30;
      if (t >= 3.5 && t < 4) continue;
      await seek(page, t);
      expect(await time(page)).toBeCloseTo(t, 5);
      expect(Math.abs((await readCounter(page)) - expectedCounter(t)), `t=${t}`).toBeLessThanOrEqual(t < 3.5 ? 0 : 1);
    }
  });

  test("plays in real time on the audio clock", async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      window.__frameUpdates = 0;
      window.__player!.addEventListener("frameupdate", () => {
        window.__frameUpdates = (window.__frameUpdates ?? 0) + 1;
      });
    });
    const ctxBefore = await page.evaluate(() => window.__ctx.currentTime);
    await page.evaluate(() => window.__player!.play());
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__player!.pause());
    const t = await time(page);
    expect(t).toBeGreaterThan(1.3);
    expect(t).toBeLessThan(1.8);
    expect(await page.evaluate(() => window.__ctx.state)).toBe("running");
    expect((await page.evaluate(() => window.__ctx.currentTime)) - ctxBefore).toBeGreaterThan(1.0);
    const updates = await page.evaluate(() => window.__frameUpdates ?? 0);
    expect(updates).toBeGreaterThan(30);
    expect(updates).toBeLessThan(60);
    expect(Math.abs((await readCounter(page)) - expectedCounter(t))).toBeLessThanOrEqual(2);
  });

  test("doubles playback at rate 2", async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      window.__player!.playbackRate = 2;
    });
    await page.evaluate(() => window.__player!.play());
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.__player!.pause());
    const t = await time(page);
    expect(t).toBeGreaterThan(1.7);
    expect(t).toBeLessThan(2.5);
  });

  test("crossfades between clips", async ({ page }) => {
    await open(page);
    const pixel = async () =>
      page.evaluate(() => {
        const ctx = (document.querySelector("canvas[data-el='composition']") as HTMLCanvasElement).getContext("2d")!;
        const d = ctx.getImageData(320, 200, 1, 1).data;
        return [d[0]!, d[1]!, d[2]!];
      });
    await seek(page, 5.9);
    const red = await pixel();
    expect(red[0]).toBeGreaterThan(200);
    await seek(page, 6.8);
    const blue = await pixel();
    expect(blue[2]).toBeGreaterThan(200);
    await seek(page, 6.25);
    const mid = await pixel();
    for (let i = 0; i < 3; i++) {
      const blend = (red[i]! + blue[i]!) / 2;
      expect(
        Math.abs(mid[i]! - blend),
        `channel ${i}: red=${red[i]} blue=${blue[i]} mid=${mid[i]}`,
      ).toBeLessThanOrEqual(24);
    }
  });

  test("renders DOM overlays and Layer interiors", async ({ page }) => {
    await open(page);
    await seek(page, 1.0);
    await expect(page.locator("[data-el='t1'][data-kind='title']")).toHaveText("Hello");
    await expect(page.locator("[data-el='l1'] [data-counter]")).toHaveText(String(Math.round(1200 / 3)));
    await seek(page, 5.0);
    await expect(page.locator("[data-el='t1']")).toHaveCount(0);
    await expect(page.locator("[data-el='l1']")).toHaveCount(0);
  });

  test("draws image clips", async ({ page }) => {
    await open(page);
    await seek(page, 5.75);
    const px = await page.evaluate(() => {
      const ctx = (document.querySelector("canvas[data-el='composition']") as HTMLCanvasElement).getContext("2d")!;
      return Array.from(ctx.getImageData(320, 180, 1, 1).data);
    });
    expect(px[0]).toBeGreaterThan(200);
    expect(px[1]).toBeLessThan(60);
    expect(px[2]).toBeLessThan(60);
  });

  test("ends, and loops when asked", async ({ page }) => {
    await open(page);
    const duration = await page.evaluate(() => window.__player!.duration);
    expect(duration).toBeCloseTo(7);
    await page.evaluate(() => {
      window.__ended = 0;
      window.__player!.addEventListener("ended", () => {
        window.__ended = (window.__ended ?? 0) + 1;
      });
    });
    await seek(page, duration - 0.2);
    await page.evaluate(() => window.__player!.play());
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.__ended)).toBe(1);
    expect(await page.evaluate(() => window.__player!.isPlaying())).toBe(false);
    await page.evaluate(() => {
      window.__player!.loop = true;
    });
    await seek(page, duration - 0.2);
    await page.evaluate(() => window.__player!.play());
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.__ended)).toBe(1);
    expect(await time(page)).toBeLessThan(1.5);
    await page.evaluate(() => window.__player!.pause());
  });

  test("renders deterministically and without errors", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    await open(page);
    const snap = () =>
      page.evaluate(async () => {
        await window.__player!.renderFrame(2.5);
        return (document.querySelector("canvas[data-el='composition']") as HTMLCanvasElement).toDataURL();
      });
    const first = await snap();
    await seek(page, 0.4);
    const second = await snap();
    expect(second).toBe(first);
    expect(pageErrors).toEqual([]);
    expect(await page.evaluate(() => window.__errors)).toEqual([]);
    expect(await page.evaluate(() => window.__playerErrors)).toEqual([]);
  });

  test("captures a contact sheet whose cells are the exact frames", async ({ page }) => {
    await open(page);
    await seek(page, 1.0);
    const result = await page.evaluate(async () => {
      const sheet = await window.__player!.captureSheet([1.0, 2.5, 4.0], { columns: 2, cellWidth: 640 });
      const ctx = (sheet as HTMLCanvasElement).getContext("2d")!;
      const read = (ox: number, oy: number): number => {
        let n = 0;
        for (let k = 0; k < 10; k++) {
          const px = ctx.getImageData(ox + Math.floor((k + 0.5) * 64), oy + 20, 1, 1).data;
          if (px[0]! > 128) n |= 1 << k;
        }
        return n;
      };
      return {
        width: sheet.width,
        height: sheet.height,
        cells: [read(0, 0), read(640, 0), read(0, 360)],
        time: window.__player!.getCurrentTime(),
      };
    });
    expect([result.width, result.height]).toEqual([1280, 720]);
    expect(Math.abs(result.cells[0]! - 30)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.cells[1]! - 75)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.cells[2]! - 202)).toBeLessThanOrEqual(1);
    expect(result.time).toBe(1);
    expect(Math.abs((await readCounter(page)) - 30)).toBeLessThanOrEqual(1);
  });

  test("an adjustment filters the footage once, as the export does", async ({ page }) => {
    await page.goto("/?comp=overlays");
    await page.waitForSelector("body[data-ready='1']");
    await seek(page, 0.5);
    const canvasBlue = await page.evaluate(
      () =>
        (document.querySelector("canvas[data-el='composition']") as HTMLCanvasElement)
          .getContext("2d")!
          .getImageData(320, 180, 1, 1).data[2]!,
    );
    // What the viewer sees: the canvas and the DOM above it, composited.
    const png = (await page.locator("[data-player]").screenshot()).toString("base64");
    const screenBlue = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const ctx = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height }).getContext(
        "2d",
      )!;
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(320, 180, 1, 1).data[2]!;
    }, png);
    expect(canvasBlue).toBeGreaterThan(100);
    expect(canvasBlue).toBeLessThan(150);
    expect(Math.abs(screenBlue - canvasBlue)).toBeLessThanOrEqual(4);
  });

  test("blurs the footage behind itself and wipes to the next clip", async ({ page }) => {
    await page.goto("/?comp=transitions");
    await page.waitForSelector("body[data-ready='1']");
    const pixel = (x: number, y: number) =>
      page.evaluate(
        ([x, y]) =>
          Array.from(
            (document.querySelector("canvas[data-el='composition']") as HTMLCanvasElement)
              .getContext("2d")!
              .getImageData(x!, y!, 1, 1).data,
          ),
        [x, y],
      );
    await seek(page, 0.5);
    // The corner is outside the half-size footage: the blurred footage, not the black background.
    expect((await pixel(10, 10))[2]).toBeGreaterThan(150);
    await seek(page, 1.5);
    // Halfway through a left wipe the red image shows on the right half only.
    const right = await pixel(600, 180),
      left = await pixel(40, 180);
    expect(right[0]).toBeGreaterThan(200);
    expect(right[2]).toBeLessThan(60);
    expect(left[0]).toBeLessThan(60);
    expect(left[2]).toBeGreaterThan(150);
  });

  test("decodes h264 when the browser can", async ({ page }) => {
    test.skip(!existsSync(join(mediaDir, "bars.mp4")), "no bars.mp4");
    await page.goto("/");
    const supported = await page.evaluate(
      async () =>
        (await VideoDecoder.isConfigSupported({ codec: "avc1.42E01E", codedWidth: 640, codedHeight: 360 }))
          .supported === true,
    );
    test.skip(!supported, "no h264 decoder in this Chromium");
    await open(page, "bars.mp4");
    await seek(page, 2.5);
    expect(Math.abs((await readCounter(page)) - 75)).toBeLessThanOrEqual(1);
  });
});

declare global {
  interface Window {
    __player: import("@cutcraft/player").PlayerRef | null;
    __ctx: AudioContext;
    __errors: unknown[];
    __playerErrors: unknown[];
    __frameUpdates?: number;
    __ended?: number;
  }
}
