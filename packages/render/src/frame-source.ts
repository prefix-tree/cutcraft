import type { AnyCanvas, Ctx2D, Frame, FrameSourceHooks, MediaHandle } from "@cutcraft/player/engine";
import { AvFrameVideoSampleResource, toAvFrame } from "@mediabunny/server";
import { VideoSample } from "mediabunny";
import { AVCOL_PRI_BT709, AVCOL_RANGE_MPEG, AVCOL_SPC_BT709, AVCOL_TRC_BT709, Frame as AvFrame } from "node-av";
import { ImageData, loadImage } from "skia-canvas";

type Crop = { x: number; y: number; w: number; h: number };

/**
 * A decoded picture held as RGBA pixels. When it fills the output untransformed it is put straight onto the canvas;
 * otherwise skia draws the pixels like any image.
 */
export class RgbaFrame implements Frame {
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
    const image = this.pixels as unknown as CanvasImageSource;
    // The crop is in display pixels; the pixels are coded ones, which differ only for anamorphic video.
    const sx = this.pixels.width / this.width,
      sy = this.pixels.height / this.height;
    if (crop) ctx.drawImage(image, crop.x * sx, crop.y * sy, crop.w * sx, crop.h * sy, dx, dy, dw, dh);
    else ctx.drawImage(image, dx, dy, dw, dh);
  }

  retain(): Frame {
    return this;
  }
  close(): void {
    /* the pixels are garbage collected */
  }
}

/**
 * A decoded picture kept as the decoder gave it (YUV, by reference to the decoder's frame) and converted to RGBA only
 * when it is drawn: the compositor awaits `prepare()` before painting it. A frame the output shows as it is never
 * converted at all; `passThrough` hands the decoded picture to the encoder instead.
 */
export class DecodedFrame implements Frame {
  private rgba: Promise<RgbaFrame> | null = null;
  private ready: RgbaFrame | null = null;
  readonly timestamp: number;
  readonly duration: number;
  readonly width: number;
  readonly height: number;
  private readonly opaque: boolean;

  constructor(
    private readonly sample: VideoSample,
    shared?: Promise<RgbaFrame> | null,
  ) {
    this.timestamp = sample.timestamp;
    this.duration = sample.duration;
    this.width = sample.displayWidth;
    this.height = sample.displayHeight;
    this.opaque = !(sample.format ?? "").endsWith("A");
    if (shared) this.rgba = shared;
  }

  prepare(): Promise<void> {
    this.rgba ??= (async () => {
      const w = this.sample.codedWidth,
        h = this.sample.codedHeight;
      const pixels = new Uint8ClampedArray(w * h * 4);
      await this.sample.copyTo(pixels, { format: "RGBA" });
      return new RgbaFrame(
        new ImageData(pixels, w, h),
        this.timestamp,
        this.duration,
        this.width,
        this.height,
        this.opaque,
      );
    })();
    return this.rgba.then((f) => {
      this.ready = f;
    });
  }

  paintFull(ctx: Ctx2D, width: number, height: number): boolean {
    return this.converted().paintFull(ctx, width, height);
  }

  draw(ctx: Ctx2D, dx: number, dy: number, dw: number, dh: number, crop?: Crop): void {
    this.converted().draw(ctx, dx, dy, dw, dh, crop);
  }

  /**
   * The decoded picture for the encoder, when it can stand for a whole `width`×`height` output frame as it is: 8-bit
   * 4:2:0, that size in coded and display pixels, unrotated, and BT.709 limited range or untagged (the colours painted
   * frames are encoded in, so the file is the same whichever kind comes first). A copy the caller owns and closes, to
   * pass through `tagBt709`; null otherwise.
   */
  passThrough(width: number, height: number): VideoSample | null {
    const s = this.sample,
      c = s.colorSpace;
    if (
      s.format !== "I420" ||
      s.rotation !== 0 ||
      s.codedWidth !== width ||
      s.codedHeight !== height ||
      s.displayWidth !== width ||
      s.displayHeight !== height
    )
      return null;
    if (![c.primaries, c.transfer, c.matrix].every((v) => v === null || v === "bt709") || c.fullRange === true)
      return null;
    return s.clone();
  }

  /** Another reference to the same decoded picture (and to its conversion, if started), closed on its own. */
  retain(): Frame {
    return new DecodedFrame(this.sample.clone(), this.rgba);
  }

  close(): void {
    this.sample.close();
  }

  private converted(): RgbaFrame {
    if (!this.ready) throw new Error("a decoded frame was drawn before prepare() finished");
    return this.ready;
  }
}

/**
 * A passed-through sample with its untagged colours tagged BT.709 limited range, as painting reads them; the encoder
 * tags the file from its first frame. Takes ownership of `sample`; the picture is shared, not copied.
 */
export async function tagBt709(sample: VideoSample): Promise<VideoSample> {
  const c = sample.colorSpace;
  if (c.primaries && c.transfer && c.matrix && c.fullRange === false) return sample;
  const { timestamp, duration } = sample;
  const frame = new AvFrame();
  frame.alloc();
  try {
    await toAvFrame(sample, frame);
  } catch (e) {
    frame.free();
    throw e;
  } finally {
    sample.close();
  }
  frame.colorPrimaries = AVCOL_PRI_BT709;
  frame.colorTrc = AVCOL_TRC_BT709;
  frame.colorSpace = AVCOL_SPC_BT709;
  frame.colorRange = AVCOL_RANGE_MPEG;
  return new VideoSample(new AvFrameVideoSampleResource(frame), { timestamp, duration });
}

/** Keeps a decoded sample as a `DecodedFrame`; the frame closes it. */
export function makeDecodedFrame(sample: VideoSample): Frame {
  return new DecodedFrame(sample);
}

/** The host seams the engine's mediabunny sources take: frames converted on use, skia image loading, software decode. */
export const frameSourceHooks: FrameSourceHooks = {
  makeFrame: makeDecodedFrame,
  loadImage: async (handle: MediaHandle) => {
    if (handle.kind === "path") return (await loadImage(handle.path)) as unknown as ImageBitmap;
    if (handle.kind === "blob")
      return (await loadImage(Buffer.from(await handle.blob.arrayBuffer()))) as unknown as ImageBitmap;
    return (await loadImage(handle.url)) as unknown as ImageBitmap;
  },
  hardwareAcceleration: "prefer-software",
};

export type { AnyCanvas };
