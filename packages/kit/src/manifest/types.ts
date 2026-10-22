/**
 * What the ingest service knows about an asset. The model never sees pixels;
 * it edits against this, and the resolver turns `word:`/`shot:` references
 * into seconds with it.
 */
export interface AssetManifest {
  readonly assets: Readonly<Record<string, AssetEntry>>;
}

export interface AssetEntry {
  readonly id: string;
  readonly kind: "video" | "audio" | "image";
  /** Seconds. Images report 0 and may be held for any duration. */
  readonly duration: number;
  readonly fps?: number;
  readonly width?: number;
  readonly height?: number;
  readonly audio?: { readonly sampleRate: number; readonly channels: number; readonly streams: number };
  readonly transcript?: { readonly words: readonly TranscriptWord[] };
  readonly shots?: readonly Shot[];
  readonly silences?: readonly Silence[];
  readonly waveform?: WaveformSummary;
}

export interface TranscriptWord {
  readonly i: number;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly speaker?: string;
}

export interface Shot { readonly i: number; readonly start: number; readonly end: number }
export interface Silence { readonly i: number; readonly start: number; readonly end: number }

export interface WaveformSummary {
  readonly binSeconds: number;
  readonly peaks: readonly number[];
  readonly rms: readonly number[];
}

export const EMPTY_MANIFEST: AssetManifest = { assets: {} };

export function assetIdOf(ref: string): string {
  return ref.startsWith("asset:") ? ref.slice("asset:".length) : ref;
}

export function lookupAsset(manifest: AssetManifest, ref: string): AssetEntry | null {
  return manifest.assets[assetIdOf(ref)] ?? null;
}
