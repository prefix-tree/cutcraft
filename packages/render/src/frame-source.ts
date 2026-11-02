import type { AnyCanvas, Ctx2D, Frame, FrameSourceHooks, MediaHandle } from "@cutcraft/player/engine";
import type { VideoSample } from "mediabunny";
import { Canvas, ImageData, loadImage } from "skia-canvas";

type Crop = { x: number; y: number; w: number; h: number };

/**
 * A decoded picture held as RGBA pixels. When it fills the output untransformed it is put straight onto the canvas;
 * otherwise it is drawn through a canvas built on first use, like any image.
 */
export class RgbaFrame implements Frame {
  private canvas: Canvas | null = null;

  constructor(
    private readonly pixels: ImageData,
    readonly timestamp: number,
    readonly duration: number,
    readonly width: number,
    readonly height: number,
    private readonly opaque: boolean,
  ) {}

  paintFull(ctx: Ctx2D, width: number, height: number): boolean {
    if (!this.opaque || this.pixels.width !== width || this.pixels.height !== height) return false;
    (ctx as unknown as { putImageData(data: ImageData, x: number, y: number): void }).putImageData(this.pixels, 0, 0);
    return true;
  }

  draw(ctx: Ctx2D, dx: number, dy: number, dw: number, dh: number, crop?: Crop): void {
    const canvas = this.asCanvas();
    const image = canvas as unknown as CanvasImageSource;
    // The crop is in display pixels; the canvas holds coded pixels, which differ only for anamorphic video.
    const sx = canvas.width / this.width, sy = canvas.height / this.height;
    if (crop) ctx.drawImage(image, crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy, dx, dy, dw, dh);
    else ctx.drawImage(image, dx, dy, dw, dh);
  }

  retain(): Frame { return this; }
  close(): void { /* the pixels are garbage collected */ }

  private asCanvas(): Canvas {
    if (!this.canvas) {
      this.canvas = new Canvas(this.pixels.width, this.pixels.height);
      this.canvas.getContext("2d").putImageData(this.pixels, 0, 0);
    }
    return this.canvas;
  }
}

/**
 * Converts a decoded sample to RGBA once, when it is decoded, and closes it.
 * `Frame.draw` is synchronous and the conversion is not, so it cannot wait
 * for the first draw.
 */
export async function makeRgbaFrame(sample: VideoSample): Promise<Frame> {
  try {
    const w = sample.codedWidth, h = sample.codedHeight;
    const pixels = new Uint8ClampedArray(w * h * 4);
    await sample.copyTo(pixels, { format: "RGBA" });
    const opaque = !(sample.format ?? "").endsWith("A");
    return new RgbaFrame(new ImageData(pixels, w, h), sample.timestamp, sample.duration, sample.displayWidth, sample.displayHeight, opaque);
  } finally {
    sample.close();
  }
}

/** The host seams the engine's mediabunny sources take: RGBA frames, skia image loading, software decode. */
export const frameSourceHooks: FrameSourceHooks = {
  makeFrame: makeRgbaFrame,
  loadImage: async (handle: MediaHandle) => {
    if (handle.kind === "path") return (await loadImage(handle.path)) as unknown as ImageBitmap;
    if (handle.kind === "blob") return (await loadImage(Buffer.from(await handle.blob.arrayBuffer()))) as unknown as ImageBitmap;
    return (await loadImage(handle.url)) as unknown as ImageBitmap;
  },
  hardwareAcceleration: "prefer-software",
};

export type { AnyCanvas };
