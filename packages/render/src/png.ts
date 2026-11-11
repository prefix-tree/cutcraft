// A small PNG reader and writer for 8-bit pictures, so a contact sheet can be put together from cached cells without
// a browser. It reads what Chrome's canvas writes (RGB or RGBA, 8 bits, not interlaced) and writes RGBA.
import { deflateSync, inflateSync } from "node:zlib";

export interface Picture {
  readonly width: number;
  readonly height: number;
  /** width × height × 4 bytes, RGBA, row 0 at the top. */
  readonly rgba: Uint8Array;
}

const SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Decodes a PNG to RGBA. Throws for one it does not read: 16-bit, palette or interlaced. */
export function decodePng(bytes: Uint8Array): Picture {
  if (SIGNATURE.some((b, i) => bytes[i] !== b)) throw new Error("not a PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0,
    channels = 0;
  const data: Uint8Array[] = [];
  for (let at = 8; at + 8 <= bytes.length; ) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      const depth = body[8],
        colour = body[9],
        interlace = body[12];
      channels = colour === 6 ? 4 : colour === 2 ? 3 : 0;
      if (depth !== 8 || channels === 0 || interlace !== 0)
        throw new Error(`a PNG of bit depth ${depth}, colour type ${colour}, interlace ${interlace} is not read`);
    } else if (type === "IDAT") data.push(body);
    else if (type === "IEND") break;
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const rgba = new Uint8Array(width * height * 4);
  const line = new Uint8Array(stride);
  const above = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)] as number;
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? (line[x - channels] as number) : 0;
      const up = above[x] as number;
      const upLeft = x >= channels ? (above[x - channels] as number) : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const a = Math.abs(p - left),
          b = Math.abs(p - up),
          c = Math.abs(p - upLeft);
        predicted = a <= b && a <= c ? left : b <= c ? up : upLeft;
      }
      line[x] = ((row[x] as number) + predicted) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      rgba[o] = line[x * channels] as number;
      rgba[o + 1] = line[x * channels + 1] as number;
      rgba[o + 2] = line[x * channels + 2] as number;
      rgba[o + 3] = channels === 4 ? (line[x * channels + 3] as number) : 255;
    }
    above.set(line);
  }
  return { width, height, rgba };
}

/** Encodes RGBA as a PNG. */
export function encodePng(picture: Picture): Uint8Array {
  const { width, height, rgba } = picture;
  const stride = width * 4;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  const header = new Uint8Array(13);
  const h = new DataView(header.buffer);
  h.setUint32(0, width);
  h.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8);
  const chunk = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + body.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, body.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(body, 8);
    v.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
    return out;
  };
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", new Uint8Array()),
  ]);
}

/** A picture of one colour. */
export function blankPicture(width: number, height: number, colour: readonly [number, number, number]): Picture {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = colour[0];
    rgba[i + 1] = colour[1];
    rgba[i + 2] = colour[2];
    rgba[i + 3] = 255;
  }
  return { width, height, rgba };
}

/** Copies `part` into `whole` with its top left corner at (x, y); what falls outside is left out. */
export function paste(whole: Picture, part: Picture, x: number, y: number): void {
  const w = Math.min(part.width, whole.width - x);
  for (let row = 0; row < part.height && y + row < whole.height; row++)
    (whole.rgba as Uint8Array).set(
      part.rgba.subarray(row * part.width * 4, (row * part.width + w) * 4),
      ((y + row) * whole.width + x) * 4,
    );
}
