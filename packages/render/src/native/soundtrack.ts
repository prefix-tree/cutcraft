// The soundtrack of an export whose encoder is native: mixed here, from sound the native decoder reads, when decoding
// is native too; mixed in the page otherwise. Either way `uberscene-codec encode-audio` writes the file the export
// muxes: AAC in an M4A for an MP4, 24-bit PCM for a MOV, 16-bit PCM for a WAV, MP3 for an MP3.
import { spawn } from "node:child_process";

import { buildAudioPlan, type MediaResolver, makeNestedResolver } from "@uberscene/player/engine";
import type { ResolvedState } from "@uberscene/sdk";

import { clippingWarning, createLoudnessMeter } from "../loudness";
import { mixPlan, type PcmBuffer, type PcmProvider } from "../mixer";

/** The file a soundtrack goes in: the export's own container, or the video's for a video. */
export type SoundContainer = "mp4" | "mov" | "wav" | "mp3";

export interface NativeSoundtrack {
  /** The encoded file, or null when the range has no sound. */
  readonly bytes: Uint8Array | null;
  readonly warnings: readonly string[];
}

/** What `encode-audio` writes for each container. */
const ENCODE: Readonly<Record<SoundContainer, readonly string[]>> = {
  mp4: ["--format", "aac"],
  mov: ["--format", "wav", "--bits", "24"],
  wav: ["--format", "wav", "--bits", "16"],
  mp3: ["--format", "mp3"],
};

/** The sound of an asset the native decoder cannot read: the export mixes in the page instead. */
export class NativeSoundUnavailable extends Error {}

/** Decodes audio ranges with `uberscene-codec decode-audio`: planar float PCM at each file's own rate. */
export class NativePcm implements PcmProvider {
  constructor(
    private readonly binary: string,
    private readonly media: MediaResolver,
  ) {}

  async range(asset: string, from: number, to: number): Promise<PcmBuffer> {
    const handle = await this.media.resolve(asset);
    if (handle.kind !== "path")
      throw new NativeSoundUnavailable(`${asset} is served from a URL, and the native decoder reads files`);
    let bytes: Buffer;
    try {
      bytes = await run(this.binary, ["decode-audio", handle.path, "--from", String(from), "--to", String(to)]);
    } catch (error) {
      throw new NativeSoundUnavailable(`the native decoder cannot read the sound of ${asset}: ${message(error)}`);
    }
    return parseStretch(bytes, to - from);
  }
}

/** The header before decoded sound: `UBA1`, sample rate, channels, frames (u32 each), then each channel in turn. */
const AUDIO_HEADER = 16;

export function parseStretch(bytes: Uint8Array, seconds: number): PcmBuffer {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < AUDIO_HEADER || String.fromCharCode(...bytes.subarray(0, 4)) !== "UBA1")
    throw new Error("the native decoder wrote no sound header");
  const sampleRate = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const frames = view.getUint32(12, true);
  // A file with no audio track is silence, as the browser's decoder makes it.
  if (count === 0) return { sampleRate: 48000, channels: [new Float32Array(Math.max(1, Math.ceil(seconds * 48000)))] };
  if (bytes.length !== AUDIO_HEADER + count * frames * 4)
    throw new Error(`the native decoder's sound is ${bytes.length} bytes, not ${count} channels of ${frames} frames`);
  // Copied out, so each channel is aligned whatever the buffer's offset (a Node Buffer's `slice` would be a view).
  const channels = Array.from({ length: count }, (_, ch) => {
    const plane = new Float32Array(frames);
    const at = AUDIO_HEADER + ch * frames * 4;
    new Uint8Array(plane.buffer).set(bytes.subarray(at, at + frames * 4));
    return plane;
  });
  return { sampleRate, channels };
}

/**
 * The composition's sound over [from, to), mixed here with the native decoder's PCM and encoded natively. Throws
 * `NativeSoundUnavailable` when an asset's sound is one the native decoder cannot read.
 */
export async function mixNatively(options: {
  readonly binary: string;
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  readonly from: number;
  readonly to: number;
  readonly container: SoundContainer;
  readonly bitrate: number;
}): Promise<NativeSoundtrack> {
  const { state, from, to } = options;
  const plan = buildAudioPlan(
    state,
    from,
    to,
    makeNestedResolver(() => state),
  );
  if (plan.length === 0) return { bytes: null, warnings: [] };
  const sampleRate = soundtrackRate(state);
  const encoder = startEncoder(options.binary, options.container, sampleRate, options.bitrate);
  const pcm = new NativePcm(options.binary, options.media);
  // Measured before the clamp, then clamped here, as the page does.
  const meter = createLoudnessMeter(sampleRate);
  try {
    for await (const block of mixPlan(plan, pcm, { sampleRate, from, to, clamp: false })) {
      meter.add(block.left, block.right);
      const n = block.left.length;
      const interleaved = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        interleaved[2 * i] = Math.max(-1, Math.min(1, block.left[i] as number));
        interleaved[2 * i + 1] = Math.max(-1, Math.min(1, block.right[i] as number));
      }
      await encoder.write(new Uint8Array(interleaved.buffer));
    }
  } catch (error) {
    encoder.kill();
    throw error;
  }
  const bytes = await encoder.end();
  const clips = clippingWarning(meter.result(), from);
  return { bytes, warnings: clips ? [clips] : [] };
}

