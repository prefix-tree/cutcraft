import { capabilitiesOf, type Placement, type ResolvedState, type ResolvedTrack } from "@cutcraft/kit";
import { ease } from "./keyframes";

export interface TransitionRole {
  readonly placement: Placement;
  readonly role: "out" | "in";
  /** 0..1 through the transition, eased by its curve. */
  readonly progress: number;
}

export interface VisibleItem {
  readonly placement: Placement;
  readonly track: ResolvedTrack;
  readonly children: readonly Placement[];
  readonly transition?: TransitionRole;
}

/** Visual, timed placements that show at `t`: tracks in document order (the first track is the bottom), items in track order. */
export function visiblePlacements(state: ResolvedState, t: number): VisibleItem[] {
  const out: VisibleItem[] = [];
  const tracks = [...state.tracks].sort((a, b) => a.order - b.order);
  for (const track of tracks) {
    if (track.hidden) continue;
    const roles = transitionRoles(state, track, t);
    for (const placement of trackItems(state, track)) {
      const caps = capabilitiesOf(placement.kind);
      if (!caps.visual || !caps.timed || placement.kind === "transition") continue;
      if (!isVisibleAt(placement, t, state.composition.duration)) continue;
      const role = roles.get(placement.id);
      out.push({
        placement,
        track,
        children: placement.children.map((id) => state.items.get(id)).filter((c): c is Placement => c !== undefined),
        ...(role ? { transition: role } : {}),
      });
    }
  }
  return out;
}

export function isVisibleAt(p: Placement, t: number, compositionDuration: number): boolean {
  if (t >= p.start && t < p.end) return true;
  return t === compositionDuration && p.end === t && p.end > p.start;
}

/** Placements that sit on a track, in track order; a multicam's generated clips follow their parent. */
export function trackItems(state: ResolvedState, track: ResolvedTrack): Placement[] {
  const out: Placement[] = [];
  for (const id of track.items) {
    const p = state.items.get(id);
    if (!p) continue;
    if (p.kind === "multicam") {
      const generated = [...state.items.values()]
        .filter((q) => q.parent === id && q.kind === "clip")
        .sort((a, b) => a.start - b.start);
      out.push(...generated);
      continue;
    }
    out.push(p);
  }
  return out;
}

function transitionRoles(state: ResolvedState, track: ResolvedTrack, t: number): Map<string, TransitionRole> {
  const roles = new Map<string, TransitionRole>();
  for (const id of track.items) {
    const x = state.items.get(id);
    if (x?.kind !== "transition" || x.duration <= 0) continue;
    if (t < x.start || t >= x.end) continue;
    const params = (x.props.params ?? {}) as Record<string, unknown>;
    const progress = ease(typeof params.curve === "string" ? params.curve : "linear", (t - x.start) / x.duration);
    if (x.between) {
      roles.set(x.between[0], { placement: x, role: "out", progress });
      roles.set(x.between[1], { placement: x, role: "in", progress });
    } else if (typeof x.props.on === "string") {
      roles.set(x.props.on, { placement: x, role: x.props.edge === "in" ? "in" : "out", progress });
    }
  }
  return roles;
}
