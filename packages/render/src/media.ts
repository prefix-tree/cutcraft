import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import type { MediaResolver } from "@uberscene/player/engine";
import type { AssetManifest } from "@uberscene/sdk";

const EXTENSIONS = [
  ".webm",
  ".mp4",
  ".mov",
  ".mkv",
  ".m4v",
  ".ogg",
  ".opus",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".flac",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  // LUTs (the `lut` effect).
  ".cube",
  // Fonts the manifest lists (`fonts`).
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
];

/**
 * Whether `id` can be an asset id: the letters, digits, `_`, `-` and `.` an `asset:` reference allows, and no `..`.
 * Ids reach the file system and the export's local server (`/media/<id>`), where an id such as `../../.ssh/id_rsa`
 * would read any file on the host, so everything else is refused before a path is built.
 */
export function isAssetId(id: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(id) && !id.includes("..");
}

/**
 * Finds each asset's file in a directory, or the first of several that has it: `<dir>/<id>` with or without one of
 * the usual media extensions, or the path given for it in `overrides`.
 */
export function directoryResolver(
  dir: string | readonly string[],
  manifest: AssetManifest,
  overrides: Readonly<Record<string, string>> = {},
): MediaResolver {
  const dirs = typeof dir === "string" ? [dir] : dir;
  return {
    resolve: (assetId) => {
      if (!isAssetId(assetId))
        return Promise.reject(
          new Error(`"${assetId}" is not an asset id: ids are letters, digits, _, - and ., with no ".."`),
        );
      const direct = overrides[assetId];
      if (direct !== undefined) {
        return existsSync(direct)
          ? Promise.resolve({ kind: "path", path: direct })
          : Promise.reject(new Error(`asset "${assetId}": ${direct} does not exist`));
      }
      const hit = dirs
        .flatMap((d) => [join(d, assetId), ...EXTENSIONS.map((e) => join(d, `${assetId}${e}`))])
        .find((p) => existsSync(p) && statSync(p).isFile());
      if (hit) return Promise.resolve({ kind: "path", path: hit });
      const known = manifest.assets[assetId] ? "" : " (it is not in the manifest either)";
      return Promise.reject(new Error(`no media file for asset "${assetId}" in ${dirs.join(" or ")}${known}`));
    },
  };
}
