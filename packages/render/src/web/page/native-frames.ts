// Footage decoded by the native codec process instead of WebCodecs (`UBERSCENE_CODECS=native` or `native-decode`).
// The page asks Node's server for an asset's frames; Node runs `uberscene-codec decode` and streams back 8-bit I420
// pictures, each made into a VideoFrame here. An asset the native decoder cannot read (or one served by URL rather
// than from a file) falls back to the browser's decoder, with one warning.
import {
  type CreateCanvas,
  type Ctx2D,
  copyFrame,
  devWarn,
  type Frame,
  type FrameSource,
  type FrameSourceFactory,
  type FrameSourceInfo,
  type MediaHandle,
} from "@uberscene/player/engine";

/** The header of a picture the native decoder sends: `UBF1`, width, height, matrix, full range, pts, duration. */
export const FRAME_HEADER = 32;
const MAGIC = 0x31464255; // "UBF1" read little-endian

export interface NativeFrameData {
  readonly width: number;
  readonly height: number;
  readonly matrix: number;
  readonly fullRange: boolean;
  /** Source seconds. */
  readonly timestamp: number;
  readonly duration: number;
  /** Tight I420: Y, then U, then V, chroma planes half size rounded up. */
  readonly planes: Uint8Array;
}

/** Bytes of a picture's planes after its header. */
export function planeBytes(width: number, height: number): number {
  return width * height + 2 * Math.ceil(width / 2) * Math.ceil(height / 2);
}

/** Reads pictures from the decoder's byte stream as they arrive. */
export async function* readFrames(body: ReadableStream<Uint8Array>): AsyncGenerator<NativeFrameData, void, unknown> {
  const reader = body.getReader();
  let buf: Uint8Array = new Uint8Array(0);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value?.length) buf = concat(buf, value);
      for (;;) {
        const parsed = parseFrame(buf);
        if (!parsed) break;
        yield parsed.frame;
        buf = buf.subarray(parsed.length);
      }
      if (done) {
        if (buf.length > 0) throw new Error(`the native decoder's stream ended inside a picture (${buf.length} bytes)`);
        return;
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

/** One picture from the start of `buf`, or null when it is not all there yet. */
export function parseFrame(buf: Uint8Array): { frame: NativeFrameData; length: number } | null {
  if (buf.length < FRAME_HEADER) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, FRAME_HEADER);
  if (view.getUint32(0, true) !== MAGIC) throw new Error("the native decoder sent something that is not a picture");
  const width = view.getUint32(4, true);
  const height = view.getUint32(8, true);
  const length = FRAME_HEADER + planeBytes(width, height);
  if (buf.length < length) return null;
  return {
    length,
    frame: {
      width,
      height,
      matrix: view.getUint8(12),
      fullRange: view.getUint8(13) === 1,
      timestamp: view.getFloat64(16, true),
      duration: view.getFloat64(24, true),
      planes: buf.slice(FRAME_HEADER, length),
    },
  };
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) return b;
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

const MATRICES: Record<number, { matrix: VideoMatrixCoefficients; primaries: VideoColorPrimaries }> = {
  1: { matrix: "bt709", primaries: "bt709" },
  5: { matrix: "bt470bg", primaries: "bt470bg" },
  6: { matrix: "smpte170m", primaries: "smpte170m" },
  // Chrome takes these; TypeScript's DOM types do not list them yet.
  9: { matrix: "bt2020-ncl" as VideoMatrixCoefficients, primaries: "bt2020" as VideoColorPrimaries },
};

/** A decoded picture as a VideoFrame; odd sides are padded to even ones, as an I420 VideoFrame needs. */
function toVideoFrame(d: NativeFrameData): VideoFrame {
  const color = MATRICES[d.matrix] ?? MATRICES[1]!;
  const colorSpace: VideoColorSpaceInit = { ...color, transfer: "bt709", fullRange: d.fullRange };
  const init = (codedWidth: number, codedHeight: number): VideoFrameBufferInit => ({
    format: "I420",
    codedWidth,
    codedHeight,
    visibleRect: { x: 0, y: 0, width: d.width, height: d.height },
    timestamp: Math.round(d.timestamp * 1e6),
    duration: Math.max(1, Math.round(d.duration * 1e6)),
    colorSpace,
  });
  if (d.width % 2 === 0 && d.height % 2 === 0) return new VideoFrame(d.planes, init(d.width, d.height));
  const [w, h] = [d.width + (d.width % 2), d.height + (d.height % 2)];
  return new VideoFrame(padI420(d.planes, d.width, d.height, w, h), init(w, h));
}

