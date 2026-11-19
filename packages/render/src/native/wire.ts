// What the native codec process writes and reads (native/PROTOCOL.md): little-endian headers before raw pictures
// and encoded packets.

/** The header before each RGBA picture sent to the encoder: `UBR1`, width, height, 4 bytes unused. */
const RAW_HEADER = 16;

export function rawHeader(width: number, height: number): Buffer {
  const h = Buffer.alloc(RAW_HEADER);
  h.write("UBR1", 0, "latin1");
  h.writeUInt32LE(width, 4);
  h.writeUInt32LE(height, 8);
  return h;
}

interface NativePacket {
  readonly key: boolean;
  /** In frames from the start of the piece. */
  readonly pts: number;
  readonly dts: number;
  readonly data: Uint8Array;
}

export interface NativeEncoded {
  /** The decoder configuration: an avcC for H.264, empty for ProRes. */
  readonly config: Uint8Array;
  readonly packets: readonly NativePacket[];
}

const PACKET_HEADER = 32;

/** The encoder's whole output: its configuration, then its packets. */
export function parseEncoded(bytes: Uint8Array): NativeEncoded {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number): string => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (bytes.length < 8 || tag(0) !== "UBC1") throw new Error("the native encoder wrote no configuration");
  const length = view.getUint32(4, true);
  if (8 + length > bytes.length) throw new Error("the native encoder's configuration is cut short");
  const config = bytes.slice(8, 8 + length);
  const packets: NativePacket[] = [];
  let at = 8 + length;
  while (at < bytes.length) {
    if (at + PACKET_HEADER > bytes.length || tag(at) !== "UBP1")
      throw new Error(`the native encoder wrote something that is not a packet at byte ${at}`);
    const size = view.getUint32(at + 24, true);
    const end = at + PACKET_HEADER + size;
    if (end > bytes.length) throw new Error("the native encoder's last packet is cut short");
    packets.push({
      key: bytes[at + 4] === 1,
      pts: Number(view.getBigInt64(at + 8, true)),
      dts: Number(view.getBigInt64(at + 16, true)),
      data: bytes.slice(at + PACKET_HEADER, end),
    });
    at = end;
  }
  return { config, packets };
}

/** The WebCodecs codec string of an avcC record: `avc1.` and its profile, constraint flags and level in hex. */
export function avcCodecString(avcc: Uint8Array): string {
  if (avcc.length < 4 || avcc[0] !== 1) throw new Error("the native encoder's avcC is not a version 1 record");
  const hex = (n: number): string => n.toString(16).padStart(2, "0");
  return `avc1.${hex(avcc[1] as number)}${hex(avcc[2] as number)}${hex(avcc[3] as number)}`;
}
