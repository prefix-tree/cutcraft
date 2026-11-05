// What an export writes: its container, from the file name, and the video codecs Chrome's WebCodecs encodes.
import {
  Mp3OutputFormat,
  Mp4OutputFormat,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
  QUALITY_VERY_LOW,
  WavOutputFormat,
  WebMOutputFormat,
} from "mediabunny";

/** MP4 and WebM hold video and sound; MP3 and WAV the soundtrack alone. */
export type Container = "mp4" | "webm" | "mp3" | "wav";
export type VideoContainer = "mp4" | "webm";
/** H.264 (MP4), VP9 (WebM) and AV1 (either): what Chrome encodes on every platform. */
export type VideoCodec = "avc" | "vp9" | "av1";

export const VIDEO_CODECS: Readonly<Record<VideoContainer, readonly VideoCodec[]>> = {
  mp4: ["avc", "av1"],
  webm: ["vp9", "av1"],
};

/** Mediabunny's quality presets by name; the name travels to the export page. */
export const QUALITIES = {
  "very-low": QUALITY_VERY_LOW,
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  "very-high": QUALITY_VERY_HIGH,
} as const;
export type QualityName = keyof typeof QUALITIES;

/** The container a file name asks for: .mp4, .webm, .mp3 or .wav. Anything else is an error that says what to use. */
export function containerOf(out: string): Container {
  const ext = /\.([a-z0-9]+)$/i.exec(out)?.[1]?.toLowerCase();
  if (ext === "mp4" || ext === "webm" || ext === "mp3" || ext === "wav") return ext;
  if (ext === "mov")
    throw new Error("a .mov (ProRes) is not written: export .mp4 (H.264) or .webm (VP9), which editors import too");
  throw new Error(`cannot write ${out}: use .mp4, .webm, .mp3 or .wav`);
}

export function outputFormat(
  container: Container,
): Mp4OutputFormat | WebMOutputFormat | Mp3OutputFormat | WavOutputFormat {
  return container === "mp4"
    ? new Mp4OutputFormat()
    : container === "webm"
      ? new WebMOutputFormat()
      : container === "mp3"
        ? new Mp3OutputFormat()
        : new WavOutputFormat();
}
