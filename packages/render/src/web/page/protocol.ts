// What Node and the export page say to each other. Shared types only: no code runs from here.

/** Served as /job.json: what the page loads. */
export interface PageJob {
  /** The cut file's source text, evaluated with the kit's `loadModule` as the editor does. */
  readonly source: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly manifest: unknown;
  /** Every face the page sets text in, each served at its `url`: the file's own, read in Node, and `--font`. */
  readonly fonts: readonly PageFont[];
  /** Effects a sheet may draw a frame without: the page keeps a second state with these switched off. */
  readonly disabled?: readonly string[];
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
  readonly container: "mp4" | "webm";
  readonly codec: "avc" | "vp9" | "av1";
  readonly bitrate: number;
  /** A Mediabunny quality preset by name, in place of `bitrate`. */
  readonly quality?: "very-low" | "low" | "medium" | "high" | "very-high";
  /** Seconds between keyframes. */
  readonly keyFrameInterval: number;
}

/** The soundtrack of composition seconds [from, to), encoded for this container. */
export interface AudioRequest {
  readonly from: number;
  readonly to: number;
  readonly container: "mp4" | "webm" | "mp3" | "wav";
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

export interface SheetRequest {
  readonly cells: readonly SheetCell[];
  readonly columns: number;
  /** The width of a cell's picture, in pixels; its height follows the composition's shape. */
  readonly cellWidth: number;
  readonly type: "image/png" | "image/jpeg";
  /** Keep each cell's frame at full size too, for `frame(index)`. */
  readonly keepFrames?: boolean;
}

/** The size of a drawn sheet, and its bytes' length. */
export interface SheetResult {
  readonly length: number;
  readonly width: number;
  readonly height: number;
}

/** An overlay's ink at one moment, in composition pixels: what the layout check measures. */
export interface InkBounds {
  readonly id: string;
  readonly kind: string;
  readonly rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly parts: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[];
  /** On a track beneath the footage. */
  readonly backdrop: boolean;
}

/** `window.__cutcraft` once the page is ready. Byte results stay in the page until `read` takes them. */
export interface PageApi {
  readonly composition: {
    readonly width: number;
    readonly height: number;
    readonly fps: number;
    readonly duration: number;
  };
  readonly errors: readonly string[];
  /** Encodes frames [first, last) into a small container, timestamps from 0; returns its length in bytes. */
  segment(request: SegmentRequest): Promise<number>;
  /** Mixes and encodes the soundtrack; its bytes wait for `read`. */
  audio(request: AudioRequest): Promise<AudioResult>;
  /** Steps to `t` and measures the ink of each overlay and of the captions there. */
  bounds(t: number): Promise<readonly InkBounds[]>;
  /** Draws one frame as PNG or JPEG; returns its length in bytes. */
  still(t: number, type: "image/png" | "image/jpeg", quality?: number): Promise<number>;
  /** Draws every cell's frame onto one image, in rows, each with its label; its bytes wait for `read`. */
  sheet(request: SheetRequest): Promise<SheetResult>;
  /** Makes cell `index` of the last sheet (drawn with `keepFrames`) the result to `read`; returns its length. */
  frame(index: number): number;
  /** Base64 of the last result's bytes [offset, offset + length). */
  read(offset: number, length: number): string;
}
