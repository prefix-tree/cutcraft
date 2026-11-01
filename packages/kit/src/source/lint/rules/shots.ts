import { resolveTimeRef } from "../../../manifest/timeref";
import { lookupAsset, type AssetEntry } from "../../../manifest/types";
import type { ElementSite } from "../../index";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

/** Closer than this to a shot change, on the wrong side of it, a cut shows a few frames of the other shot. */
const NEAR_S = 0.3;
const NO_MARKERS: ReadonlyMap<string, number> = new Map();

const r2 = (t: number) => Math.round(t * 100) / 100;

/** The written `in`/`out` as source seconds: a number or a word/shot/silence reference; undefined when absent or unresolvable. */
function sourceTime(site: ElementSite, prop: "in" | "out", asset: AssetEntry): number | undefined {
  const p = site.props.get(prop);
  if (p === undefined) return undefined;
  const t = resolveTimeRef(p.literal, asset, NO_MARKERS, { id: site.id, prop });
  return typeof t === "number" ? t : undefined;
}

/** Clips that draw a picture, with their asset's shot list. */
function* cutClips(index: Parameters<Rule["check"]>[0], manifest: NonNullable<Parameters<Rule["check"]>[1]["manifest"]>, needShots = true) {
  for (const site of index.elements.values()) {
    if (site.kind !== "clip") continue;
    const src = site.props.get("src")?.literal;
    if (typeof src !== "string") continue;
    const asset = lookupAsset(manifest, src);
    if (asset && (!needShots || asset.shots?.length)) yield { site, asset, shots: asset.shots ?? [] };
  }
}

/** A cut a few frames off a source shot change: `in` just before one shows the previous shot first, `out` just after one shows the next shot last. */
export const cutNearShot: Rule = {
  name: "cut-near-shot",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    for (const { site, asset, shots } of cutClips(index, options.manifest)) {
      for (const prop of ["in", "out"] as const) {
        const p = site.props.get(prop);
        const t = sourceTime(site, prop, asset);
        if (!p || t === undefined) continue;
        for (const shot of shots) {
          const gap = prop === "in" ? shot.start - t : t - shot.start;
          if (gap <= 0 || gap >= NEAR_S || shot.i === 0) continue;
          const shown = prop === "in" ? `shot:${shot.i - 1} shows first` : `shot:${shot.i} shows last`;
          const use = prop === "in" ? `in="shot:${shot.i}"` : `out="shot:${shot.i - 1}.end"`;
          out.push({ rule: "cut-near-shot", severity: "warning", message: `"${site.id}.${prop}" = ${r2(t)} is ${r2(gap)} s ${prop === "in" ? "before" : "after"} shot:${shot.i} starts (${r2(shot.start)}); a flash of ${shown}; use ${use}`, range: p.range, id: site.id, prop });
        }
      }
    }
    return out;
  },
};

/** One crop over a source range that contains a shot change: the framing the crop was set for ends mid-clip. */
export const shotChangeInsideCrop: Rule = {
  name: "shot-change-inside-crop",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    for (const { site, asset, shots } of cutClips(index, options.manifest)) {
      const transform = site.props.get("transform");
      const literal = transform?.literal;
      if (!transform || literal === null || typeof literal !== "object" || Array.isArray(literal) || !("crop" in literal)) continue;
      const start = sourceTime(site, "in", asset) ?? 0;
      const end = sourceTime(site, "out", asset) ?? asset.duration;
      // A change within NEAR_S of either cut is cut-near-shot's to report.
      const inside = shots.filter((s) => s.start > start + NEAR_S && s.start < end - NEAR_S);
      if (inside.length === 0) continue;
      const names = inside.map((s) => `shot:${s.i} (${r2(s.start)})`).join(", ");
      out.push({ rule: "shot-change-inside-crop", severity: "warning", message: `"${site.id}" has one crop over ${r2(start)}–${r2(end)}, but the camera cuts inside it at ${names}; the framing changes there, so split the clip at the shot (out="shot:N.end", then in="shot:N+1") and crop each part`, range: transform.range, id: site.id, prop: "transform" });
    }
    return out;
  },
};

/** Two clips on one track playing overlapping stretches of the same asset: the same footage twice, usually a split that left the old line in. */
export const repeatedSource: Rule = {
  name: "repeated-source",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    const byTrack = new Map<string, { site: ElementSite; src: string; start: number; end: number }[]>();
    for (const { site, asset } of cutClips(index, options.manifest, false)) {
      const start = sourceTime(site, "in", asset) ?? 0;
      const end = sourceTime(site, "out", asset) ?? asset.duration;
      const list = byTrack.get(site.parent ?? "") ?? [];
      list.push({ site, src: asset.id, start, end });
      byTrack.set(site.parent ?? "", list);
    }
    for (const clips of byTrack.values()) {
      for (let i = 1; i < clips.length; i++) {
        const b = clips[i]!;
        const a = clips.slice(0, i).find((x) => x.src === b.src && Math.min(x.end, b.end) - Math.max(x.start, b.start) > 1);
        if (!a) continue;
        const from = Math.max(a.start, b.start);
        const to = Math.min(a.end, b.end);
        out.push({ rule: "repeated-source", severity: "warning", message: `"${b.site.id}" plays ${r2(from)}–${r2(to)} of ${b.src} again after "${a.site.id}" did; the same footage twice on one track is usually a split that kept the old clip. Remove one.`, range: b.site.range, id: b.site.id });
      }
    }
    return out;
  },
};
