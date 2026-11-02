import type { MediaResolver } from "@cutcraft/player/engine";
import { MediabunnyInputs } from "@cutcraft/player/engine";
import { AudioSampleSink, type InputAudioTrack } from "mediabunny";
import { initEnv } from "./env";
import type { PcmBuffer, PcmProvider } from "./mixer";

interface Opened {
  readonly sink: AudioSampleSink;
  readonly sampleRate: number;
  readonly channels: number;
}

/** Decodes audio ranges of the assets a composition uses, through Mediabunny, as planar float PCM. */
export class MediabunnyPcm implements PcmProvider {
  private readonly inputs = new MediabunnyInputs();
  private readonly opened = new Map<string, Promise<Opened | null>>();

  constructor(private readonly media: MediaResolver) {
    initEnv();
  }

  async range(asset: string, from: number, to: number): Promise<PcmBuffer> {
    const open = await this.open(asset);
    if (!open) return { sampleRate: 48000, channels: [new Float32Array(Math.max(1, Math.ceil((to - from) * 48000)))] };
    const sr = open.sampleRate;
    const length = Math.max(1, Math.ceil((to - from) * sr));
    const channels = Array.from({ length: Math.max(1, open.channels) }, () => new Float32Array(length));
    for await (const sample of open.sink.samples(Math.max(0, from), to)) {
      const offset = Math.round((sample.timestamp - from) * sr);
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
        return { sink: new AudioSampleSink(track), sampleRate, channels };
      })();
      this.opened.set(asset, p);
    }
    return p;
  }
}
