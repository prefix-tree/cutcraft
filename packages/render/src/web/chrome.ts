// The Chrome the export runs in. Every export draws its frames in a real browser: a binary you name, or else a Chrome
// for Testing that UberScene downloads once into a cache and reuses.
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
 * The Chrome milestone UberScene downloads: the one CI tests against. The export needs HTML-in-Canvas
 * (`drawElementImage`, with `content="drawable"`), which Chrome 157 ships behind the CanvasDrawElement feature.
 */
export const CHROME_MILESTONE = "157";

/** What to do about a Chrome the export cannot use, said in every error that names one. */
const USE_OURS = `set UBERSCENE_CHROMIUM to a Chrome ${CHROME_MILESTONE} binary`;

/**
 * Why a browser reporting `version` (as Playwright gives it, "157.0.8080.0") cannot run the export, or null when it
 * can. The export runs on Chrome `CHROME_MILESTONE` only: text, WebGL and the capture are drawn and tested on that
 * one, and another milestone draws text a little differently.
 */
export function wrongChrome(version: string, executablePath: string): string | null {
  const major = /(\d+)\./.exec(version)?.[1];
  if (major === CHROME_MILESTONE) return null;
  return `the export runs on Chrome ${CHROME_MILESTONE} only, and ${executablePath} is Chrome ${version}; unset UBERSCENE_CHROMIUM to use the Chrome for Testing the export downloads (\`uberscene browser install\`), or ${USE_OURS}`;
}

/** Where downloaded browsers live: `UBERSCENE_BROWSER_CACHE`, else `~/.cache/uberscene/browsers`. */
export function browserCacheDir(): string {
  return process.env.UBERSCENE_BROWSER_CACHE ?? join(homedir(), ".cache", "uberscene", "browsers");
}

export interface FindChromeOptions {
  /** A Chrome binary to use instead of the downloaded one; the export checks that it is Chrome `CHROME_MILESTONE`. */
  readonly executablePath?: string | undefined;
  /** Download Chrome for Testing when none is found (default true). */
  readonly download?: boolean;
  /** Progress while downloading, as one-line messages. */
  readonly log?: (message: string) => void;
}

/**
 * The binary the export launches: `executablePath`, else `UBERSCENE_CHROMIUM`, else a Chrome for Testing of
 * `CHROME_MILESTONE` already in the cache, else that Chrome downloaded into the cache now.
 */
export async function findChrome(options: FindChromeOptions = {}): Promise<string> {
  const named = options.executablePath ?? process.env.UBERSCENE_CHROMIUM;
  if (named) return named;
  const cached = await cachedChrome();
  if (cached) return cached;
  if (options.download === false)
    throw new Error(
      `no Chrome ${CHROME_MILESTONE} in ${browserCacheDir()}; run \`uberscene browser install\`, or ${USE_OURS}`,
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
  if (!platform) throw new Error(`Chrome for Testing has no build for this platform; ${USE_OURS}`);
  const cacheDir = browserCacheDir();
  let buildId: string;
  try {
    buildId = await resolveBuildId(Browser.CHROME, platform, CHROME_MILESTONE);
  } catch (error) {
    throw new Error(
      `could not look up Chrome ${CHROME_MILESTONE} (${error instanceof Error ? error.message : String(error)}); ${USE_OURS}`,
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
