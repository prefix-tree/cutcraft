import type { AssetEntry } from "@cutcut/kit";

export interface PlayerErrorEvent {
  readonly id?: string;
  readonly asset?: string;
  readonly error: Error;
  readonly fatal: boolean;
}

export interface PlayerEvents {
  frameupdate: { readonly time: number; readonly frame: number };
  play: { readonly time: number };
  pause: { readonly time: number };
  seeked: { readonly time: number };
  ended: { readonly time: number };
  ratechange: { readonly rate: number };
  volumechange: { readonly volume: number; readonly muted: boolean };
  error: PlayerErrorEvent;
}

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type CreateCanvas = (width: number, height: number) => AnyCanvas;

/** Where an asset's bytes come from. `path` is a file on disk, for the Node renderer; browsers use `blob` or `url`. */
export type MediaHandle =
  | { readonly kind: "blob"; readonly blob: Blob }
  | { readonly kind: "url"; readonly url: string }
  | { readonly kind: "path"; readonly path: string };

export interface MediaResolver {
  resolve(assetId: string): Promise<MediaHandle>;
}

export interface FrameSourceInfo {
  readonly width: number;
  readonly height: number;
  readonly duration: number;
  readonly fps?: number;
  readonly decodable: boolean;
}

/** One decoded picture. Frames handed out by a source belong to the caller, who closes them. */
export interface Frame {
  readonly timestamp: number;
  readonly duration: number;
  readonly width: number;
  readonly height: number;
  draw(ctx: Ctx2D, dx: number, dy: number, dw: number, dh: number, crop?: { x: number; y: number; w: number; h: number }): void;
  /**
   * Optional fast path for a picture that covers the whole `width`×`height` canvas, untransformed, opaque and
   * normally blended: replace the canvas content with it and return true, or return false to be drawn with `draw`.
   */
  paintFull?(ctx: Ctx2D, width: number, height: number): boolean;
  /**
   * Makes the picture drawable, for a frame that defers work until it is drawn (the Node renderer converts decoded
   * pictures to RGBA only then). The compositor awaits it before painting the frame.
   */
  prepare?(): Promise<void>;
  /** A copy that outlives the source's pools and the original's `close()`. */
  retain(): Frame;
  close(): void;
}

export interface FrameSource {
  open(): Promise<FrameSourceInfo>;
  /** The last frame at or before `sourceTime`, or null before the first frame. */
  frameAt(sourceTime: number): Promise<Frame | null>;
  /** Frames from `from` (the frame covering it first) up to `to`, in order. */
  stream(from: number, to: number): AsyncGenerator<Frame, void, unknown>;
  close(): void;
}

export type FrameSourceFactory = (assetId: string, handle: MediaHandle, kind: AssetEntry["kind"]) => FrameSource;

export interface AudioSourceInfo {
  readonly sampleRate: number;
  readonly channels: number;
  readonly duration: number;
  readonly decodable: boolean;
}

export interface AudioSource {
  open(): Promise<AudioSourceInfo>;
  /** PCM for [from, to) as one buffer whose first sample is `from`. */
  range(from: number, to: number): Promise<AudioBuffer>;
  close(): void;
}

export type AudioSourceFactory = (assetId: string, handle: MediaHandle, context: BaseAudioContext) => AudioSource;

export interface Clock {
  /** Monotonic seconds. */
  now(): number;
}

export interface EnvelopePoint {
  /** Audio context seconds. */
  readonly at: number;
  readonly value: number;
}

export interface ScheduledSource {
  /** `${placementId}#${chunk}#${session}`. */
  readonly key: string;
  readonly buffer: AudioBuffer;
  /** Audio context seconds. */
  readonly when: number;
  readonly offset: number;
  readonly duration: number;
  /** The rate at `when`; `rate`, when set, automates it from there. */
  readonly playbackRate: number;
  readonly rate?: readonly EnvelopePoint[];
  readonly envelope: readonly EnvelopePoint[];
  readonly pan?: readonly EnvelopePoint[];
}

export interface AudioOutput {
  readonly contextTime: number;
  readonly running: boolean;
  schedule(src: ScheduledSource): void;
  /** Stop and disconnect every source whose key starts with `keyPrefix`. */
  cancel(keyPrefix: string): void;
  cancelAll(): void;
  setMaster(gain: number): void;
  resume(): Promise<void>;
}
