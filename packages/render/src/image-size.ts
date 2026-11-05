// The pixel size of an image file, read from its header: PNG, JPEG, GIF, WebP and SVG. Enough for a manifest entry,
// without decoding the picture.

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

export function imageSize(bytes: Uint8Array, name: string): ImageSize {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fail = (why: string): never => {
    throw new Error(`cannot read the size of ${name}: ${why}`);
  };
  // PNG: the IHDR chunk follows the 8-byte signature.
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47)
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  // GIF: the logical screen size, little-endian.
  if (b.length >= 10 && b.toString("latin1", 0, 3) === "GIF")
    return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  // JPEG: the first start-of-frame marker holds the size.
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let at = 2;
    while (at + 9 < b.length) {
      if (b[at] !== 0xff) return fail("a broken JPEG marker");
      const marker = b[at + 1] as number;
      const length = b.readUInt16BE(at + 2);
      const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (sof) return { width: b.readUInt16BE(at + 7), height: b.readUInt16BE(at + 5) };
      at += 2 + length;
    }
    return fail("no frame header in the JPEG");
  }
  // WebP: lossy (VP8), lossless (VP8L) or extended (VP8X).
  if (b.length >= 30 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") {
    const chunk = b.toString("latin1", 12, 16);
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
    return fail(`an unknown WebP chunk ${chunk}`);
  }
  // SVG: width and height, else the viewBox.
  const text = b.toString("utf8", 0, Math.min(b.length, 4096));
  const svg = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (svg) {
    const attr = (n: string) => Number.parseFloat(new RegExp(`\\s${n}\\s*=\\s*["']([\\d.]+)`).exec(svg)?.[1] ?? "");
    const [w, h] = [attr("width"), attr("height")];
    if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
    const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg);
    if (box) return { width: Math.round(Number(box[1])), height: Math.round(Number(box[2])) };
    return fail("an SVG with no width, height or viewBox");
  }
  return fail("not a PNG, JPEG, GIF, WebP or SVG");
}
