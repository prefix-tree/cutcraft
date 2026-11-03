import { registerMediabunnyServer } from "@mediabunny/server";
import type { AnyCanvas, CreateCanvas } from "@cutcraft/player/engine";
import { Canvas } from "skia-canvas";

let registered = false;

/** Registers FFmpeg-backed decoders and encoders with Mediabunny, once per process. */
export function initEnv(): void {
  if (registered) return;
  registerMediabunnyServer();
  registered = true;
}

/** The `createCanvas` seam for the engine: skia canvases, which implement the Canvas 2D surface the painter uses. */
export const createCanvas: CreateCanvas = (width, height) =>
  new Canvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height))) as unknown as AnyCanvas;
