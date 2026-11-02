// Spike runner: serve the export page, render a scenario in Chrome, write the MP4 and print fps. Throwaway.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const scenario = process.argv[2] ?? "cuts";
const footage = join(import.meta.dirname, "..", "bench", ".cache", "scenarios", "footage.mp4");
const server = await createServer({ configFile: join(import.meta.dirname, "vite.config.ts"), logLevel: "error" });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", args: ["--enable-features=CanvasDrawElement", "--autoplay-policy=no-user-gesture-required", ...(process.env.SPIKE_ARGS ?? "").split(" ").filter(Boolean)] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error") console.error("page:", m.text()); });
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  await page.goto(`http://localhost:5321/?scenario=${scenario}${process.env.SPIKE_HASH ? "&hash=1" : ""}&footage=${encodeURIComponent(footage)}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
  await page.evaluate(() => window.__render({ from: 0, to: 1 })); // warm-up
  const r = await page.evaluate(() => window.__render({})) as { frames: number; fps: number; perFrame: Record<string, number>; mp4: string };
  const out = join(import.meta.dirname, `out-${scenario}.mp4`);
  writeFileSync(out, Buffer.from(r.mp4, "base64"));
  if ((r as { hashes?: number[] }).hashes) writeFileSync(join(import.meta.dirname, `hashes-${scenario}-${process.env.SPIKE_HASH}.json`), JSON.stringify((r as { hashes?: number[] }).hashes));
  console.log(`${scenario}: ${r.frames} frames, ${r.fps.toFixed(1)} fps, per frame ms ${JSON.stringify(r.perFrame)} -> ${out}`);
} finally {
  await browser.close();
  await server.close();
}
