// The export engine: headless Chrome runs the real Player and draws each frame (footage, titles, three.js, Motion, CSS,
// any React), captures it with drawElementImage and encodes it with WebCodecs. It also mixes and encodes the soundtrack
// and measures the overlays for the layout check. Node serves the page, asks for pieces, and joins what comes back.
import type { AssetManifest } from "@cutcraft/kit";
import type { MediaResolver } from "@cutcraft/player/engine";

import type { FontFile } from "../fonts";
import { findChrome } from "./chrome";
import type { AudioRequest, InkBounds, PageApi, SegmentRequest, SheetRequest } from "./page/protocol";
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
  readonly fonts?: readonly FontFile[];
  /** A Chrome or Chromium binary; default `CUTCRAFT_CHROMIUM`, then Chrome for Testing from the cache (see `findChrome`). */
  readonly executablePath?: string;
  /** Pages that render pieces at the same time; default 1. */
  readonly tabs?: number;
  /** Effects a contact sheet may draw a frame without. */
  readonly disabled?: readonly string[];
  /** Messages the page warns with (an asset it cannot read, an engine that is missing). */
  readonly warn?: (message: string) => void;
  /** Progress while Chrome is being downloaded. */
  readonly log?: (message: string) => void;
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

export interface Soundtrack {
  readonly bytes: Uint8Array | null;
  readonly codec: string | null;
  readonly warnings: readonly string[];
}

export class BrowserEngine {
  /** Pages not rendering anything now, and callers waiting for one. */
  private readonly idle: Page[];
  private readonly waiting: ((page: Page) => void)[] = [];

  private constructor(
    private readonly browser: Browser,
    private readonly pages: readonly Page[],
    private readonly server: PageServer,
    readonly composition: PageApi["composition"],
  ) {
    this.idle = [...pages];
  }

  /** How many pieces render at once. */
  get tabs(): number {
    return this.pages.length;
  }

