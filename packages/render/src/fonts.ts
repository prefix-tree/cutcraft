import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { DeclaredFont } from "@cutcraft/kit";
import type { MediaResolver } from "@cutcraft/player/engine";

import type { FontWeight, OverlayFont } from "./overlays";

export interface FontOptions {
  /** Where Google Fonts files are kept once downloaded; default `CUTCRAFT_FONT_CACHE`, then `~/.cache/cutcraft/fonts`. */
  readonly cacheDir?: string;
  /** For tests: what downloads from Google. */
  readonly fetch?: typeof fetch;
}

/**
 * The faces a file declares (`state.fonts`), as bytes the overlay plane takes. An `asset:` face is read through the
 * media resolver; a Google face is downloaded once (Google serves TTF to a client that is not a browser) and read from
 * the cache after that. Satori, which sets the export's text, reads TTF, OTF and WOFF; a WOFF2 file is refused with a
 * message saying so, unless `woff2` is allowed (the browser engine reads it).
 */
export async function loadFonts(
  faces: readonly DeclaredFont[],
  media: MediaResolver,
  options: FontOptions & { readonly woff2?: boolean } = {},
): Promise<OverlayFont[]> {
  return Promise.all(
    faces.map(async (face): Promise<OverlayFont> => {
      const data =
        face.source.kind === "asset" ? await assetBytes(face.source.id, media) : await googleBytes(face, options);
      if (!options.woff2 && data.subarray(0, 4).toString("latin1") === "wOF2")
        throw new Error(
          `font "${face.family}" is WOFF2, which the Node export cannot read; use its TTF, OTF or WOFF file`,
        );
      return { name: face.family, data, weight: face.weight as FontWeight, style: face.style };
    }),
  );
}

async function assetBytes(id: string, media: MediaResolver): Promise<Buffer> {
  const handle = await media.resolve(id).catch((error: unknown) => {
    throw new Error(`font "asset:${id}": ${error instanceof Error ? error.message : String(error)}`);
  });
  if (handle.kind === "path") return readFile(handle.path);
  if (handle.kind === "blob") return Buffer.from(await handle.blob.arrayBuffer());
  const response = await fetch(handle.url);
  if (!response.ok) throw new Error(`font "asset:${id}": ${handle.url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** The stylesheet URL Google Fonts serves one face from. */
export function googleCssUrl(face: Pick<DeclaredFont, "family" | "weight" | "style">): string {
  const family = encodeURIComponent(face.family).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:ital,wght@${face.style === "italic" ? 1 : 0},${face.weight}`;
}

async function googleBytes(face: DeclaredFont, options: FontOptions): Promise<Buffer> {
  const dir = options.cacheDir ?? process.env.CUTCRAFT_FONT_CACHE ?? join(homedir(), ".cache", "cutcraft", "fonts");
  const file = join(dir, `${face.family.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${face.weight}-${face.style}.ttf`);
  if (existsSync(file)) return readFile(file);
  const get = options.fetch ?? fetch;
  const failed = (why: string): Error =>
    new Error(
      `Google font "${face.family}" ${face.weight} ${face.style}: ${why}. The first export downloads it into ${dir}; or use font({ src: "asset:…" }) with the file beside the cut`,
    );
  const css = await get(googleCssUrl(face)).catch((error: unknown) => {
    throw failed(error instanceof Error ? error.message : String(error));
  });
  if (!css.ok) throw failed(`Google answered ${css.status} (is the family, weight and style on fonts.google.com?)`);
  const url = /src:\s*url\(([^)]+)\)/.exec(await css.text())?.[1];
  if (!url) throw failed("Google's stylesheet names no file");
  const font = await get(url);
  if (!font.ok) throw failed(`${url} answered ${font.status}`);
  const data = Buffer.from(await font.arrayBuffer());
  await mkdir(dir, { recursive: true });
  // Written aside and renamed, so a parallel export never reads half a file.
  const part = `${file}.${process.pid}.part`;
  await writeFile(part, data);
  await rename(part, file);
  return data;
}
