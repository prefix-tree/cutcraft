import { readFile } from "node:fs/promises";

import type { AssetManifest } from "@cutcraft/kit";
import type { MediaResolver } from "@cutcraft/player/engine";

import type { FontWeight, OverlayFont } from "./overlays";

const WEIGHTS: readonly number[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

/**
 * The faces the manifest lists (`fonts`), read through the media resolver, as the overlay plane takes them. Satori, which
 * sets the export's text, reads TTF, OTF and WOFF; a WOFF2 file is refused here with a message saying so.
 */
export async function manifestFonts(manifest: AssetManifest, media: MediaResolver): Promise<OverlayFont[]> {
  const entries = Object.entries(manifest.fonts ?? {});
  return Promise.all(
    entries.map(async ([id, entry]): Promise<OverlayFont> => {
      const weight = entry.weight ?? 400;
      if (!WEIGHTS.includes(weight)) throw new Error(`font "${id}": weight must be 100, 200 … 900, got ${weight}`);
      const data = await fontBytes(id, media);
      if (data.subarray(0, 4).toString("latin1") === "wOF2")
        throw new Error(`font "${id}" is WOFF2, which the export cannot read; use its TTF, OTF or WOFF file`);
      return { name: entry.family, data, weight: weight as FontWeight, style: entry.style ?? "normal" };
    }),
  );
}

async function fontBytes(id: string, media: MediaResolver): Promise<Buffer> {
  const handle = await media.resolve(id).catch((error: unknown) => {
    throw new Error(`font "${id}": ${error instanceof Error ? error.message : String(error)}`);
  });
  if (handle.kind === "path") return readFile(handle.path);
  if (handle.kind === "blob") return Buffer.from(await handle.blob.arrayBuffer());
  const response = await fetch(handle.url);
  if (!response.ok) throw new Error(`font "${id}": ${handle.url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
