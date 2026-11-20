// Where an asset plays on a resolved timeline: the rule the resolver places captions by, read from the state.
import { lookupAsset } from "../manifest/types";
import { type AssetPlay, assetPlay, sameAsset, type TimelineWord, timelineWords } from "../resolve/captions";
import type { Placement, ResolvedState } from "../resolve/resolve";

const children = (state: ResolvedState, p: Placement): Placement[] =>
  p.children.map((id) => state.items.get(id)).filter((c): c is Placement => c !== undefined);

/** The clips and audio on visible tracks that play an asset, in start order. */
export function playsOf(state: ResolvedState, asset: string): AssetPlay[] {
  const hidden = new Set(state.tracks.filter((t) => t.hidden).map((t) => t.id));
  const plays: AssetPlay[] = [];
  for (const p of state.items.values()) {
    if (!p.source || !sameAsset(p.source.asset, asset)) continue;
    if (p.kind !== "clip" && p.kind !== "audio") continue;
    if (p.track && hidden.has(p.track)) continue;
    plays.push(assetPlay({ id: p.id, start: p.start, source: p.source, children: children(state, p) }));
  }
  return plays.sort((a, b) => a.start - b.start);
}

/** The play of one clip or audio placement, or null for an element that plays no asset. */
export function playOf(state: ResolvedState, id: string): AssetPlay | null {
  const p = state.items.get(id);
  if (!p?.source || (p.kind !== "clip" && p.kind !== "audio")) return null;
  return assetPlay({ id: p.id, start: p.start, source: p.source, children: children(state, p) });
}

/** Every transcript word the timeline plays, at the time it plays, in timeline order. */
export function spokenWords(state: ResolvedState): (TimelineWord & { readonly asset: string })[] {
  const assets = new Set<string>();
  for (const p of state.items.values())
    if (p.source && (p.kind === "clip" || p.kind === "audio")) assets.add(p.source.asset);
  const out: (TimelineWord & { asset: string })[] = [];
  for (const ref of assets) {
    const asset = lookupAsset(state.manifest, ref);
    if (!asset?.transcript) continue;
    for (const w of timelineWords(asset, playsOf(state, ref))) out.push({ ...w, asset: asset.id });
  }
  return out.sort((a, b) => a.start - b.start || a.i - b.i);
}
