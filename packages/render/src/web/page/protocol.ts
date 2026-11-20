// What Node and the export page say to each other. Shared types only: no code runs from here.

import type { Loudness } from "../../loudness";

/** Served as /job.json: what the page loads. */
export interface PageJob {
  /** The cut file's source text, evaluated with the kit's `loadModule` as the editor does. */
  readonly source: string;
  /** The file's own modules (`./blocks/chat-reveal`), by path from its folder, read in Node. */
  readonly files?: Readonly<Record<string, string>>;
  readonly props: Readonly<Record<string, unknown>>;
  readonly manifest: unknown;
  /** Every face the page sets text in, each served at its `url`: the file's own, read in Node, and `--font`. */
  readonly fonts: readonly PageFont[];
  /** Effects a sheet may draw a frame without: the page keeps a second state with these switched off. */
  readonly disabled?: readonly string[];
  /** The wall-clock time (ms since the epoch) the file's `Date` reads at composition time 0, the same on every page. */
  readonly startedAt: number;
  /** Milliseconds one frame may take before the page fails it. */
  readonly frameTimeout: number;
  /** "native": footage is decoded by the native codec process through `/native/frames` (`UBERSCENE_CODECS`). */
  readonly decoder?: "browser" | "native";
}

interface PageFont {
  readonly family: string;
  readonly weight: number;
  readonly style: "normal" | "italic";
  readonly url: string;
}

export interface SegmentRequest {
  readonly first: number;
  readonly last: number;
  readonly container: "mp4" | "webm" | "mov";
  readonly codec: "avc" | "vp9" | "av1" | "prores";
  readonly bitrate: number;
  /** A Mediabunny quality preset by name, in place of `bitrate`. */
  readonly quality?: "very-low" | "low" | "medium" | "high" | "very-high";
  /** Seconds between keyframes. */
  readonly keyFrameInterval: number;
  /**
   * Frames a second to draw and count `first` and `last` in, when not the composition's: a draft draws fewer, each
   * shown for longer.
   */
  readonly fps?: number;
  /** The same rate as an exact fraction; frame n is drawn at its first tick. */
  readonly rate?: { readonly num: number; readonly den: number };
  /** Encode each frame at this fraction of its width and height; a draft's pictures are smaller. */
  readonly scale?: number;
  /**
   * Encode with the native codec process instead of WebCodecs (`UBERSCENE_CODECS`): the page sends each picture to
   * `/native/encode` and `segment` returns the session whose packets Node reads.
   */
  readonly native?: NativeEncodeOptions;
}

/** What the native encoder is asked for, beside the size, rate and keyframe interval the request already gives. */
export interface NativeEncodeOptions {
  readonly codec: "h264" | "prores";
  readonly kbps?: number;
  readonly crf?: number;
  readonly preset?: "speed" | "balanced" | "quality";
  readonly proresProfile?: "proxy" | "lt" | "standard" | "hq" | "4444";
}

/** The soundtrack of composition seconds [from, to), encoded for this container. */
export interface AudioRequest {
  readonly from: number;
  readonly to: number;
  /** `pcm` is the mix itself, clamped, as a WAV of 32-bit float stereo: for the native encoder to encode. */
  readonly container: "mp4" | "webm" | "mp3" | "wav" | "pcm";
  /** Bits per second, for the codecs that take one. */
  readonly bitrate: number;
}

interface AudioResult {
  /** Bytes of the encoded soundtrack waiting to be read; 0 when there is no sound. */
  readonly length: number;
  /** The audio codec of those bytes, or null. */
  readonly codec: string | null;
  readonly warnings: readonly string[];
}

/** One cell of a contact sheet: a frame, and the words under it. */
export interface SheetCell {
  /** Composition seconds. */
  readonly t: number;
  readonly label: string;
  /** A second line under the label. */
  readonly sub?: string;
  /** Draw the frame without something: the job's `disabled` effects, or one DOM overlay by its id. */
  readonly without?: { readonly effects?: true; readonly overlay?: string };
}

