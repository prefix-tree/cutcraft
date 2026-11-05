import { writeFile } from "node:fs/promises";

import type { ResolvedState } from "@cutcraft/kit";
import { FRAME_EPS, type MediaResolver } from "@cutcraft/player/engine";

import type { FontFile } from "./fonts";
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
  const engine = await openEngine({ ...options, warnings });
  try {
    await writeFile(options.out, await engine.still(frame / fps, jpeg ? "image/jpeg" : "image/png", 0.92));
    const failed = await engine.errors();
    if (failed.length > 0) {
      if (options.onAssetError !== "continue") throw new Error(`cannot render: ${failed.join("; ")}`);
      for (const f of failed) warnings.push(`asset error: ${f}`);
    }
    return { frame, width, height, warnings };
  } finally {
    await engine.close();
  }
}