/** The page's mix (a WAV of 32-bit float stereo, clamped) encoded natively. */
export async function encodePageMix(options: {
  readonly binary: string;
  readonly wav: Uint8Array;
  readonly container: SoundContainer;
  readonly bitrate: number;
}): Promise<Uint8Array> {
  const { sampleRate, data } = floatWav(options.wav);
  const encoder = startEncoder(options.binary, options.container, sampleRate, options.bitrate);
  try {
    const step = 1 << 20;
    for (let at = 0; at < data.length; at += step) await encoder.write(data.subarray(at, at + step));
  } catch (error) {
    encoder.kill();
    throw error;
  }
  return encoder.end();
}

/** The sample rate a composition's soundtrack is mixed at: its `sampleRate` prop, else 48 kHz. */
function soundtrackRate(state: ResolvedState): number {
  return Number(state.items.get(state.composition.id)?.props.sampleRate ?? 48000);
}

/** The sample rate and sample bytes of a WAV of 32-bit float stereo. */
export function floatWav(wav: Uint8Array): { sampleRate: number; data: Uint8Array } {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const tag = (at: number): string => String.fromCharCode(...wav.subarray(at, at + 4));
  if (wav.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("the page's mix is not a WAV");
  let format: { tag: number; channels: number; rate: number; bits: number } | null = null;
  for (let at = 12; at + 8 <= wav.length; ) {
    const id = tag(at);
    const size = view.getUint32(at + 4, true);
    if (id === "fmt ")
      format = {
        tag: view.getUint16(at + 8, true),
        channels: view.getUint16(at + 10, true),
        rate: view.getUint32(at + 12, true),
        bits: view.getUint16(at + 22, true),
      };
    else if (id === "data") {
      if (!format || (format.tag !== 3 && format.tag !== 0xfffe) || format.bits !== 32 || format.channels !== 2)
        throw new Error("the page's mix is not 32-bit float stereo");
      const end = Math.min(wav.length, at + 8 + size);
      return { sampleRate: format.rate, data: wav.subarray(at + 8, end - ((end - at - 8) % 8)) };
    }
    at += 8 + size + (size % 2);
  }
  throw new Error("the page's mix has no sound data");
}

interface Encoder {
  /** Writes interleaved f32 bytes, resolving once the process has taken them. */
  write(bytes: Uint8Array): Promise<void>;
  /** Ends the input and resolves with the whole file. */
  end(): Promise<Uint8Array>;
  kill(): void;
}

function startEncoder(binary: string, container: SoundContainer, sampleRate: number, bitrate: number): Encoder {
  const args = [
    "encode-audio",
    ...ENCODE[container],
    "--rate",
    String(sampleRate),
    "--channels",
    "2",
    "--kbps",
    String(Math.max(1, Math.round(bitrate / 1000))),
  ];
  const child = spawn(binary, args, { stdio: ["pipe", "pipe", "pipe"] });
  const out: Buffer[] = [];
  const err: Buffer[] = [];
  child.stdout.on("data", (b: Buffer) => out.push(b));
  child.stderr.on("data", (b: Buffer) => err.push(b));
  child.stdin.on("error", () => undefined);
  const closed = new Promise<number | null>((ok, fail) => {
    child.on("error", fail);
    child.on("close", ok);
  });
  const failure = (code: number | null): Error =>
    new Error(`the native audio encoder failed: ${Buffer.concat(err).toString().trim() || `exit ${code}`}`);
  return {
    write: (bytes) =>
      new Promise<void>((ok, fail) => {
        if (child.exitCode !== null) {
          fail(failure(child.exitCode));
          return;
        }
        child.stdin.write(bytes, (error) => (error ? fail(error) : ok()));
      }),
    async end() {
      child.stdin.end();
      const code = await closed;
      if (code !== 0) throw failure(code);
      return new Uint8Array(Buffer.concat(out));
    },
    kill: () => child.kill(),
  };
}

function run(binary: string, args: readonly string[]): Promise<Buffer> {
  return new Promise((ok, fail) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (b: Buffer) => out.push(b));
    child.stderr.on("data", (b: Buffer) => err.push(b));
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0
        ? ok(Buffer.concat(out))
        : fail(new Error(Buffer.concat(err).toString().trim() || `uberscene-codec exited with ${code}`)),
    );
  });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
