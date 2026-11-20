import { rename, rm } from "node:fs/promises";
import { join, parse } from "node:path";

import { EncodedVideoPacketSource, FilePathTarget, Output } from "mediabunny";

import { framesUntil, nearestFrame, rateValue } from "@uberscene/kit/schema";
import type { MediaResolver } from "@uberscene/player/engine";
import type { AssetManifest, ResolvedState } from "@uberscene/sdk";

import { partialPath, writeAtomically } from "./atomic";
import { feedCopy, planCopy, type Run } from "./copy";
import {
  type Container,
  containerOf,
  NATIVE_CRF,
  NATIVE_VIDEO_CODECS,
  outputFormat,
  PRORES_FOURCC,
  PRORES_PROFILES,
  type QualityName,
  VIDEO_CODECS,
  type VideoCodec,
  type VideoContainer,
} from "./encoding";
import { type FontFile, loadFonts } from "./fonts";
import { AudioFeed, feedPackets, feedSegment, planSegments } from "./join";
import { type CodecModes, codecBinary, codecModes } from "./native/codecs";
import { encodePageMix, mixNatively, NativeSoundUnavailable, type SoundContainer } from "./native/soundtrack";
import { avcCodecString } from "./native/wire";
import { BrowserEngine } from "./web/engine";
import type { NativeEncodeOptions } from "./web/page/protocol";

export interface RenderOptions {
  readonly state: ResolvedState;
  /** The file the state came from: the export page loads it itself, as the editor does (`loadVideo` returns it). */
  readonly source: ExportSource;
  readonly media: MediaResolver;
  /** The file to write; its extension picks the container (.mp4, .webm, .mp3, .wav) unless `container` is given. */
  readonly out: string;
  readonly container?: Container;
  /** H.264 in MP4 and VP9 in WebM by default; AV1 in either. */
  readonly videoCodec?: VideoCodec;
  /** Bits per second; default about 0.1 bits per pixel per frame. */
  readonly bitrate?: number;
  /** One of the encoder's quality presets, in place of `bitrate`. */
  readonly quality?: QualityName;
  /** Seconds between keyframes; default 2. */
  readonly keyFrameInterval?: number;
  /** Render only this part of the composition, in composition seconds. */
  readonly from?: number;
  readonly to?: number;
  /** Fonts beyond the bundled ones and those the file declares, picked by a title's `font` prop. */
  readonly fonts?: readonly FontFile[];
  /** Pages of the browser that render pieces at the same time; default 1. */
  readonly tabs?: number;
  /**
   * Copy the encoded pictures of whole groups of pictures from the source where a cut shows nothing but a stretch of
   * one VP9 file (at the composition's size and frame rate, no overlay or effect), and render only the ends.
   */
  readonly smartCopy?: boolean;
  /**
   * A render for watching, not keeping: every second frame, each shown twice as long, at half the width and height,
   * at the encoder's `low` preset unless `bitrate` or `quality` is given. The length and the sound are unchanged.
   */
  readonly draft?: boolean;
  /** Skip the soundtrack. */
  readonly silent?: boolean;
  /** Audio bits per second; default 128 kbit/s. */
  readonly audioBitrate?: number;
  readonly onProgress?: (progress: { readonly frame: number; readonly frames: number }) => void;
  /** Seconds one frame may take before the export fails with the frame and the step it was in; default 60. */
  readonly frameTimeout?: number;
  readonly onLog?: (message: string) => void;
  readonly signal?: AbortSignal;
  /** What to do when an asset cannot be opened or decoded: stop (default) or draw the grey placeholder and go on. */
  readonly onAssetError?: "throw" | "continue";
}

/** The file an export loads in its page. */
export interface ExportSource {
  /** The cut file's source text. */
  readonly text: string;
  /** The file's own modules, by path from its folder (`gatherLocalFiles`). */
  readonly files?: Readonly<Record<string, string>>;
  readonly manifest: AssetManifest;
  readonly props?: Readonly<Record<string, unknown>>;
  /** A Chrome 157 binary (`CHROME_MILESTONE`, checked when it starts); default `UBERSCENE_CHROMIUM`, then Chrome for Testing from the cache. */
  readonly executablePath?: string;
}

