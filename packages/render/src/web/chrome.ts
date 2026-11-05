// The Chrome the export runs in. Every export draws its frames in a real browser, so CutCraft finds one the way
// Remotion does: a binary you name, or else a Chrome for Testing it downloads once into a cache and reuses.
import { homedir } from "node:os";
import { join } from "node:path";

import {
  Browser,
  computeExecutablePath,
  detectBrowserPlatform,
  getInstalledBrowsers,
  install,
  resolveBuildId,
} from "@puppeteer/browsers";

/**
 * The Chrome milestone CutCraft downloads: the one CI tests against. The export needs HTML-in-Canvas
 * (`drawElementImage`, with `content="drawable"`), which Chrome 157 ships behind the CanvasDrawElement feature.
 */
export const CHROME_MILESTONE = "157";

/** Where downloaded browsers live: `CUTCRAFT_BROWSER_CACHE`, else `~/.cache/cutcraft/browsers`. */
export function browserCacheDir(): string {
  return process.env.CUTCRAFT_BROWSER_CACHE ?? join(homedir(), ".cache", "cutcraft", "browsers");
}

export interface FindChromeOptions {
  /** A Chrome or Chromium binary to use as it is. */
  readonly executablePath?: string | undefined;
  /** Download Chrome for Testing when none is found (default true). */
  readonly download?: boolean;
  /** Progress while downloading, as one-line messages. */
  readonly log?: (message: string) => void;
}

/**
 * The binary the export launches: `executablePath`, else `CUTCRAFT_CHROMIUM`, else a Chrome for Testing of
 * `CHROME_MILESTONE` already in the cache, else that Chrome downloaded into the cache now.
 */
export async function findChrome(options: FindChromeOptions = {}): Promise<string> {
  const named = options.executablePath ?? process.env.CUTCRAFT_CHROMIUM;
  if (named) return named;
  const cached = await cachedChrome();
  if (cached) return cached;
  if (options.download === false)
    throw new Error(
      `no Chrome ${CHROME_MILESTONE} in ${browserCacheDir()}; run \`cutcraft browser install\`, or set CUTCRAFT_CHROMIUM to a Chrome or Chromium 153+ binary`,
    );
  return installChrome(options.log);
}

/** The binary of a Chrome for Testing of `CHROME_MILESTONE` already in the cache, without asking the network. */
export async function cachedChrome(): Promise<string | null> {
  const found = (await getInstalledBrowsers({ cacheDir: browserCacheDir() })).find(
    (b) => b.browser === Browser.CHROME && b.buildId.startsWith(`${CHROME_MILESTONE}.`),
  );
  return found?.executablePath ?? null;
}

/** Downloads Chrome for Testing of `CHROME_MILESTONE` into the cache and returns its binary. */
export async function installChrome(log: (message: string) => void = () => undefined): Promise<string> {
  const platform = detectBrowserPlatform();
  if (!platform)
    throw new Error(
      "Chrome for Testing has no build for this platform; set CUTCRAFT_CHROMIUM to a Chrome or Chromium 153+ binary",
    );
  const cacheDir = browserCacheDir();
  let buildId: string;
  try {
    buildId = await resolveBuildId(Browser.CHROME, platform, CHROME_MILESTONE);
  } catch (error) {
    throw new Error(
      `could not look up Chrome ${CHROME_MILESTONE} (${error instanceof Error ? error.message : String(error)}); set CUTCRAFT_CHROMIUM to a Chrome or Chromium 153+ binary`,
    );
  }
  log(`downloading Chrome ${buildId} into ${cacheDir} (once)`);
  let reported = -1;
  const installed = await install({
    browser: Browser.CHROME,
    buildId,
    cacheDir,
    platform,
    downloadProgressCallback: (done, total) => {
      const percent = total > 0 ? Math.floor((done / total) * 10) * 10 : 0;
      if (percent > reported) {
        reported = percent;
        log(`Chrome ${buildId}: ${percent}%`);
      }
    },
  });
  return installed.executablePath ?? computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir, platform });
}
