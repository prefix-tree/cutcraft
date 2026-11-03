// The libraries on the video's clock, in the real Player in Chromium: seek to a time, read what is drawn, seek away
// and back, and expect the same picture.
import { chromium, type Browser, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";

let server: ViteDevServer, browser: Browser, page: Page;

beforeAll(async () => {
  server = await createServer({ configFile: new URL("./vite.config.ts", import.meta.url).pathname });
  await server.listen();
  const address = server.httpServer!.address() as { port: number };
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://localhost:${address.port}/`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 }).catch((e: unknown) => { throw new Error(`page not ready: ${errors.join("; ") || String(e)}`); });
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function at(t: number): Promise<{ red: number; motionOpacity: number; motionX: number; cssOpacity: number }> {
  await page.evaluate((s) => window.__seek(s), t);
  return page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>(`[data-el="three"] canvas`)!;
    const probe = document.createElement("canvas");
    probe.width = gl.width; probe.height = gl.height;
    const ctx = probe.getContext("2d")!;
    ctx.drawImage(gl, 0, 0);
    const [red] = ctx.getImageData(gl.width >> 1, gl.height >> 1, 1, 1).data;
    const x = new DOMMatrix(getComputedStyle(document.querySelector("#motion-value")!).transform).m41;
    return {
      red: red!,
      motionOpacity: Number(getComputedStyle(document.querySelector("#motion-box")!).opacity),
      motionX: x,
      cssOpacity: Number(getComputedStyle(document.querySelector("#css-box")!).opacity),
    };
  });
}

describe("free code on the video's clock", () => {
  it("draws a three.js scene at the layer's time, both ways", async () => {
    const one = await at(1), three = await at(3), back = await at(1);
    expect(three.red).toBeGreaterThan(one.red + 20);
    expect(back.red).toBe(one.red);
  });

  it("sets a Motion timeline to the layer's time, both ways", async () => {
    expect((await at(1)).motionOpacity).toBeCloseTo(0.5, 1);
    expect((await at(0.5)).motionOpacity).toBeCloseTo(0.25, 1);
    expect((await at(3)).motionOpacity).toBe(1);
    expect((await at(1)).motionOpacity).toBeCloseTo(0.5, 1);
  });

  it("drives Motion values from the layer's time", async () => {
    expect((await at(2)).motionX).toBeCloseTo(200, 0);
    expect((await at(1)).motionX).toBeCloseTo(100, 0);
  });

  it("holds CSS animations at the layer's time, both ways", async () => {
    expect((await at(1)).cssOpacity).toBeCloseTo(0.5, 1);
    expect((await at(0.5)).cssOpacity).toBeCloseTo(0.25, 1);
    expect((await at(1.5)).cssOpacity).toBeCloseTo(0.75, 1);
  });
});
