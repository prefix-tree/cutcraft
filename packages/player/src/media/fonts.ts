import type { AssetManifest } from "@cutcraft/kit";

import type { MediaResolver } from "../types";

/** A face to add to the page's fonts, from a URL or the file's bytes. */
export interface FontFaceSource {
  readonly family: string;
  readonly weight?: number;
  readonly style?: "normal" | "italic";
  readonly source: string | ArrayBuffer;
}

/** Faces already added to `document.fonts`, by family, weight, style and source, so a remount adds none twice. */
const added = new Map<string, Promise<void>>();

/**
 * Adds faces to `document.fonts` and resolves once every one has loaded. A URL source loads from that URL; bytes load as
 * given. Does nothing where there is no `FontFace` (Node, tests).
 */
export function addFontFaces(faces: readonly FontFaceSource[]): Promise<void> {
  if (typeof FontFace === "undefined" || typeof document === "undefined") return Promise.resolve();
  return Promise.all(
    faces.map((face) => {
      const weight = String(face.weight ?? 400);
      const style = face.style ?? "normal";
      const key = `${face.family}|${weight}|${style}|${typeof face.source === "string" ? face.source : face.source.byteLength}`;
      let loading = added.get(key);
      if (!loading) {
        const font = new FontFace(
          face.family,
          typeof face.source === "string" ? `url("${face.source}")` : face.source,
          {
            weight,
            style,
          },
        );
        loading = font.load().then(() => {
          document.fonts.add(font);
        });
        added.set(key, loading);
        loading.catch(() => added.delete(key));
      }
      return loading;
    }),
  ).then(() => undefined);
}

/**
 * Loads the faces the manifest lists (`fonts`): each key is asked of `media`, as an asset id is, and its file added to
 * `document.fonts`. Resolves once all have loaded; a face that fails is reported through `onError` and the rest load.
 */
export async function loadManifestFonts(
  manifest: AssetManifest,
  media: MediaResolver,
  onError: (id: string, error: Error) => void,
): Promise<void> {
  await Promise.all(
    Object.entries(manifest.fonts ?? {}).map(async ([id, entry]) => {
      try {
        const handle = await media.resolve(id);
        if (handle.kind === "path") throw new Error(`a browser cannot read the path ${handle.path}; give it a URL`);
        const source = handle.kind === "url" ? handle.url : await handle.blob.arrayBuffer();
        await addFontFaces([
          {
            family: entry.family,
            source,
            ...(entry.weight !== undefined ? { weight: entry.weight } : {}),
            ...(entry.style ? { style: entry.style } : {}),
          },
        ]);
      } catch (error) {
        onError(id, error instanceof Error ? error : new Error(String(error)));
      }
    }),
  );
}
