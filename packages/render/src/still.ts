import { writeFile } from "node:fs/promises";
import type { ResolvedState } from "@cutcraft/kit";
import { FRAME_EPS, captureWarnings, type MediaResolver, type PlayerErrorEvent } from "@cutcraft/player/engine";
import type { ReactNode } from "react";
import { initEnv } from "./env";
import type { OverlayFont } from "./overlays";
import { FramePipeline } from "./pipeline";

export interface StillOptions {
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  /** The image to write: .jpg or .jpeg writes a JPEG, anything else a PNG. */
  readonly out: string;
  /** Composition seconds; the frame showing at that time is drawn. */
  readonly time: number;
  readonly interiors?: ReadonlyMap<string, ReactNode>;
  readonly fonts?: readonly OverlayFont[];
  readonly onAssetError?: "throw" | "continue";
}

export interface StillResult {
  readonly frame: number;
  readonly width: number;
  readonly height: number;
  readonly warnings: readonly string[];
  readonly errors: readonly PlayerErrorEvent[];
}

/** Draws one frame of the composition, through the same pipeline as `renderVideo`, to a PNG or JPEG. */
export async function renderStill(options: StillOptions): Promise<StillResult> {
  initEnv();
  const { state } = options;
  const { fps, width, height, duration } = state.composition;
  if (!(options.time >= 0 && options.time < duration)) throw new Error(`time ${options.time} is outside the composition (0 to ${duration} s)`);
  const frame = Math.floor(options.time * fps + FRAME_EPS);
  const warnings: string[] = [];
  captureWarnings((m) => warnings.push(m));
  const pipeline = new FramePipeline({ state, media: options.media, interiors: options.interiors, fonts: options.fonts, onAssetError: options.onAssetError, warn: (m) => warnings.push(m) });
  try {
    await writeFile(options.out, await pipeline.image(frame, /\.jpe?g$/i.test(options.out) ? "jpg" : "png"));
    return { frame, width, height, warnings, errors: pipeline.errors };
  } finally {
    pipeline.dispose();
    captureWarnings(null);
  }
}