export interface RenderResult {
  /** Pictures written: 0 for an MP3 or WAV. */
  readonly frames: number;
  /** Whether the file has an audio track. */
  readonly audio: boolean;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly wallMs: number;
  /** Pages that rendered pieces at once. */
  readonly tabs: number;
  /** Frames whose encoded pictures were copied from a source instead of rendered. */
  readonly copiedFrames: number;
  /** Who decoded the footage and encoded the pictures (`UBERSCENE_CODECS`). */
  readonly codecs: CodecModes;
  readonly warnings: readonly string[];
}

/** A draft draws one frame in this many, and writes its pictures at this fraction of the width and height. */
const DRAFT_FRAME_STEP = 2;
const DRAFT_SCALE = 0.5;

/** Where a draft of `out` is written: beside it, marked in its name, so a draft never replaces the video. */
export function draftPath(out: string): string {
  const { dir, name, ext } = parse(out);
  return join(dir, `${name}.draft${ext}`);
}

/** Opens the export page for a file: the browser, its fonts, and how many pages render at once. */
export async function openEngine(options: {
  readonly state: ResolvedState;
  readonly source: ExportSource;
  readonly media: MediaResolver;
  readonly fonts?: readonly FontFile[] | undefined;
  readonly tabs?: number | undefined;
  /** Effects a contact sheet may draw a frame without. */
  readonly disabled?: readonly string[] | undefined;
  readonly frameTimeout?: number | undefined;
  /** Who decodes and encodes; default what `UBERSCENE_CODECS` says. */
  readonly codecs?: CodecModes | undefined;
  readonly warnings: string[];
  readonly onLog?: ((message: string) => void) | undefined;
}): Promise<BrowserEngine> {
  // The file's fonts (`font()`, `googleFont()`), read here, Google's from the cache, and served to the page.
  const fonts = [...(await loadFonts(options.state.fonts, options.media)), ...(options.fonts ?? [])];
  return BrowserEngine.open({
    source: options.source.text,
    ...(options.source.files ? { files: options.source.files } : {}),
    manifest: options.source.manifest,
    media: options.media,
    ...(fonts.length ? { fonts } : {}),
    ...(options.source.props ? { props: options.source.props } : {}),
    ...(options.source.executablePath ? { executablePath: options.source.executablePath } : {}),
    ...(options.tabs ? { tabs: options.tabs } : {}),
    ...(options.frameTimeout ? { frameTimeout: options.frameTimeout } : {}),
    ...(options.disabled?.length ? { disabled: options.disabled } : {}),
    codecs: options.codecs ?? codecModes(),
    ...(options.onLog ? { log: options.onLog } : {}),
    warn: (m) => {
      if (!options.warnings.includes(m)) options.warnings.push(m);
    },
  });
}

