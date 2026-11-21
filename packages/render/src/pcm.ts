import { AudioSampleSink, type InputAudioTrack } from "mediabunny";

import {
  AUDIO_PREROLL_SECONDS,
  type BlockGrid,
  blockGrid,
  blockStart,
  MediabunnyInputs,
  type MediaResolver,
} from "@uberscene/player/engine";

import type { PcmBuffer, PcmProvider } from "./mixer";

interface Opened {
  readonly sink: AudioSampleSink;
  readonly sampleRate: number;
  readonly channels: number;
  /** Where the stream's blocks start, from its first two; null when it gives no grid. */
  readonly grid: BlockGrid | null;
}

/** Decodes audio ranges of the assets a composition uses, through Mediabunny, as planar float PCM. */
export class MediabunnyPcm implements PcmProvider {
  private readonly inputs = new MediabunnyInputs();
  private readonly opened = new Map<string, Promise<Opened | null>>();

  /**
   * With `onMissing`, an asset that cannot be opened is silence: `onMissing` is told why, once per asset. Without it,
   * the failure fails the mix.
   */
  constructor(
    private readonly media: MediaResolver,
    private readonly onMissing?: (asset: string, reason: string) => void,
  ) {}

  async range(asset: string, from: number, to: number): Promise<PcmBuffer> {
    const open = await this.open(asset);
    if (!open) return { sampleRate: 48000, channels: [new Float32Array(Math.max(1, Math.ceil((to - from) * 48000)))] };
    const sr = open.sampleRate;
    const length = Math.max(1, Math.ceil((to - from) * sr));
    const channels = Array.from({ length: Math.max(1, open.channels) }, () => new Float32Array(length));
    // Decoded from a little before the range and the start dropped: a decoder started mid-stream needs it to settle,
    // and its first block (cut short by Opus's pre-skip, applied again after a seek) falls there.
    for await (const sample of open.sink.samples(Math.max(0, from - AUDIO_PREROLL_SECONDS), to)) {
      const offset = blockStart(sample.timestamp, sample.numberOfFrames, sr, open.grid) - Math.round(from * sr);
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
      const opening = (async (): Promise<Opened | null> => {
        const handle = await this.media.resolve(asset);
        const input = this.inputs.acquire(asset, handle);
        const track: InputAudioTrack | null = await input.getPrimaryAudioTrack();
        if (!track || !(await track.canDecode())) return null;
        const [sampleRate, channels] = await Promise.all([track.getSampleRate(), track.getNumberOfChannels()]);
        const sink = new AudioSampleSink(track);
        return { sink, sampleRate, channels, grid: await firstBlocks(sink, sampleRate) };
      })();
      const onMissing = this.onMissing;
      p = onMissing
        ? opening.catch((error: unknown) => {
            onMissing(asset, error instanceof Error ? error.message : String(error));
            return null;
          })
        : opening;
      this.opened.set(asset, p);
    }
    return p;
  }
}

/** Where the stream's blocks start, from its first two ([blockGrid]). */
async function firstBlocks(sink: AudioSampleSink, sampleRate: number): Promise<BlockGrid | null> {
  const seen: { start: number; frames: number }[] = [];
  for await (const sample of sink.samples()) {
    seen.push({ start: Math.round(sample.timestamp * sampleRate), frames: sample.numberOfFrames });
    sample.close();
    if (seen.length === 2) break;
  }
  return blockGrid(seen[0], seen[1]);
}
