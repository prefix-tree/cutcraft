import { writeFile } from "node:fs/promises";

import type { ReactNode } from "react";

import type { ResolvedState } from "@cutcraft/kit";
import { captureWarnings, FRAME_EPS, type MediaResolver, type PlayerErrorEvent } from "@cutcraft/player/engine";

import { initEnv } from "./env";
import { loadFonts } from "./fonts";
import type { OverlayFont } from "./overlays";
import { FramePipeline } from "./pipeline";
import { type BrowserSource, type Engine, pickEngine } from "./renderer";
import { BrowserEngine } from "./web/engine";

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
  /** What draws the frame, as for `renderVideo`. */
  readonly engine?: Engine;
  readonly source?: BrowserSource;
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
  if (!(options.time >= 0 && options.time < duration))
    throw new Error(`time ${options.time} is outside the composition (0 to ${duration} s)`);
  const frame = Math.floor(options.time * fps + FRAME_EPS);
  const picked = pickEngine(state, options.engine, options.source);
  const warnings: string[] = picked.note ? [picked.note] : [];
  const jpeg = /\.jpe?g$/i.test(options.out);
  const fonts = [
    ...(await loadFonts(state.fonts, options.media, { woff2: picked.engine === "browser" })),
    ...(options.fonts ?? []),
  ];
  if (picked.engine === "browser" && options.source) {
    const source = options.source;
    const browser = await BrowserEngine.open({
      source: source.text,
      manifest: source.manifest,
      media: options.media,
      ...(fonts.length ? { fonts } : {}),
      warn: (m) => {
        if (!warnings.includes(m)) warnings.push(m);
      },
      ...(source.props ? { props: source.props } : {}),
      ...(source.executablePath ? { executablePath: source.executablePath } : {}),
    });
    try {
      await writeFile(options.out, await browser.still(frame / fps, jpeg ? "image/jpeg" : "image/png", 0.92));
      const failed = await browser.errors();
      if (failed.length > 0 && options.onAssetError !== "continue")
        throw new Error(`cannot render: ${failed.join("; ")}`);
      return { frame, width, height, warnings, errors: [] };
    } finally {
      await browser.close();
    }
  }
  captureWarnings((m) => warnings.push(m));
  const pipeline = new FramePipeline({
    state,
    media: options.media,
    interiors: options.interiors,
    fonts,
    onAssetError: options.onAssetError,
    warn: (m) => warnings.push(m),
  });
  try {
    await writeFile(options.out, await pipeline.image(frame, jpeg ? "jpg" : "png"));
    return { frame, width, height, warnings, errors: pipeline.errors };
  } finally {
    pipeline.dispose();
    captureWarnings(null);
  }
}