/**
 * Exports the composition: the real Player draws every frame in headless Chrome, which encodes the pictures and the
 * soundtrack with WebCodecs; this process joins the pieces into the file.
 */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  const { state } = options;
  const draft = options.draft === true;
  if (draft && options.smartCopy) throw new Error("a draft renders every frame it shows: leave out the copy option");
  // What the file is written at. A draft counts in its own frames, half as many a second, and writes pictures half
  // as wide and as high; everything below counts frames at this rate.
  const baseRate = state.composition.rate;
  const outRate = draft ? { num: baseRate.num, den: baseRate.den * DRAFT_FRAME_STEP } : baseRate;
  const outFps = rateValue(outRate);
  const even = (n: number): number => Math.max(2, Math.round((n * DRAFT_SCALE) / 2) * 2);
  const outWidth = draft ? even(state.composition.width) : state.composition.width;
  const outHeight = draft ? even(state.composition.height) : state.composition.height;
  const codecs = codecModes();
  const nativeEncode = codecs.encode === "native";
  const container = options.container ?? containerOf(options.out, { nativeEncode });
  if (container === "mov" && !nativeEncode)
    throw new Error("a .mov (ProRes) is written only by the native encoder: set UBERSCENE_CODECS=native-encode");
  const audioOnly = container === "mp3" || container === "wav";
  if (audioOnly && draft) throw new Error(`a draft is of the picture: a .${container} file holds only the soundtrack`);
  if (audioOnly && options.silent) throw new Error(`nothing to render: a .${container} file holds only the soundtrack`);
  const videoContainer = (audioOnly ? "webm" : container) as VideoContainer;
  const codec = options.videoCodec ?? (videoContainer === "mp4" ? "avc" : videoContainer === "mov" ? "prores" : "vp9");
  if (!VIDEO_CODECS[videoContainer].includes(codec))
    throw new Error(
      `a .${videoContainer} file cannot hold ${codec} video; use ${VIDEO_CODECS[videoContainer].join(" or ")}`,
    );
  if (nativeEncode && !audioOnly && !NATIVE_VIDEO_CODECS.includes(codec))
    throw new Error(
      `the native encoder writes H.264 (.mp4) and ProRes (.mov), not ${codec}; unset UBERSCENE_CODECS for ${codec}`,
    );
  if (nativeEncode && options.smartCopy)
    throw new Error("the copy option copies VP9 and the native encoder writes H.264 and ProRes: leave one out");
  const from = Math.max(0, options.from ?? 0);
  const to = Math.min(state.composition.duration, options.to ?? state.composition.duration);
  const first = nearestFrame(from, outRate);
  const last = framesUntil(to, outRate);
  const total = Math.max(0, last - first);
  if (total === 0) throw new Error("nothing to render: the range holds no frames");
  const keyFrameInterval = options.keyFrameInterval ?? 2;
  const gopFrames = Math.max(1, Math.round(keyFrameInterval * outFps));
  const tabs = Math.max(1, Math.floor(options.tabs ?? 1));

  const warnings: string[] = [];
  const started = performance.now();
  const engine = await openEngine({ ...options, warnings, codecs });
  const partial = partialPath(options.out);
  let output: Output | null = null;
  let feed: AudioFeed | null = null;
  try {
    const audioBitrate = options.audioBitrate ?? 128_000;
    const soundtrack = options.silent
      ? null
      : // MP3 stays with the page's encoder: craft-audio writes no gapless (LAME) header yet, so its file starts late.
        nativeEncode && container !== "mp3"
        ? await nativeSoundtrack({
            engine,
            state,
            media: options.media,
            decode: codecs.decode,
            from,
            to,
            container: container as SoundContainer,
            bitrate: audioBitrate,
          })
        : await engine.audio({
            from,
            to,
            container: audioOnly ? container : videoContainer === "mov" ? "mp4" : videoContainer,
            bitrate: audioBitrate,
          });
    for (const w of soundtrack?.warnings ?? []) if (!warnings.includes(w)) warnings.push(w);
    if (audioOnly) {
      if (!soundtrack?.bytes) throw new Error("nothing to render: the composition has no sound in this range");
      await writeAtomically(options.out, soundtrack.bytes);
      return result(0, true, 0);
    }

    // Which frames are copied from the source, and how the rendered ones are cut into pieces for the pages.
    const copyPlan = options.smartCopy ? await planCopy({ state, media: options.media, codec, first, last }) : null;
    const runs: readonly Run[] = copyPlan?.runs ?? [{ kind: "render", first, last }];
    const pieces: Run[] = runs.flatMap((run) =>
      run.kind === "copy"
        ? [run]
        : planSegments(run.first, run.last, gopFrames, tabs).map((r): Run => ({ kind: "render", ...r })),
    );

    // Written beside the file and renamed over it once whole, so an export that fails keeps the last good one. The
    // container was chosen from options.out above, not from this path.
    output = new Output({ format: outputFormat(videoContainer), target: new FilePathTarget(partial) });
    const video = new EncodedVideoPacketSource(codec);
    output.addVideoTrack(video, { frameRate: outFps });
    if (soundtrack?.bytes) {
      feed = await AudioFeed.open(soundtrack.bytes);
      output.addAudioTrack(feed.source);
    }
    await output.start();
    // The sound is written a little ahead of the picture, so the two stay interleaved in the file. Both count seconds
    // from the start of the output.
    const ahead = async (seconds: number): Promise<void> => {
      await feed?.until(seconds + 0.5);
    };
    const bitrate = options.bitrate ?? Math.round(outWidth * outHeight * outFps * 0.1);
    const quality = options.quality ?? (draft && options.bitrate === undefined ? ("low" as const) : undefined);
    const native = nativeEncode ? nativeOptions(codec, bitrate, quality, options.bitrate !== undefined) : undefined;
    // Every page starts on a piece at once; the pieces are written in order as they finish.
    const request = (piece: { first: number; last: number }) => ({
      first: piece.first,
      last: piece.last,
      container: videoContainer,
      codec,
      bitrate,
      ...(quality ? { quality } : {}),
      keyFrameInterval,
      ...(draft ? { fps: outFps, rate: outRate, scale: DRAFT_SCALE } : {}),
      ...(native ? { native } : {}),
    });
    const rendered = pieces.map((piece) =>
      piece.kind === "copy" ? null : native ? engine.segmentNative(request(piece)) : engine.segment(request(piece)),
    );
    const nativeCodec = (config: Uint8Array): string =>
      native?.codec === "prores" ? PRORES_FOURCC[native.proresProfile ?? "hq"] : avcCodecString(config);
    for (const r of rendered) r?.catch(() => undefined);
    const config = { current: null as VideoDecoderConfig | null };
    let done = 0;
    for (const [i, piece] of pieces.entries()) {
      if (options.signal?.aborted) throw new Error("render aborted");
      if (piece.kind === "copy") {
        await feedCopy(piece, { source: video, fps: outFps, originFrame: first, config }, ahead);
      } else {
        const result = await (rendered[i] as Promise<unknown>);
        if (result instanceof Uint8Array)
          await feedSegment(result, { source: video, fps: outFps, offsetFrames: piece.first - first, config }, ahead);
        else {
          const encoded = result as Awaited<ReturnType<typeof engine.segmentNative>>;
          await feedPackets(
            encoded,
            {
              source: video,
              fps: outFps,
              offsetFrames: piece.first - first,
              config,
              codec: nativeCodec(encoded.config),
              width: outWidth,
              height: outHeight,
            },
            ahead,
          );
        }
      }
      done += piece.last - piece.first;
      options.onProgress?.({ frame: done, frames: total });
    }
    const failed = await engine.errors();
    if (failed.length > 0) {
      if (options.onAssetError !== "continue") throw new Error(`cannot render: ${failed.join("; ")}`);
      for (const f of failed) warnings.push(`asset error: ${f}`);
    }
    await feed?.until(Number.POSITIVE_INFINITY);
    await output.finalize();
    await rename(partial, options.out);
    return result(total, feed !== null, copyPlan?.copied ?? 0);
  } catch (error) {
    await output?.cancel().catch(() => undefined);
    await rm(partial, { force: true }).catch(() => undefined);
    throw error;
  } finally {
    feed?.dispose();
    await engine.close();
  }

  function result(frames: number, audio: boolean, copiedFrames: number): RenderResult {
    return {
      frames,
      audio,
      fps: outFps,
      width: outWidth,
      height: outHeight,
      wallMs: performance.now() - started,
      tabs,
      copiedFrames,
      codecs,
      warnings,
    };
  }
}

