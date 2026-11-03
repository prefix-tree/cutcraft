import { AudioBufferSink, type Input } from "mediabunny";
import type { AudioSource, AudioSourceFactory, AudioSourceInfo, MediaHandle } from "../types";
import type { MediabunnyInputs } from "./mediabunny-input";

/** PCM ranges of one audio track, decoded on demand into AudioBuffers of the track's sample rate. */
export class MediabunnyAudioSource implements AudioSource {
  private input: Input | null = null;
  private sink: AudioBufferSink | null = null;
  private sampleRate = 48000;
  private channels = 2;

  constructor(
    private readonly assetId: string,
    private readonly handle: MediaHandle,
    private readonly inputs: MediabunnyInputs,
    private readonly context: BaseAudioContext,
    private readonly trackIndex = 0,
  ) {}

  async open(): Promise<AudioSourceInfo> {
    this.input = this.inputs.acquire(this.assetId, this.handle);
    const tracks = await this.input.getAudioTracks();
    const track = tracks[this.trackIndex] ?? (await this.input.getPrimaryAudioTrack());
    if (!track) return { sampleRate: 0, channels: 0, duration: 0, decodable: false };
    const [decodable, sampleRate, channels, duration] = await Promise.all([
      track.canDecode(),
      track.getSampleRate(),
      track.getNumberOfChannels(),
      track.computeDuration(),
    ]);
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.sink = new AudioBufferSink(track);
    return { sampleRate, channels, duration, decodable };
  }

  async range(from: number, to: number): Promise<AudioBuffer> {
    const sr = this.sampleRate;
    const length = Math.max(1, Math.ceil((to - from) * sr));
    const out = this.context.createBuffer(Math.max(1, this.channels), length, sr);
    if (!this.sink) return out;
    for await (const { buffer, timestamp } of this.sink.buffers(Math.max(0, from), to)) {
      const offset = Math.round((timestamp - from) * sr);
      const srcStart = Math.max(0, -offset);
      const dstStart = Math.max(0, offset);
      const n = Math.min(buffer.length - srcStart, length - dstStart);
      if (n <= 0) continue;
      for (let ch = 0; ch < out.numberOfChannels; ch++) {
        const data = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1));
        out.copyToChannel(data.subarray(srcStart, srcStart + n), ch, dstStart);
      }
    }
    return out;
  }

  close(): void {
    this.sink = null;
    if (this.input) this.inputs.release(this.assetId);
    this.input = null;
  }
}

export function mediabunnyAudioSourceFactory(inputs: MediabunnyInputs): AudioSourceFactory {
  return (assetId, handle, context) => new MediabunnyAudioSource(assetId, handle, inputs, context);
}
