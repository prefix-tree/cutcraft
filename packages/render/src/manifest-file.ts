// Where a project's asset manifest is: `cutcraft.json`, found from a folder upward the way a formatter finds its
// settings, so a command needs no `--manifest` and videos in subfolders share one. `manifest.json` is the older
// name; it is read only in the folder asked about, because other tools keep a file of that name too.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The manifest's file name. */
export const MANIFEST_FILE = "cutcraft.json";
/** The older name, still read beside a video and still written where one exists. */
export const OLD_MANIFEST_FILE = "manifest.json";

export interface FoundManifest {
  /** The manifest file, when one was found. */
  readonly path?: string;
  /** Every folder looked in, nearest first. */
  readonly checked: readonly string[];
}

/** The nearest `cutcraft.json` from `from` upward; failing that, a `manifest.json` in `from` itself. */
export function findManifest(from: string): FoundManifest {
  const start = resolve(from);
  const checked: string[] = [];
  for (let dir = start; ; dir = dirname(dir)) {
    checked.push(dir);
    const candidate = join(dir, MANIFEST_FILE);
    if (existsSync(candidate)) return { path: candidate, checked };
    if (dirname(dir) === dir) break;
  }
  const old = join(start, OLD_MANIFEST_FILE);
  return existsSync(old) ? { path: old, checked } : { checked };
}

/**
 * The folders media may be in when none is named: the video's own, then the manifest's, then `media/` beside the
 * manifest.
 */
export function mediaFolders(videoDir: string, manifestPath: string | undefined): string[] {
  const folders = [resolve(videoDir)];
  if (manifestPath) {
    const home = dirname(resolve(manifestPath));
    for (const dir of [home, join(home, "media")]) if (!folders.includes(dir)) folders.push(dir);
  }
  return folders;
}
