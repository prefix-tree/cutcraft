import { AudioSampleSink, EncodedPacketSink, type InputAudioTrack } from "mediabunny";

import type { MediaResolver } from "@uberscene/player/engine";
import { MediabunnyInputs } from "@uberscene/player/engine";

import type { PcmBuffer, PcmProvider } from "./mixer";

interface Opened {
  readonly sink: AudioSampleSink;
  readonly sampleRate: number;
  readonly channels: number;
  /** For Opus, what it takes to put a decode that starts mid-file back on the file's own timeline. */
  readonly opus: OpusTiming | null;
}

/**
 * Decoding starts this far before a range, so the Opus decoder settles (Opus asks for 80 ms of pre-roll after a seek)
 * and the sample that covers the range's start is still decoded once its timestamp is corrected.
 */
const PREROLL_S = 0.08;
/** And runs this far past it, so a sample whose timestamp is corrected earlier still reaches the range's end. */
const POSTROLL_S = 0.01;

/** Decodes audio ranges of the assets a composition uses, through Mediabunny, as planar float PCM. */
export class MediabunnyPcm implements PcmProvider {
  private readonly inputs = new MediabunnyInputs();
  private readonly opened = new Map<string, Promise<Opened | null>>();

  constructor(private readonly media: MediaResolver) {}

  async range(asset: string, from: number, to: number): Promise<PcmBuffer> {
    const open = await this.open(asset);
    if (!open) return { sampleRate: 48000, channels: [new Float32Array(Math.max(1, Math.ceil((to - from) * 48000)))] };
    const sr = open.sampleRate;
    const length = Math.max(1, Math.ceil((to - from) * sr));
    const channels = Array.from({ length: Math.max(1, open.channels) }, () => new Float32Array(length));
    const start = Math.max(0, from - PREROLL_S);
    const shift = open.opus ? await opusShift(open.opus, start) : 0;
    for await (const sample of open.sink.samples(start, to + POSTROLL_S)) {
      const offset = Math.round((sample.timestamp + shift - from) * sr);
      const srcStart = Math.max(0, -offset);
      const dstStart = Math.max(0, offset);
      const n = Math.min(sample.numberOfFrames - srcStart, length - dstStart);
      if (n > 0) {
        const plane = new Float32Array(sample.numberOfFrames);
        for (let ch = 0; ch < channels.length; ch++) {
          sample.copyTo(plane, { planeIndex: Math.min(ch, sample.numberOfChannels - 1), format: "f32-planar" });
          (channels[ch] as Float32Array).set(plane.subarray(srcStart, srcStart + n), dstStart);
        }
      }
      sample.close();
    }
    return { sampleRate: sr, channels };
  }

  dispose(): void {
    this.opened.clear();
    this.inputs.dispose();
  }

  private open(asset: string): Promise<Opened | null> {
    let p = this.opened.get(asset);
    if (!p) {
      p = (async () => {
        const handle = await this.media.resolve(asset);
        const input = this.inputs.acquire(asset, handle);
        const track: InputAudioTrack | null = await input.getPrimaryAudioTrack();
        if (!track || !(await track.canDecode())) return null;
        const [sampleRate, channels] = await Promise.all([track.getSampleRate(), track.getNumberOfChannels()]);
        const opus = (await track.getCodec()) === "opus" ? await opusTiming(track) : null;
        return { sink: new AudioSampleSink(track), sampleRate, channels, opus };
      })();
      this.opened.set(asset, p);
    }
    return p;
  }
}

// Opus after a seek. Chrome's decoder drops the stream's pre-skip from the first packet it decodes after every
// configure, mid-file as at the start, stamps what is left with that packet's timestamp, and Mediabunny counts on
// from that stamp. From the first packet that is right: what it drops is the encoder's priming. From a later packet it
// drops real sound, so what is left starts preSkip samples into the packet; on the file's timeline (decoded from the
// start, preSkip trimmed) that is S, the packet's decoder-input position, the sum of the packets before it at 48 kHz.
// The container's timestamp for the packet is not S: Ogg's is S - preSkip, exactly; WebM's is S (Mediabunny does not
// apply CodecDelay) rounded to the millisecond. S is a multiple of 120 (2.5 ms, the shortest Opus frame) and the
// rounding is well under half of that, so S comes back exact, and the decode is moved by S - timestamp.

const OPUS_RATE = 48000;
const OPUS_GRID = 120;

interface OpusTiming {
  readonly packets: EncodedPacketSink;
  /** The first packet's timestamp: where decoding from the start puts the first sample. */
  readonly first: number;
  readonly firstSequence: number;
  /** What the container's timestamps lack of the decoder-input position, in 48 kHz samples: 0 or the pre-skip. */
  readonly lag: number;
}

async function opusTiming(track: InputAudioTrack): Promise<OpusTiming | null> {
  const config = await track.getDecoderConfig();
  const head = config?.description;
  if (!head) return null;
  const bytes = ArrayBuffer.isView(head)
    ? new Uint8Array(head.buffer, head.byteOffset, head.byteLength)
    : new Uint8Array(head as ArrayBuffer);
  if (bytes.length < 12) return null;
  const preSkip = (bytes[10] as number) | ((bytes[11] as number) << 8);
  if (preSkip === 0) return null;
  const packets = new EncodedPacketSink(track);
  const p0 = await packets.getFirstPacket();
  const p1 = p0 && (await packets.getNextPacket(p0));
  const length = p0 && opusPacketSamples(p0.data);
  if (!p0 || !p1 || !length) return null;
  // The second packet starts at S = the first packet's length; its timestamp says S, or S - preSkip.
  const gap = length - Math.round((p1.timestamp - p0.timestamp) * OPUS_RATE);
  return {
    packets,
    first: p0.timestamp,
    firstSequence: p0.sequenceNumber,
    lag: Math.abs(gap - preSkip) < Math.abs(gap) ? preSkip : 0,
  };
}

/** Seconds to add to the timestamps of a decode Mediabunny starts at `start`. */
async function opusShift(t: OpusTiming, start: number): Promise<number> {
  const options = { verifyKeyPackets: true };
  const packet = (await t.packets.getKeyPacket(start, options)) ?? (await t.packets.getFirstKeyPacket(options));
  // The first packet is at S = 0 whatever its timestamp says (Ogg's is clamped to 0, not -preSkip).
  if (!packet || packet.sequenceNumber === t.firstSequence) return 0;
  const raw = (packet.timestamp - t.first) * OPUS_RATE + t.lag;
  const position = Math.max(0, Math.round(raw / OPUS_GRID) * OPUS_GRID);
  return t.first + position / OPUS_RATE - packet.timestamp;
}

/** The length of an Opus packet in 48 kHz samples, from its table-of-contents byte (RFC 6716, section 3.1). */
export function opusPacketSamples(data: Uint8Array): number {
  const toc = data[0];
  if (toc === undefined) return 0;
  const config = toc >> 3;
  const frame =
    config < 12
      ? [480, 960, 1920, 2880][config % 4]
      : config < 16
        ? [480, 960][config % 2]
        : [120, 240, 480, 960][config % 4];
  const code = toc & 3;
  const count = code === 0 ? 1 : code === 3 ? (data[1] ?? 0) & 0x3f : 2;
  return (frame as number) * count;
}
