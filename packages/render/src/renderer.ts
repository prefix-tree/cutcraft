import { writeFile } from "node:fs/promises";

import { EncodedVideoPacketSource, FilePathTarget, Output } from "mediabunny";

import type { AssetManifest, ResolvedState } from "@cutcraft/kit";
import { FRAME_EPS, type MediaResolver } from "@cutcraft/player/engine";

import { feedCopy, planCopy, type Run } from "./copy";
import {
  type Container,
  containerOf,
  outputFormat,
  type QualityName,
  VIDEO_CODECS,
  type VideoCodec,
  type VideoContainer,
} from "./encoding";
import { type FontFile, loadFonts } from "./fonts";
import { AudioFeed, feedSegment, planSegments } from "./join";
import { BrowserEngine } from "./web/engine";

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
  /** Skip the soundtrack. */
  readonly silent?: boolean;
  /** Audio bits per second; default 128 kbit/s. */
  readonly audioBitrate?: number;
  readonly onProgress?: (progress: { readonly frame: number; readonly frames: number }) => void;
  /** Progress while Chrome is being downloaded, on the first export. */
  readonly onLog?: (message: string) => void;
  readonly signal?: AbortSignal;
  /** What to do when an asset cannot be opened or decoded: stop (default) or draw the grey placeholder and go on. */
  readonly onAssetError?: "throw" | "continue";
}

/** The file an export loads in its page. */
export interface ExportSource {
  /** The cut file's source text. */
  readonly text: string;
  readonly manifest: AssetManifest;
  readonly props?: Readonly<Record<string, unknown>>;
  /** A Chrome or Chromium 153+ binary; default `CUTCRAFT_CHROMIUM`, then Chrome for Testing from the cache. */
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
  readonly warnings: readonly string[];
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
  readonly warnings: string[];
  readonly onLog?: ((message: string) => void) | undefined;
}): Promise<BrowserEngine> {
  // The file's fonts (`font()`, `googleFont()`), read here, Google's from the cache, and served to the page.
  const fonts = [...(await loadFonts(options.state.fonts, options.media)), ...(options.fonts ?? [])];
  return BrowserEngine.open({
    source: options.source.text,
    manifest: options.source.manifest,
    media: options.media,
    ...(fonts.length ? { fonts } : {}),
    ...(options.source.props ? { props: options.source.props } : {}),
    ...(options.source.executablePath ? { executablePath: options.source.executablePath } : {}),
    ...(options.tabs ? { tabs: options.tabs } : {}),
    ...(options.disabled?.length ? { disabled: options.disabled } : {}),
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
  const { fps, width, height } = state.composition;
  const container = options.container ?? containerOf(options.out);
  const audioOnly = container === "mp3" || container === "wav";
  if (audioOnly && options.silent) throw new Error(`nothing to render: a .${container} file holds only the soundtrack`);
  const videoContainer = (audioOnly ? "webm" : container) as VideoContainer;
  const codec = options.videoCodec ?? (videoContainer === "mp4" ? "avc" : "vp9");
  if (!VIDEO_CODECS[videoContainer].includes(codec))
    throw new Error(
      `a .${videoContainer} file cannot hold ${codec} video; use ${VIDEO_CODECS[videoContainer].join(" or ")}`,
    );
  const from = Math.max(0, options.from ?? 0);
  const to = Math.min(state.composition.duration, options.to ?? state.composition.duration);
  const first = Math.round(from * fps);
  const last = Math.ceil(to * fps - FRAME_EPS);
  const total = Math.max(0, last - first);
  if (total === 0) throw new Error("nothing to render: the range holds no frames");
  const keyFrameInterval = options.keyFrameInterval ?? 2;
  const gopFrames = Math.max(1, Math.round(keyFrameInterval * fps));
  const tabs = Math.max(1, Math.floor(options.tabs ?? 1));

  const warnings: string[] = [];
  const started = performance.now();
  const engine = await openEngine({ ...options, warnings });
  let output: Output | null = null;
  let feed: AudioFeed | null = null;
  try {
    const soundtrack = options.silent
      ? null
      : await engine.audio({
          from,
          to,
          container: audioOnly ? container : videoContainer,
          bitrate: options.audioBitrate ?? 128_000,
        });
    for (const w of soundtrack?.warnings ?? []) if (!warnings.includes(w)) warnings.push(w);
    if (audioOnly) {
      if (!soundtrack?.bytes) throw new Error("nothing to render: the composition has no sound in this range");
      await writeFile(options.out, soundtrack.bytes);
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

    output = new Output({ format: outputFormat(videoContainer), target: new FilePathTarget(options.out) });
    const video = new EncodedVideoPacketSource(codec);
    output.addVideoTrack(video, { frameRate: fps });
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
    // Every page starts on a piece at once; the pieces are written in order as they finish.
    const rendered = pieces.map((piece) =>
      piece.kind === "copy"
        ? null
        : engine.segment({
            first: piece.first,
            last: piece.last,
            container: videoContainer,
            codec,
            bitrate: options.bitrate ?? Math.round(width * height * fps * 0.1),
            ...(options.quality ? { quality: options.quality } : {}),
            keyFrameInterval,
          }),
    );
    for (const r of rendered) r?.catch(() => undefined);
    const config = { current: null as VideoDecoderConfig | null };
    let done = 0;
    for (const [i, piece] of pieces.entries()) {
      if (options.signal?.aborted) throw new Error("render aborted");
      if (piece.kind === "copy") {
        await feedCopy(piece, { source: video, fps, originFrame: first, config }, ahead);
      } else {
        const bytes = await (rendered[i] as Promise<Uint8Array>);
        await feedSegment(bytes, { source: video, fps, offsetFrames: piece.first - first, config }, ahead);
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
    return result(total, feed !== null, copyPlan?.copied ?? 0);
  } catch (error) {
    await output?.cancel().catch(() => undefined);
    throw error;
  } finally {
    feed?.dispose();
    await engine.close();
  }

  function result(frames: number, audio: boolean, copiedFrames: number): RenderResult {
    return {
      frames,
      audio,
      fps,
      width,
      height,
      wallMs: performance.now() - started,
      tabs,
      copiedFrames,
      warnings,
    };
  }
}
