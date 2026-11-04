// The browser export: headless Chromium runs the real Player and draws each frame (three.js, Motion, CSS, any React),
// captures it with drawElementImage and encodes it with WebCodecs. Node gets the encoded pieces back and joins them
// with the sound it mixes itself, so the export sounds the same whichever engine drew the pictures.
import type { AssetManifest } from "@cutcraft/kit";
import type { MediaResolver } from "@cutcraft/player/engine";

import type { OverlayFont } from "../overlays";
import type { PageApi, SegmentRequest } from "./page/protocol";
import { type PageServer, servePage } from "./server";

const PLAYER_WARNING = "[cutcut/player] ";
/** Bytes read from the page per call: base64 over the DevTools protocol, so kept well under its message limit. */
const READ_CHUNK = 4 * 1024 * 1024;
const FLAGS = [
  // HTML-in-Canvas: the export captures the page's DOM, WebGL and canvases with drawElementImage.
  "--enable-features=CanvasDrawElement",
  // A paint is not held back to the display's refresh rate.
  "--disable-gpu-vsync",
  "--disable-frame-rate-limit",
  "--autoplay-policy=no-user-gesture-required",
  // Without a GPU, WebGL runs on SwiftShader. The page runs only the file being exported, so the opt-in is safe here.
  "--enable-unsafe-swiftshader",
];

export interface BrowserEngineOptions {
  /** The cut file's source text, its props and manifest: the page loads and resolves the file itself. */
  readonly source: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly manifest: AssetManifest;
  readonly media: MediaResolver;
  /** Every face to set text in: the file's, read in Node, and any passed beside it (`--font`). */
  readonly fonts?: readonly OverlayFont[];
  /** A Chromium or Chrome binary; default `CUTCRAFT_CHROMIUM`, then Playwright's own browser. */
  readonly executablePath?: string;
  /** Messages the page warns with (an asset it cannot read, an engine that is missing). */
  readonly warn?: (message: string) => void;
}

interface Browser {
  newPage(options: object): Promise<Page>;
  close(): Promise<void>;
}
interface Page {
  goto(url: string): Promise<unknown>;
  on(event: string, listener: (value: never) => void): void;
  waitForFunction(fn: string, arg?: unknown, options?: { timeout: number }): Promise<unknown>;
  evaluate<T>(fn: string): Promise<T>;
  evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>;
}

export class BrowserEngine {
  private constructor(
    private readonly browser: Browser,
    private readonly page: Page,
    private readonly server: PageServer,
    readonly composition: PageApi["composition"],
  ) {}

  static async open(options: BrowserEngineOptions): Promise<BrowserEngine> {
    const chromium = await loadChromium();
    const executablePath = options.executablePath ?? process.env.CUTCRAFT_CHROMIUM;
    const server = await servePage(
      { source: options.source, props: options.props ?? {}, manifest: options.manifest },
      options.media,
      options.fonts ?? [],
    );
    let browser: Browser | null = null;
    try {
      browser = await chromium
        .launch({ headless: true, args: FLAGS, ...(executablePath ? { executablePath } : {}) })
        .catch((error: unknown) => {
          throw new Error(
            `the browser export could not start Chromium (${error instanceof Error ? error.message.split("\n")[0] : String(error)}); set CUTCRAFT_CHROMIUM to a Chrome or Chromium 153+ binary`,
          );
        });
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const pageErrors: string[] = [];
      page.on("pageerror", (e: Error) => pageErrors.push(e.message));
      page.on("console", (m: { type(): string; text(): string }) => {
        // The player's own warnings only; the browser's GPU driver messages are not about the file.
        const text = m.text();
        if (m.type() === "warning" && text.startsWith(PLAYER_WARNING))
          options.warn?.(text.slice(PLAYER_WARNING.length));
      });
      await page.goto(server.url);
      await page
        .waitForFunction("window.__cutcraft !== undefined || window.__cutcraftError !== undefined", undefined, {
          timeout: 60_000,
        })
        .catch(() => {
          throw new Error(`the export page did not load${pageErrors.length ? `: ${pageErrors.join("; ")}` : ""}`);
        });
      const failed = await page.evaluate<string | undefined>("window.__cutcraftError");
      if (failed) throw new Error(`the export page could not load the file: ${failed.split("\n")[0]}`);
      const composition = await page.evaluate<PageApi["composition"]>("window.__cutcraft.composition");
      return new BrowserEngine(browser, page, server, composition);
    } catch (error) {
      await browser?.close();
      await server.close();
      throw error;
    }
  }

  /** Frames [first, last) encoded into a small container with timestamps from 0, as a render worker returns them. */
  async segment(request: SegmentRequest): Promise<Uint8Array> {
    const length = await this.page.evaluate((r: SegmentRequest) => window.__cutcraft!.segment(r), request);
    return this.read(length);
  }

  /** One frame as a PNG or JPEG. */
  async still(t: number, type: "image/png" | "image/jpeg", quality?: number): Promise<Uint8Array> {
    const length = await this.page.evaluate(
      ({ t, type, quality }: { t: number; type: "image/png" | "image/jpeg"; quality: number | undefined }) =>
        window.__cutcraft!.still(t, type, quality),
      { t, type, quality },
    );
    return this.read(length);
  }

  /** Asset errors the page's player has reported so far. */
  errors(): Promise<readonly string[]> {
    return this.page.evaluate<readonly string[]>("[...window.__cutcraft.errors]");
  }

  async close(): Promise<void> {
    await this.browser.close().catch(() => undefined);
    await this.server.close();
  }

  private async read(length: number): Promise<Uint8Array> {
    const bytes = new Uint8Array(length);
    for (let offset = 0; offset < length; offset += READ_CHUNK) {
      const part = await this.page.evaluate(
        ({ offset, size }: { offset: number; size: number }) => window.__cutcraft!.read(offset, size),
        { offset, size: READ_CHUNK },
      );
      bytes.set(Buffer.from(part, "base64"), offset);
    }
    return bytes;
  }
}

interface Chromium {
  launch(options: object): Promise<Browser>;
}

/** playwright-core is optional: only the browser export needs it. */
async function loadChromium(): Promise<Chromium> {
  try {
    const playwright = (await import("playwright-core")) as unknown as { chromium: Chromium };
    return playwright.chromium;
  } catch {
    throw new Error(
      "the browser export needs playwright-core (`npm install playwright-core`) and a Chrome or Chromium 153+ binary",
    );
  }
}

declare global {
  interface Window {
    __cutcraft?: PageApi;
  }
}
