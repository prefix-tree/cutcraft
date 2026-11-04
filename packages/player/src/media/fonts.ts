import type { DeclaredFont } from "@cutcraft/kit";

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

/** The stylesheet URL Google Fonts serves a family's face from, for a browser. */
function googleCss(face: DeclaredFont): string {
  const family = encodeURIComponent(face.family).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:ital,wght@${face.style === "italic" ? 1 : 0},${face.weight}&display=block`;
}

async function addGoogleFace(face: DeclaredFont): Promise<void> {
  const href = googleCss(face);
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    const loaded = new Promise<void>((ok, fail) => {
      link.onload = () => ok();
      link.onerror = () => fail(new Error(`Google Fonts did not serve ${face.family} ${face.weight} ${face.style}`));
    });
    document.head.append(link);
    await loaded;
  }
  const faces = await document.fonts.load(`${face.style} ${face.weight} 16px "${face.family}"`);
  if (faces.length === 0) throw new Error(`Google Fonts has no ${face.family} ${face.weight} ${face.style}`);
}

/**
 * Loads the faces a file declares (`state.fonts`) into the page: an `asset:` face is asked of `media` as an asset is,
 * a Google face loads from Google's stylesheet. Resolves once all have loaded; a face that fails is reported through
 * `onError` and the rest load. Does nothing where there is no `FontFace` (Node, tests).
 */
export async function loadFileFonts(
  faces: readonly DeclaredFont[],
  media: MediaResolver,
  onError: (family: string, error: Error) => void,
): Promise<void> {
  if (typeof FontFace === "undefined" || typeof document === "undefined") return;
  await Promise.all(
    faces.map(async (face) => {
      try {
        if (face.source.kind === "google") return await addGoogleFace(face);
        const handle = await media.resolve(face.source.id);
        if (handle.kind === "path") throw new Error(`a browser cannot read the path ${handle.path}; give it a URL`);
        const source = handle.kind === "url" ? handle.url : await handle.blob.arrayBuffer();
        await addFontFaces([{ family: face.family, weight: face.weight, style: face.style, source }]);
      } catch (error) {
        onError(face.family, error instanceof Error ? error : new Error(String(error)));
      }
    }),
  );
}