function padI420(src: Uint8Array, w: number, h: number, pw: number, ph: number): Uint8Array {
  const [cw, ch] = [Math.ceil(w / 2), Math.ceil(h / 2)];
  const [pcw, pch] = [pw / 2, ph / 2];
  const out = new Uint8Array(pw * ph + 2 * pcw * pch);
  const copy = (from: number, to: number, sw: number, sh: number, dw: number): void => {
    for (let y = 0; y < sh; y++) out.set(src.subarray(from + y * sw, from + y * sw + sw), to + y * dw);
  };
  copy(0, 0, w, h, pw);
  copy(w * h, pw * ph, cw, ch, pcw);
  copy(w * h + cw * ch, pw * ph + pcw * pch, cw, ch, pcw);
  return out;
}

/** A frame the native decoder made: a VideoFrame drawn as it is, copied into a canvas to be kept. */
class NativeFrame implements Frame {
  private readonly frame: VideoFrame;
  readonly timestamp: number;
  readonly duration: number;
  readonly width: number;
  readonly height: number;

  constructor(
    data: NativeFrameData,
    private readonly createCanvas: CreateCanvas,
  ) {
    this.frame = toVideoFrame(data);
    this.timestamp = data.timestamp;
    this.duration = data.duration;
    this.width = data.width;
    this.height = data.height;
  }

  draw(
    ctx: Ctx2D,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    crop?: { x: number; y: number; w: number; h: number },
  ): void {
    if (crop) ctx.drawImage(this.frame, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
    else ctx.drawImage(this.frame, dx, dy, dw, dh);
  }

  retain(): Frame {
    return copyFrame(this, this.createCanvas);
  }

  close(): void {
    this.frame.close();
  }
}

interface Probe {
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly fps?: number;
  readonly codec?: string;
  readonly decodable: boolean;
  readonly reason?: string;
}

/** An asset's frames from the native decoder, or from `fallback` when it cannot read them. */
class NativeFrameSource implements FrameSource {
  private browser: FrameSource | null = null;

  constructor(
    private readonly assetId: string,
    private readonly createCanvas: CreateCanvas,
    private readonly fallback: () => FrameSource,
  ) {}

  private url(path: string, query = ""): string {
    return `/native/${path}/${encodeURIComponent(this.assetId)}${query}`;
  }

  async open(): Promise<FrameSourceInfo> {
    let probe: Probe;
    try {
      const res = await fetch(this.url("probe"));
      probe = res.ok ? ((await res.json()) as Probe) : { decodable: false, reason: await res.text() };
    } catch (error) {
      probe = { decodable: false, reason: error instanceof Error ? error.message : String(error) };
    }
    if (!probe.decodable || !probe.width || !probe.height) {
      devWarn(
        `native-decode:${this.assetId}`,
        `the native decoder cannot read "${this.assetId}" (${probe.reason ?? "no reason given"}); the browser decodes it`,
      );
      this.browser = this.fallback();
      return this.browser.open();
    }
    return {
      width: probe.width,
      height: probe.height,
      duration: probe.duration ?? 0,
      ...(probe.fps ? { fps: probe.fps } : {}),
      decodable: true,
    };
  }

  async frameAt(sourceTime: number): Promise<Frame | null> {
    if (this.browser) return this.browser.frameAt(sourceTime);
    const res = await fetch(this.url("frames", `?at=${Math.max(0, sourceTime)}`));
    if (!res.ok || !res.body) throw new Error(`native decoder: ${await res.text()}`);
    let first: Frame | null = null;
    for await (const data of readFrames(res.body)) {
      first ??= new NativeFrame(data, this.createCanvas);
    }
    return first;
  }

  async *stream(from: number, to: number): AsyncGenerator<Frame, void, unknown> {
    if (this.browser) {
      yield* this.browser.stream(from, to);
      return;
    }
    const abort = new AbortController();
    const query = `?from=${Math.max(0, from)}${Number.isFinite(to) ? `&to=${to}` : ""}`;
    try {
      const res = await fetch(this.url("frames", query), { signal: abort.signal });
      if (!res.ok || !res.body) throw new Error(`native decoder: ${await res.text()}`);
      for await (const data of readFrames(res.body)) yield new NativeFrame(data, this.createCanvas);
    } finally {
      // Stopping the stream early (a seek, the clip ending) closes the request, and Node stops the decoder.
      abort.abort();
    }
  }

  close(): void {
    this.browser?.close();
  }
}

/** Images stay with `fallback`; video goes to the native decoder, falling back per asset. */
export function nativeFrameSourceFactory(createCanvas: CreateCanvas, fallback: FrameSourceFactory): FrameSourceFactory {
  return (assetId: string, handle: MediaHandle, kind: Parameters<FrameSourceFactory>[2]) =>
    kind === "image"
      ? fallback(assetId, handle, kind)
      : new NativeFrameSource(assetId, createCanvas, () => fallback(assetId, handle, kind));
}
