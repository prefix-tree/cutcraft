import type { MediaResolver } from "../types";

/** A resolver over a map of asset id → Blob or URL. */
export function fromMap(map: Readonly<Record<string, Blob | string>>): MediaResolver {
  return {
    resolve: (assetId) => {
      const v = map[assetId];
      if (v === undefined) return Promise.reject(new Error(`no media for asset "${assetId}"`));
      return Promise.resolve(typeof v === "string" ? { kind: "url", url: v } : { kind: "blob", blob: v });
    },
  };
}

export function toResolver(media: MediaResolver | Readonly<Record<string, Blob | string>>): MediaResolver {
  return typeof (media as MediaResolver).resolve === "function"
    ? (media as MediaResolver)
    : fromMap(media as Record<string, Blob | string>);
}
