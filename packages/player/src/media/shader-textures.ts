// The pictures shaders read besides the element's own: an effect param that names an asset (`"asset:ID"`). A LUT
// (`.cube`) becomes a 3D table of colours, an image a 2D picture. Each is fetched through the media resolver once and
// kept; the compositor waits for the ones a frame needs before it paints.
import { type AssetManifest, assetIdOf, type CubeLut, lookupAsset, parseCube } from "@cutcraft/kit";

import type { ShaderPass } from "../model/shaders";
import type { MediaResolver } from "../types";

export type ShaderTexture =
  | {
      readonly kind: "3d";
      /** Entries per axis. */
      readonly size: number;
      /** size³ RGBA bytes, red fastest, over the input range 0..1. */
      readonly data: Uint8Array;
    }
  | { readonly kind: "2d"; readonly image: ImageBitmap };

/** The asset refs (`"asset:ID"`) among these effects' params. */
export function textureRefs(passes: readonly ShaderPass[] | undefined): string[] {
  const out: string[] = [];
  for (const pass of passes ?? [])
    for (const value of Object.values(pass.params))
      if (typeof value === "string" && value.startsWith("asset:")) out.push(value);
  return out;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The table sampled at `rgb` (in its own domain) by trilinear interpolation. */
function sample(lut: CubeLut, r: number, g: number, b: number, out: number[]): void {
  const n = lut.size - 1;
  const pos = [r, g, b].map((v, i) => {
    const t = clamp01(
      (v - (lut.domainMin[i] as number)) / ((lut.domainMax[i] as number) - (lut.domainMin[i] as number)),
    );
    return t * n;
  }) as [number, number, number];
  const lo = pos.map((p) => Math.min(Math.floor(p), n - 1)) as [number, number, number];
  const f = pos.map((p, i) => p - (lo[i] as number)) as [number, number, number];
  out[0] = out[1] = out[2] = 0;
  for (let corner = 0; corner < 8; corner++) {
    const dx = corner & 1,
      dy = (corner >> 1) & 1,
      dz = (corner >> 2) & 1;
    const w = (dx ? f[0] : 1 - f[0]) * (dy ? f[1] : 1 - f[1]) * (dz ? f[2] : 1 - f[2]);
    if (w === 0) continue;
    const at = (lo[0] + dx + (lo[1] + dy) * lut.size + (lo[2] + dz) * lut.size * lut.size) * 3;
    for (let c = 0; c < 3; c++) out[c] = (out[c] as number) + w * (lut.data[at + c] as number);
  }
}

/**
 * A LUT as RGBA bytes over inputs 0..1. A table whose domain is 0..1 is taken as it is; another is resampled onto 0..1
 * at the same size, so the shader never needs the domain.
 */
export function lutTexture(lut: CubeLut): ShaderTexture {
  const { size } = lut;
  const plain = lut.domainMin.every((v) => v === 0) && lut.domainMax.every((v) => v === 1);
  const data = new Uint8Array(size * size * size * 4);
  const rgb = [0, 0, 0];
  for (let i = 0; i < size * size * size; i++) {
    if (plain) {
      rgb[0] = lut.data[i * 3] as number;
      rgb[1] = lut.data[i * 3 + 1] as number;
      rgb[2] = lut.data[i * 3 + 2] as number;
    } else {
      const r = i % size,
        g = Math.floor(i / size) % size,
        b = Math.floor(i / (size * size));
      // Entry k of the new table is the input k / (size − 1), looked up where it falls in the table's domain.
      sample(lut, r / (size - 1), g / (size - 1), b / (size - 1), rgb);
    }
    for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.round(clamp01(rgb[c] as number) * 255);
    data[i * 4 + 3] = 255;
  }
  return { kind: "3d", size, data };
}

export class ShaderTextures {
  private readonly loaded = new Map<string, ShaderTexture>();
  private readonly loading = new Map<string, Promise<void>>();
  private readonly failed = new Map<string, Error>();

  constructor(
    private readonly media: MediaResolver,
    private readonly onError: (assetId: string, error: Error) => void = () => undefined,
  ) {}

  /** The texture of an asset ref, if loaded. */
  get(ref: string): ShaderTexture | undefined {
    return this.loaded.get(assetIdOf(ref) ?? ref);
  }

  /** Loads the textures these refs name that are not loaded yet; a ref that fails is reported once and skipped. */
  async load(manifest: AssetManifest, refs: readonly string[]): Promise<void> {
    await Promise.all(
      refs.map((ref) => {
        const id = assetIdOf(ref) ?? ref;
        if (this.loaded.has(id) || this.failed.has(id)) return undefined;
        let pending = this.loading.get(id);
        if (!pending) {
          pending = this.fetch(manifest, ref, id).then(
            (texture) => {
              this.loaded.set(id, texture);
            },
            (error: unknown) => {
              const e = error instanceof Error ? error : new Error(String(error));
              this.failed.set(id, e);
              this.onError(id, e);
            },
          );
          this.loading.set(id, pending);
        }
        return pending;
      }),
    );
  }

  private async fetch(manifest: AssetManifest, ref: string, id: string): Promise<ShaderTexture> {
    const asset = lookupAsset(manifest, ref);
    if (!asset) throw new Error(`asset ${ref} is not in the manifest`);
    const handle = await this.media.resolve(id);
    if (handle.kind === "path") throw new Error(`a browser cannot read the path ${handle.path}; give it a URL`);
    const blob = handle.kind === "blob" ? handle.blob : await (await fetch(handle.url)).blob();
    if (asset.kind === "lut") return lutTexture(parseCube(await blob.text()));
    if (asset.kind === "image") return { kind: "2d", image: await createImageBitmap(blob) };
    throw new Error(`asset ${ref} is a ${asset.kind}; a shader reads an image or a LUT`);
  }
}
