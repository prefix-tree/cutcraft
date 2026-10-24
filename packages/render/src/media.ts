import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { AssetManifest } from "@cutcut/kit";
import type { MediaResolver } from "@cutcut/player/engine";

const EXTENSIONS = [".webm", ".mp4", ".mov", ".mkv", ".m4v", ".ogg", ".opus", ".mp3", ".wav", ".m4a", ".aac", ".flac", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];

/**
 * Finds each asset's file in a directory: `<dir>/<id>` with or without one of
 * the usual media extensions, or the path given for it in `overrides`.
 */
export function directoryResolver(dir: string, manifest: AssetManifest, overrides: Readonly<Record<string, string>> = {}): MediaResolver {
  return {
    resolve: (assetId) => {
      const direct = overrides[assetId];
      if (direct !== undefined) {
        return existsSync(direct) ? Promise.resolve({ kind: "path", path: direct }) : Promise.reject(new Error(`asset "${assetId}": ${direct} does not exist`));
      }
      const base = join(dir, assetId);
      const hit = [base, ...EXTENSIONS.map((e) => `${base}${e}`)].find((p) => existsSync(p) && statSync(p).isFile());
      if (hit) return Promise.resolve({ kind: "path", path: hit });
      const known = manifest.assets[assetId] ? "" : " (it is not in the manifest either)";
      return Promise.reject(new Error(`no media file for asset "${assetId}" in ${dir}${known}`));
    },
  };
}