/** The band under a cell's picture that holds its label, in pixels, and the colour behind both. */
export const TILE_BAND = 44;
export const TILE_GROUND = "#16161d";

export interface TilesRequest {
  readonly cells: readonly SheetCell[];
  /** The width of a cell's picture, in pixels; its height follows the composition's shape. */
  readonly cellWidth: number;
  /** Keep each cell's frame at full size too, for `frame(index)`. */
  readonly keepFrames?: boolean;
  /**
   * A safe zone, in composition pixels: each cell is measured, and drawn with what is outside the zone shaded and
   * an outline round each thing, red where it leaves the zone or the frame. `tileBounds(index)` has what was measured.
   */
  readonly zone?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** With `zone`: write each thing's id at its outline. Off for cells too small to read words on. */
  readonly labels?: boolean;
}

/** A picture of the sound of a stretch of the video, to go under a sheet's cells. */
export interface ListenRequest {
  /** Composition seconds. */
  readonly from: number;
  readonly to: number;
  /** The strip's width, in pixels. */
  readonly width: number;
  /** The words said in the stretch, at the times they are said. */
  readonly words: readonly { readonly text: string; readonly start: number; readonly end: number }[];
}

export interface ListenResult extends Loudness {
  /** Bytes of the strip, a PNG, waiting for `read`. */
  readonly length: number;
  readonly peakDb: number | null;
  readonly rmsDb: number | null;
  readonly silences: readonly (readonly [number, number])[];
}

/** The height of a sound strip, in pixels. */
export const LISTEN_HEIGHT = 132;

/** An overlay's ink at one moment, in composition pixels: what the layout check measures. */
export interface InkBounds {
  readonly id: string;
  readonly kind: string;
  readonly rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly parts: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[];
  /** On a track beneath the footage. */
  readonly backdrop: boolean;
  /** For a part (kind `part`): the id of the element whose code drew it. Its own id is `<that id>/<its name>`. */
  readonly of?: string;
}

export interface BoundsOptions {
  /** Also measure what an element's own code named with `data-name`, each as a part. */
  readonly parts?: boolean;
}

/** `window.__uberscene` once the page is ready. Byte results stay in the page until `read` takes them. */
export interface PageApi {
  readonly composition: {
    readonly width: number;
    readonly height: number;
    readonly fps: number;
    readonly rate: { readonly num: number; readonly den: number };
    readonly duration: number;
  };
  readonly errors: readonly string[];
  /** Frames captured after the browser never signalled their paint: each waited two animation frames instead. */
  readonly paintFallbacks: number;
  /**
   * Encodes frames [first, last) into a small container, timestamps from 0; returns its length in bytes. With
   * `native`, returns the native encode session instead.
   */
  segment(request: SegmentRequest): Promise<number | { readonly session: string }>;
  /** Mixes and encodes the soundtrack; its bytes wait for `read`. */
  audio(request: AudioRequest): Promise<AudioResult>;
  /** Steps to `t` and measures the ink of each overlay and of the captions there, and of named parts when asked. */
  bounds(t: number, options?: BoundsOptions): Promise<readonly InkBounds[]>;
  /** Draws one frame as PNG or JPEG; returns its length in bytes. */
  still(t: number, type: "image/png" | "image/jpeg", quality?: number): Promise<number>;
  /** Draws each cell as a tile: its frame scaled to the cell's width, with its label beneath. Returns how many. */
  tiles(request: TilesRequest): Promise<number>;
  /** Mixes a stretch as the export does and draws it: the waveform, a time scale and the words. */
  listen(request: ListenRequest): Promise<ListenResult>;
  /** Makes tile `index` of the last `tiles` call the result to `read`; returns its length. */
  tile(index: number): number;
  /** What was measured in cell `index` of the last `tiles` call that had a `zone`. */
  tileBounds(index: number): readonly InkBounds[];
  /** Makes the full frame of cell `index` (drawn with `keepFrames`) the result to `read`; returns its length. */
  frame(index: number): number;
  /** Base64 of the last result's bytes [offset, offset + length). */
  read(offset: number, length: number): string;
}