  static async open(options: BrowserEngineOptions): Promise<BrowserEngine> {
    const chromium = await loadChromium();
    const executablePath = await findChrome({
      executablePath: options.executablePath,
      ...(options.log ? { log: options.log } : {}),
    });
    const server = await servePage(
      {
        source: options.source,
        props: options.props ?? {},
        manifest: options.manifest,
        ...(options.disabled?.length ? { disabled: options.disabled } : {}),
      },
      options.media,
      options.fonts ?? [],
    );
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true, args: FLAGS, executablePath }).catch((error: unknown) => {
        throw new Error(
          `the export could not start Chrome at ${executablePath} (${error instanceof Error ? error.message.split("\n")[0] : String(error)}); set CUTCRAFT_CHROMIUM to a Chrome or Chromium 153+ binary`,
        );
      });
      const pages: Page[] = [];
      const tabs = Math.max(1, Math.floor(options.tabs ?? 1));
      for (let i = 0; i < tabs; i++)
        pages.push(await openPage(browser, server.url, i === 0 ? options.warn : undefined));
      const composition = await (pages[0] as Page).evaluate<PageApi["composition"]>("window.__cutcraft.composition");
      return new BrowserEngine(browser, pages, server, composition);
    } catch (error) {
      await browser?.close();
      await server.close();
      throw error;
    }
  }

  /** Frames [first, last) encoded into a small container with timestamps from 0, on the next free page. */
  async segment(request: SegmentRequest): Promise<Uint8Array> {
    return this.on(async (page) => {
      const length = await page.evaluate((r: SegmentRequest) => window.__cutcraft!.segment(r), request);
      return read(page, length);
    });
  }

  /** One frame as a PNG or JPEG. */
  async still(t: number, type: "image/png" | "image/jpeg", quality?: number): Promise<Uint8Array> {
    return this.on(async (page) => {
      const length = await page.evaluate(
        ({ t, type, quality }: { t: number; type: "image/png" | "image/jpeg"; quality: number | undefined }) =>
          window.__cutcraft!.still(t, type, quality),
        { t, type, quality },
      );
      return read(page, length);
    });
  }

  /** A contact sheet of frames, drawn in one page; with `keepFrames`, each cell's full frame too. */
  async sheet(
    request: SheetRequest,
  ): Promise<{ bytes: Uint8Array; width: number; height: number; frames: Uint8Array[] }> {
    return this.on(async (page) => {
      const result = await page.evaluate((r: SheetRequest) => window.__cutcraft!.sheet(r), request);
      const bytes = await read(page, result.length);
      const frames: Uint8Array[] = [];
      if (request.keepFrames)
        for (let i = 0; i < request.cells.length; i++)
          frames.push(await read(page, await page.evaluate((n: number) => window.__cutcraft!.frame(n), i)));
      return { bytes, width: result.width, height: result.height, frames };
    });
  }

  /** The soundtrack of [from, to), mixed and encoded in the page; null bytes when there is no sound. */
  async audio(request: AudioRequest): Promise<Soundtrack> {
    return this.on(async (page) => {
      const r = await page.evaluate((req: AudioRequest) => window.__cutcraft!.audio(req), request);
      return { bytes: r.length > 0 ? await read(page, r.length) : null, codec: r.codec, warnings: r.warnings };
    });
  }

  /** The ink of each overlay and of the captions at `t`, for the layout check. */
  async bounds(t: number): Promise<readonly InkBounds[]> {
    return this.on((page) => page.evaluate((at: number) => window.__cutcraft!.bounds(at), t));
  }

  /** Asset errors the pages' players have reported so far, with the resolver's reason for media it could not serve. */
  async errors(): Promise<readonly string[]> {
    const all = await Promise.all(
      this.pages.map((p) => p.evaluate<readonly string[]>("[...window.__cutcraft.errors]")),
    );
    return [...new Set([...this.server.mediaErrors, ...all.flat()])];
  }

  async close(): Promise<void> {
    await this.browser.close().catch(() => undefined);
    await this.server.close();
  }

  /** Runs `work` on a free page, waiting for one when all are busy. */
  private async on<T>(work: (page: Page) => Promise<T>): Promise<T> {
    const page = this.idle.pop() ?? (await new Promise<Page>((ok) => this.waiting.push(ok)));
    try {
      return await work(page);
    } catch (error) {
      // A file the resolver could not find reaches the page as a failed fetch; say what the resolver said.
      const [missing] = this.server.mediaErrors;
      throw missing ? new Error(missing) : error;
    } finally {
      const next = this.waiting.shift();
      if (next) next(page);
      else this.idle.push(page);
    }
  }
}

async function openPage(browser: Browser, url: string, warn: ((m: string) => void) | undefined): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const pageErrors: string[] = [];
  page.on("pageerror", (e: Error) => pageErrors.push(e.message));
  page.on("console", (m: { type(): string; text(): string }) => {
    // The player's own warnings only; the browser's GPU driver messages are not about the file.
    const text = m.text();
    if (m.type() === "warning" && text.startsWith(PLAYER_WARNING)) warn?.(text.slice(PLAYER_WARNING.length));
  });
  await page.goto(url);
  await page
    .waitForFunction("window.__cutcraft !== undefined || window.__cutcraftError !== undefined", undefined, {
      timeout: 60_000,
    })
    .catch(() => {
      throw new Error(`the export page did not load${pageErrors.length ? `: ${pageErrors.join("; ")}` : ""}`);
    });
  const failed = await page.evaluate<string | undefined>("window.__cutcraftError");
  if (failed) throw new Error(`the export page could not load the file: ${failed.split("\n")[0]}`);
  return page;
}

async function read(page: Page, length: number): Promise<Uint8Array> {
  const bytes = new Uint8Array(length);
  for (let offset = 0; offset < length; offset += READ_CHUNK) {
    const part = await page.evaluate(
      ({ offset, size }: { offset: number; size: number }) => window.__cutcraft!.read(offset, size),
      { offset, size: READ_CHUNK },
    );
    bytes.set(Buffer.from(part, "base64"), offset);
  }
  return bytes;
}

interface Chromium {
  launch(options: object): Promise<Browser>;
}

async function loadChromium(): Promise<Chromium> {
  const playwright = (await import("playwright-core")) as unknown as { chromium: Chromium };
  return playwright.chromium;
}

declare global {
  interface Window {
    __cutcraft?: PageApi;
  }
}
