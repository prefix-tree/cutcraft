import { capabilitiesOf } from "../../jsx/capabilities";
import { define, isError, placeNode, placementOf, placementProps, rawNode, requireElement, requireUnlocked, setProps, siblingAfter } from "../handler-kit";
import { invalid, nodeSpecOf, ok, type ActionError, type PlacementSpec } from "../types";

function placementErrors(state: Parameters<typeof rawNode>[0], trackId: string, place: PlacementSpec): ActionError | null {
  const track = state.tracks.find((t) => t.id === trackId);
  if (!track) return { code: "ELEMENT_NOT_FOUND", message: `track "${trackId}" does not exist`, path: "trackId" };
  if (track.locked) return { code: "TRACK_LOCKED", message: `track "${trackId}" is locked` };
  if ("start" in place && track.layout !== "free") return { code: "UNSUPPORTED_ON_LAYOUT", message: "start placement needs a free track; use after" };
  if ("after" in place && track.layout !== "sequence") return { code: "UNSUPPORTED_ON_LAYOUT", message: "after placement needs a sequence track; use start" };
  if ("after" in place && place.after !== null && !track.items.includes(place.after)) return { code: "ELEMENT_NOT_FOUND", message: `"${place.after}" is not on track "${trackId}"`, path: "place.after" };
  if ("anchor" in place && place.anchor !== "start" && !state.items.has(place.anchor)) return { code: "ELEMENT_NOT_FOUND", message: `anchor "${place.anchor}" does not exist`, path: "place.anchor" };
  return null;
}

/** A media element on a track: a <Clip> (picture and sound) or an <Audio> (sound only). */
function addMedia<T extends "clip/add" | "audio/add">(type: T, kind: "clip" | "audio") {
  define({
    type,
    validate: (a, state) => {
      if (state.tree.byId.has(a.params.id)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` });
      if (a.params.in !== undefined && a.params.out !== undefined && a.params.duration !== undefined) return invalid({ code: "INVALID_PARAMS", message: "give out or duration, not both" });
      const e = placementErrors(state, a.params.trackId, a.params.place);
      return e ? invalid(e) : ok;
    },
    apply: (a, log, ctx) => {
      const props: Record<string, never> = { id: a.params.id, src: a.params.src } as never;
      const p = props as Record<string, unknown>;
      if (a.params.in !== undefined) p.in = a.params.in;
      if (a.params.out !== undefined) p.out = a.params.out;
      if (a.params.duration !== undefined) p.duration = a.params.duration;
      placeNode(log, ctx.before, a.params.trackId, a.params.place, { id: a.params.id, kind, props, children: [] });
    },
    invert: (a) => ({ type: "clip/remove", params: { id: a.params.id } }),
    fold: () => [],
  });
}

addMedia("clip/add", "clip");
addMedia("audio/add", "audio");

define({
  type: "clip/remove",
  validate: (a, state) => {
    const item = requireElement(state, a.params.id);
    if (isError(item)) return invalid(item);
    const locked = requireUnlocked(state, item);
    if (locked) return invalid(locked);
    return capabilitiesOf(item.kind).placementScope === "track" ? ok : invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is not a track item` });
  },
  apply: (a, log) => log.append({ op: "remove", id: a.params.id }),
  invert: (a, before) => {
    const node = rawNode(before, a.params.id)!;
    return { type: "clip/restore", params: { id: a.params.id, node: nodeSpecOf(node), trackId: node.parent as string, place: placementOf(before, a.params.id) } };
  },
  fold: () => [],
});

define({
  type: "clip/restore",
  validate: (a, state) => {
    if (state.tree.byId.has(a.params.id)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` });
    const e = placementErrors(state, a.params.trackId, a.params.place);
    return e ? invalid(e) : ok;
  },
  apply: (a, log, ctx) => placeNode(log, ctx.before, a.params.trackId, a.params.place, a.params.node),
  invert: (a) => ({ type: "clip/remove", params: { id: a.params.id } }),
  fold: () => [],
});

/** Reorder within a sequence, change start on a free track, or re-anchor; optionally to another track. */
define({
  type: "clip/move",
  validate: (a, state) => {
    const item = requireElement(state, a.params.id);
    if (isError(item)) return invalid(item);
    const locked = requireUnlocked(state, item);
    if (locked) return invalid(locked);
    if (item.editable === "generated") return invalid({ code: "OPAQUE_TARGET", message: `"${a.params.id}" is generated; bake it first` });
    const trackId = a.params.trackId ?? item.track;
    if (!trackId) return invalid({ code: "INVALID_PARAMS", message: "element is not on a track" });
    if ("after" in a.params.place && a.params.place.after === a.params.id) return invalid({ code: "INVALID_PARAMS", message: "cannot place an element after itself" });
    const e = placementErrors(state, trackId, a.params.place);
    return e ? invalid(e) : ok;
  },
  apply: (a, log, ctx) => {
    const item = ctx.before.items.get(a.params.id)!;
    const trackId = a.params.trackId ?? (item.track as string);
    const place = a.params.place;
    if (trackId !== item.track || "after" in place) {
      const after = "after" in place ? place.after : lastOf(ctx.before, trackId, a.params.id);
      log.append({ op: "move", id: a.params.id, parent: trackId, after });
    }
    setProps(log, a.params.id, placementProps(place));
  },
  invert: (a, before) => {
    const node = rawNode(before, a.params.id)!;
    return { type: "clip/move", params: { id: a.params.id, trackId: node.parent as string, place: placementOf(before, a.params.id) } };
  },
  fold: () => [],
});

function lastOf(state: Parameters<typeof rawNode>[0], trackId: string, excluding: string): string | null {
  const track = rawNode(state, trackId);
  const children = (track?.children ?? []).filter((c) => c.id !== excluding);
  const last = children[children.length - 1];
  return last ? last.id : null;
}

export { siblingAfter };
