import type { AnyCanvas, Ctx2D, Frame, FrameSourceHooks, MediaHandle } from "@cutcut/player/engine";
import type { VideoSample } from "mediabunny";
import { Canvas, ImageData, loadImage } from "skia-canvas";

type Crop = { x: number; y: number; w: number; h: number };

/** A decoded picture held as pixels on a skia canvas; drawn like any canvas image. */
export class RgbaFrame implements Frame {
  constructor(
    private readonly canvas: Canvas,
    readonly timestamp: number,
    readonly duration: number,
    readonly width: number,
    readonly height: number,
  ) {}

  draw(ctx: Ctx2D, dx: number, dy: number, dw: number, dh: number, crop?: Crop): void {
    const image = this.canvas as unknown as CanvasImageSource;
    // The crop is in display pixels; the canvas holds coded pixels, which differ only for anamorphic video.
    const sx = this.canvas.width / this.width, sy = this.canvas.height / this.height;
    if (crop) ctx.drawImage(image, crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy, dx, dy, dw, dh);
    else ctx.drawImage(image, dx, dy, dw, dh);
  }

  retain(): Frame { return this; }
  close(): void { /* the canvas is garbage collected */ }
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
    const canvas = new Canvas(w, h);
    canvas.getContext("2d").putImageData(new ImageData(pixels, w, h), 0, 0);
    return new RgbaFrame(canvas, sample.timestamp, sample.duration, sample.displayWidth, sample.displayHeight);
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
