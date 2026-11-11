import { writeFile } from "node:fs/promises";

import type { ResolvedState } from "@cutcraft/kit";
import { FRAME_EPS, type MediaResolver } from "@cutcraft/player/engine";

import type { FontFile } from "./fonts";
import { FrameKeys, readCached, writeCached } from "./frame-cache";
import { type ExportSource, openEngine } from "./renderer";

export interface StillOptions {
  readonly state: ResolvedState;
  /** The file the state came from (`loadVideo` returns it). */
  readonly source: ExportSource;
  readonly media: MediaResolver;
  /** The image to write: .jpg or .jpeg writes a JPEG, anything else a PNG. */
  readonly out: string;
  /** Composition seconds; the frame showing at that time is drawn. */
  readonly time: number;
  /**
   * A folder to keep the frame in, keyed by what draws it: a frame an edit did not touch is read from there without
   * starting a browser. Without it, nothing is kept.
   */
  readonly cacheDir?: string;
  readonly fonts?: readonly FontFile[];
  readonly onAssetError?: "throw" | "continue";
  /** Progress while Chrome is being downloaded, on the first export. */
  readonly onLog?: (message: string) => void;
}

export interface StillResult {
  readonly frame: number;
  readonly width: number;
  readonly height: number;
  readonly warnings: readonly string[];
  /** The frame was read from the cache, not drawn. */
  readonly cached: boolean;
}

/** Draws one frame of the composition, as the export draws it, to a PNG or JPEG. */
export async function renderStill(options: StillOptions): Promise<StillResult> {
  const { state } = options;
  const { fps, width, height, duration } = state.composition;
  if (!(options.time >= 0 && options.time < duration))
    throw new Error(`time ${options.time} is outside the composition (0 to ${duration} s)`);
  const frame = Math.floor(options.time * fps + FRAME_EPS);
  const jpeg = /\.jpe?g$/i.test(options.out);
  const warnings: string[] = [];
  const name = options.cacheDir
    ? `still-${await new FrameKeys({ state, source: options.source, media: options.media, fonts: options.fonts }).key(frame, { still: jpeg ? "jpeg" : "png" })}.${jpeg ? "jpg" : "png"}`
    : null;
  const kept = options.cacheDir && name ? readCached(options.cacheDir, name) : null;
  if (kept) {
    await writeFile(options.out, kept);
    return { frame, width, height, warnings, cached: true };
  }
  const engine = await openEngine({ ...options, warnings });
  try {
    const bytes = await engine.still(frame / fps, jpeg ? "image/jpeg" : "image/png", 0.92);
    await writeFile(options.out, bytes);
    const failed = await engine.errors();
    if (failed.length > 0) {
      if (options.onAssetError !== "continue") throw new Error(`cannot render: ${failed.join("; ")}`);
      for (const f of failed) warnings.push(`asset error: ${f}`);
    }
    // A frame drawn with a placeholder for media that could not be read is not kept.
    if (options.cacheDir && name && failed.length === 0) writeCached(options.cacheDir, name, bytes);
    return { frame, width, height, warnings, cached: false };
  } finally {
    await engine.close();
  }
}
