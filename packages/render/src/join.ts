// The export page hands back encoded pieces: runs of frames (each its own small file, timestamps from 0) and the
// soundtrack. Node writes their packets into the final file without decoding them again.
import {
  ALL_FORMATS,
  BufferSource,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  type EncodedVideoPacketSource,
  Input,
  type InputAudioTrack,
} from "mediabunny";

/** Splits frames [first, last) into runs of whole keyframe intervals, about three per tab, each starting on a keyframe the encoder would make anyway. */
export function planSegments(
  first: number,
  last: number,
  keyFrames: number,
  tabs: number,
  wanted?: number,
): { first: number; last: number }[] {
  const total = last - first;
  const gop = Math.max(1, keyFrames);
  const even = Math.ceil(total / (tabs * 3));
  const length = Math.max(gop, Math.round((wanted ?? even) / gop) * gop);
  const out: { first: number; last: number }[] = [];
  for (let a = first; a < last; a += length) out.push({ first: a, last: Math.min(last, a + length) });
  return out;
}

export interface Fed {
  /** Timestamp, in seconds from the start of the output, of the end of the last packet written. */
  readonly end: number;
}

/**
 * Writes one segment's packets into the final video track, shifted to where the segment belongs.
 * Timestamps are snapped to the frame grid: a WebM stores milliseconds, and the offset is exact.
 */
export async function feedSegment(
  bytes: Uint8Array,
  into: {
    source: EncodedVideoPacketSource;
    fps: number;
    offsetFrames: number;
    config: { current: VideoDecoderConfig | null };
  },
  before: (timestamp: number) => Promise<void>,
): Promise<Fed> {
  const input = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("the export page produced a segment with no video");
    const config = await track.getDecoderConfig();
    if (!config) throw new Error("the export page produced a segment with no decoder configuration");
    const first = into.config.current;
    if (first && !compatibleConfig(first, config))
      throw new Error(
        `segments were encoded with different settings (${first.codec} against ${config.codec}); they cannot be joined`,
      );
    let end = 0;
    for await (const packet of new EncodedPacketSink(track).packets()) {
      const frame = Math.round(packet.timestamp * into.fps) + into.offsetFrames;
      const timestamp = frame / into.fps;
      await before(timestamp);
      await into.source.add(
        packet.clone({ timestamp, duration: 1 / into.fps }),
        first ? undefined : { decoderConfig: config },
      );
      end = Math.max(end, timestamp + 1 / into.fps);
    }
    into.config.current ??= config;
    return { end };
  } finally {
    input.dispose();
  }
}

/**
 * Whether two decoder configurations describe streams one decoder can play through: the same codec, profile and
 * bit depth and the same size. VP9 level strings differ between encoders and mean nothing to a decoder; an AVC
 * description (its parameter sets) must match byte for byte.
 */
export function compatibleConfig(a: VideoDecoderConfig, b: VideoDecoderConfig): boolean {
  if (a.codedWidth !== b.codedWidth || a.codedHeight !== b.codedHeight) return false;
  if (a.codec.startsWith("vp09") && b.codec.startsWith("vp09")) {
    const [, pa, , da] = a.codec.split("."),
      [, pb, , db] = b.codec.split(".");
    return pa === pb && da === db;
  }
  if (a.codec !== b.codec) return false;
  const da = a.description ? new Uint8Array(a.description as ArrayBuffer) : null;
  const db = b.description ? new Uint8Array(b.description as ArrayBuffer) : null;
  if (!da || !db) return da === db;
  return da.length === db.length && da.every((v, i) => v === db[i]);
}

/** The encoded soundtrack the page made, read packet by packet into the output's audio track. */
export class AudioFeed {
  private constructor(
    private readonly input: Input,
    private readonly track: InputAudioTrack,
    private readonly packets: AsyncIterator<import("mediabunny").EncodedPacket>,
    readonly source: EncodedAudioPacketSource,
    private readonly config: AudioDecoderConfig,
  ) {}

  static async open(bytes: Uint8Array): Promise<AudioFeed> {
    const input = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS });
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error("the export page produced a soundtrack with no audio track");
    const config = await track.getDecoderConfig();
    if (!config) throw new Error("the export page produced a soundtrack with no decoder configuration");
    const codec = await track.getCodec();
    if (!codec) throw new Error("the export page produced a soundtrack in a codec Mediabunny does not name");
    const packets = new EncodedPacketSink(track).packets()[Symbol.asyncIterator]();
    return new AudioFeed(input, track, packets, new EncodedAudioPacketSource(codec), config);
  }

  private written = 0;
  private done = false;
  private first = true;

  /** Writes packets up to `until` seconds, so sound and picture stay interleaved in the file. */
  async until(until: number): Promise<void> {
    while (!this.done && this.written < until) {
      const next = await this.packets.next();
      if (next.done) {
        this.done = true;
        return;
      }
      await this.source.add(next.value, this.first ? { decoderConfig: this.config } : undefined);
      this.first = false;
      this.written = next.value.timestamp + next.value.duration;
    }
  }

  dispose(): void {
    void this.track;
    this.input.dispose();
  }
}
