// What Node and the export page say to each other. Shared types only: no code runs from here.

/** Served as /job.json: what the page loads. */
export interface PageJob {
  /** The cut file's source text, evaluated with the kit's `loadModule` as the editor does. */
  readonly source: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly manifest: unknown;
  /** Faces passed to the export beyond the manifest's (`--font`), each served at its `url`. */
  readonly fonts: readonly PageFont[];
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
  readonly codec: "avc" | "vp9";
  readonly bitrate: number;
  /** Seconds between keyframes. */
  readonly keyFrameInterval: number;
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
  /** Draws one frame as PNG or JPEG; returns its length in bytes. */
  still(t: number, type: "image/png" | "image/jpeg", quality?: number): Promise<number>;
  /** Base64 of the last result's bytes [offset, offset + length). */
  read(offset: number, length: number): string;
}
