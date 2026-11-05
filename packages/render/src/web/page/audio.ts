// The soundtrack, made in the export page: the player's audio plan, its clips decoded with WebCodecs, mixed sample by
// sample, and encoded for the file's container (Opus with WebCodecs; AAC and MP3 with Mediabunny's WebAssembly
// encoders, as Chrome on Linux has neither; WAV as plain PCM).
import { registerAacEncoder } from "@mediabunny/aac-encoder";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";
import {
  type AudioCodec,
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  canEncodeAudio,
  Mp3OutputFormat,
  Mp4OutputFormat,
  Output,
  WavOutputFormat,
  WebMOutputFormat,
} from "mediabunny";

import type { ResolvedState } from "@cutcraft/kit";
import { buildAudioPlan, type MediaResolver, makeNestedResolver } from "@cutcraft/player/engine";

import { mixPlan } from "../../mixer";
import { MediabunnyPcm } from "../../pcm";
import type { AudioRequest } from "./protocol";

registerAacEncoder();
registerMp3Encoder();

const CODEC: Readonly<Record<AudioRequest["container"], AudioCodec>> = {
  mp4: "aac",
  webm: "opus",
  mp3: "mp3",
  wav: "pcm-s16",
};

export interface Soundtrack {
  /** The encoded file, or null when the range has no sound or no encoder takes it. */
  readonly bytes: Uint8Array | null;
  readonly codec: AudioCodec | null;
  readonly warnings: readonly string[];
}

export async function renderSoundtrack(
  state: ResolvedState,
  media: MediaResolver,
  r: AudioRequest,
): Promise<Soundtrack> {
  const plan = buildAudioPlan(
    state,
    r.from,
    r.to,
    makeNestedResolver(() => state),
  );
  if (plan.length === 0) return { bytes: null, codec: null, warnings: [] };
  const sampleRate = Number(state.items.get(state.composition.id)?.props.sampleRate ?? 48000);
  const codec = CODEC[r.container];
  if (!(await canEncodeAudio(codec, { numberOfChannels: 2, sampleRate })))
    return {
      bytes: null,
      codec: null,
      warnings: [`no ${codec} encoder for ${sampleRate} Hz stereo: the file has no sound`],
    };
  const target = new BufferTarget();
  const output = new Output({
    format:
      r.container === "mp4"
        ? new Mp4OutputFormat()
        : r.container === "webm"
          ? new WebMOutputFormat()
          : r.container === "mp3"
            ? new Mp3OutputFormat()
            : new WavOutputFormat(),
    target,
  });
  const source = new AudioSampleSource({ codec, ...(codec.startsWith("pcm-") ? {} : { bitrate: r.bitrate }) });
  output.addAudioTrack(source);
  await output.start();
  const pcm = new MediabunnyPcm(media);
  try {
    for await (const block of mixPlan(plan, pcm, { sampleRate, from: r.from, to: r.to })) {
      const planar = new Float32Array(block.left.length * 2);
      planar.set(block.left, 0);
      planar.set(block.right, block.left.length);
      const sample = new AudioSample({
        data: planar,
        format: "f32-planar",
        numberOfChannels: 2,
        sampleRate,
        timestamp: block.timestamp,
      });
      await source.add(sample);
      sample.close();
    }
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    pcm.dispose();
  }
  return { bytes: new Uint8Array(target.buffer as ArrayBuffer), codec, warnings: [] };
}
