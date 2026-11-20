// What an export writes: its container, from the file name, and the video codecs Chrome's WebCodecs encodes, plus
// ProRes in a .mov when the native encoder is on (`UBERSCENE_CODECS`).
import {
  MovOutputFormat,
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

/** MP4, WebM and MOV hold video and sound; MP3 and WAV the soundtrack alone. */
export type Container = "mp4" | "webm" | "mov" | "mp3" | "wav";
export type VideoContainer = "mp4" | "webm" | "mov";
/** H.264 (MP4), VP9 (WebM) and AV1 (either): what Chrome encodes on every platform. ProRes (MOV) is native only. */
export type VideoCodec = "avc" | "vp9" | "av1" | "prores";

export const VIDEO_CODECS: Readonly<Record<VideoContainer, readonly VideoCodec[]>> = {
  mp4: ["avc", "av1"],
  webm: ["vp9", "av1"],
  mov: ["prores"],
};

/** What the native encoder writes: H.264 into an MP4, ProRes into a MOV. */
export const NATIVE_VIDEO_CODECS: readonly VideoCodec[] = ["avc", "prores"];

/** ProRes profiles by quality preset: Proxy, LT, 422, 422 HQ (the default) and 4444. */
export const PRORES_PROFILES = {
  "very-low": "proxy",
  low: "lt",
  medium: "standard",
  high: "hq",
  "very-high": "4444",
} as const;
export type ProResProfile = (typeof PRORES_PROFILES)[keyof typeof PRORES_PROFILES];

/** The sample-entry four-character code of each ProRes profile: the codec string of its decoder configuration. */
export const PRORES_FOURCC: Readonly<Record<ProResProfile, string>> = {
  proxy: "apco",
  lt: "apcs",
  standard: "apcn",
  hq: "apch",
  "4444": "ap4h",
};

/** H.264 constant-quality values the native encoder takes for each quality preset. */
export const NATIVE_CRF = { "very-low": 34, low: 28, medium: 23, high: 20, "very-high": 17 } as const;

/** Mediabunny's quality presets by name; the name travels to the export page. */
export const QUALITIES = {
  "very-low": QUALITY_VERY_LOW,
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  "very-high": QUALITY_VERY_HIGH,
} as const;
export type QualityName = keyof typeof QUALITIES;

/**
 * The container a file name asks for: .mp4, .webm, .mp3 or .wav, and .mov (ProRes) when the native encoder is on.
 * Anything else is an error that says what to use.
 */
export function containerOf(out: string, options: { readonly nativeEncode?: boolean } = {}): Container {
  const ext = /\.([a-z0-9]+)$/i.exec(out)?.[1]?.toLowerCase();
  if (ext === "mp4" || ext === "webm" || ext === "mp3" || ext === "wav") return ext;
  if (ext === "mov") {
    if (options.nativeEncode) return "mov";
    throw new Error(
      "a .mov (ProRes) is written only by the native encoder: set UBERSCENE_CODECS=native-encode, or export .mp4 (H.264) or .webm (VP9), which editors import too",
    );
  }
  throw new Error(`cannot write ${out}: use .mp4, .webm, .mp3 or .wav`);
}

export function outputFormat(
  container: Container,
): Mp4OutputFormat | WebMOutputFormat | MovOutputFormat | Mp3OutputFormat | WavOutputFormat {
  return container === "mp4"
    ? new Mp4OutputFormat()
    : container === "webm"
      ? new WebMOutputFormat()
      : container === "mov"
        ? new MovOutputFormat()
        : container === "mp3"
          ? new Mp3OutputFormat()
          : new WavOutputFormat();
}