/** What the native encoder is asked for: H.264 at the export's bitrate (or a quality's CRF), or ProRes by quality. */
function nativeOptions(
  codec: VideoCodec,
  bitrate: number,
  quality: QualityName | undefined,
  bitrateGiven: boolean,
): NativeEncodeOptions {
  if (codec === "prores") return { codec: "prores", proresProfile: PRORES_PROFILES[quality ?? "high"] };
  if (quality && !bitrateGiven) return { codec: "h264", crf: NATIVE_CRF[quality], preset: "balanced" };
  return { codec: "h264", kbps: Math.max(1, Math.round(bitrate / 1000)), preset: "balanced" };
}

/**
 * The soundtrack of an export whose encoder is native, encoded by `uberscene-codec`: mixed in this process from the
 * native decoder's sound when decoding is native too, else (or when an asset's sound is one it cannot read) mixed in
 * the page and handed over as float PCM.
 */
async function nativeSoundtrack(o: {
  readonly engine: BrowserEngine;
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  readonly decode: CodecModes["decode"];
  readonly from: number;
  readonly to: number;
  readonly container: SoundContainer;
  readonly bitrate: number;
}): Promise<{ readonly bytes: Uint8Array | null; readonly warnings: readonly string[] }> {
  const binary = codecBinary();
  const warnings: string[] = [];
  if (o.decode === "native") {
    try {
      return await mixNatively({ binary, ...o });
    } catch (error) {
      if (!(error instanceof NativeSoundUnavailable)) throw error;
      warnings.push(`${error.message}: the page mixed the soundtrack`);
    }
  }
  const mix = await o.engine.audio({ from: o.from, to: o.to, container: "pcm", bitrate: o.bitrate });
  warnings.push(...mix.warnings);
  if (!mix.bytes) return { bytes: null, warnings };
  return {
    bytes: await encodePageMix({ binary, wav: mix.bytes, container: o.container, bitrate: o.bitrate }),
    warnings,
  };
}
