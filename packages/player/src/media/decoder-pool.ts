import { lookupAsset, type Placement, type ResolvedState } from "@cut/kit";
import { MOUNT_AHEAD_S, UNMOUNT_BEHIND_S } from "../constants";
import { trackItems } from "../model/visible";
import type { AssetSources } from "./asset-sources";
import { ClipDecoder } from "./clip-decoder";

/**
 * Keeps a ClipDecoder for every media placement near the play head and drops
 * the rest. Asset sources are shared through `AssetSources`, so nested
 * compositors handed the same registry never open an asset twice.
 */
export class DecoderPool {
  private readonly decoders = new Map<string, ClipDecoder>();
  private rate = 1;

  constructor(readonly sources: AssetSources) {}

  setRate(rate: number): void { this.rate = rate; }

  /** Mount decoders for placements within the window around `t`; unmount the rest. */
  sync(state: ResolvedState, t: number): void {
    const want = new Map<string, { p: Placement; children: Placement[] }>();
    for (const track of state.tracks) {
      if (track.hidden) continue;
      for (const p of trackItems(state, track)) {
        if (p.kind !== "clip" || !p.source) continue;
        const asset = lookupAsset(state.manifest, p.source.asset);
        if (!asset) continue;
        if (t < p.start - MOUNT_AHEAD_S || t >= p.end + UNMOUNT_BEHIND_S) continue;
        want.set(p.id, { p, children: p.children.map((id) => state.items.get(id)).filter((c): c is Placement => c !== undefined) });
      }
    }
    for (const [id, d] of this.decoders) {
      const w = want.get(id);
      if (!w || ClipDecoder.sourceKey(w.p) !== d.sourceKey) this.unmount(id);
      else if (w.p !== d.placement) d.update(w.p, w.children);
    }
    for (const [id, w] of want) {
      if (this.decoders.has(id)) continue;
      const { source } = this.sources.acquire(w.p.source!.asset);
      const d = new ClipDecoder(source, w.p, w.children, () => w.p.source!.speed * this.rate);
      this.decoders.set(id, d);
      void d.prime(Math.max(t, w.p.start));
    }
    this.sources.sweep();
  }

  decoderFor(id: string): ClipDecoder | undefined {
    return this.decoders.get(id);
  }

  get mounted(): string[] { return [...this.decoders.keys()]; }

  /** After a seek: every decoder jumps to `t`. */
  seekAll(t: number): Promise<void> {
    return Promise.all([...this.decoders.values()].map((d) => d.prime(Math.max(t, d.placement.start)))).then(() => undefined);
  }

  /** Resolves when every decoder has its first frame. */
  settle(): Promise<void> {
    return Promise.all([...this.decoders.values()].map((d) => d.ready)).then(() => undefined);
  }

  dispose(): void {
    for (const id of [...this.decoders.keys()]) this.unmount(id);
  }

  private unmount(id: string): void {
    const d = this.decoders.get(id);
    if (!d) return;
    d.dispose();
    this.decoders.delete(id);
    if (d.placement.source) this.sources.release(d.placement.source.asset);
  }
}
