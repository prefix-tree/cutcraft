import { lookupAsset } from "../../manifest/types";
import type { Json } from "../../patches/types";
import type { Placement, ResolvedState } from "../../resolve/resolve";
import {
  define,
  insertNode,
  isError,
  makePropHandler,
  placementOf,
  placeNode,
  rawNode,
  requireElement,
  requireLayout,
  requireUnlocked,
  siblingAfter,
  uniqueId,
  validateTarget,
} from "../handler-kit";
import { type ActionInput, invalid, type NodeSpec, nodeOfSpec, nodeSpecOf, ok } from "../types";

define({
  type: "multicam/create",
  validate: (a, state) => {
    if (state.tree.byId.has(a.params.id)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` });
    const track = state.tracks.find((t) => t.id === a.params.trackId);
    if (!track)
      return invalid({
        code: "ELEMENT_NOT_FOUND",
        message: `track "${a.params.trackId}" does not exist`,
        path: "trackId",
      });
    return a.params.angles.length > 0
      ? ok
      : invalid({ code: "INVALID_PARAMS", message: "a multicam needs at least one angle" });
  },
  apply: (a, log, ctx) => {
    const props: Record<string, Json> = { id: a.params.id };
    if (a.params.sync !== undefined) props.sync = a.params.sync;
    placeNode(log, ctx.before, a.params.trackId, a.params.place, {
      id: a.params.id,
      kind: "multicam",
      props,
      children: a.params.angles.map((an) => ({ ...an, kind: "angle" })),
    });
  },
  invert: (a) => ({ type: "multicam/remove", params: { id: a.params.id } }),
  fold: () => [],
});

define({
  type: "multicam/remove",
  validate: (a, state) => {
    const item = requireElement(state, a.params.id);
    if (isError(item)) return invalid(item);
    const locked = requireUnlocked(state, item);
    if (locked) return invalid(locked);
    return item.kind === "multicam" ? ok : invalid({ code: "INVALID_PARAMS", message: "not a multicam" });
  },
  apply: (a, log) => log.append({ op: "remove", id: a.params.id }),
  invert: (a, before) => {
    const node = rawNode(before, a.params.id)!;
    return {
      type: "multicam/restore",
      params: {
        id: a.params.id,
        node: nodeSpecOf(node),
        trackId: node.parent as string,
        place: placementOf(before, a.params.id),
      },
    };
  },
  fold: () => [],
});

define({
  type: "multicam/restore",
  validate: (a, state) =>
    state.tree.byId.has(a.params.id) ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` }) : ok,
  apply: (a, log, ctx) => placeNode(log, ctx.before, a.params.trackId, a.params.place, a.params.node),
  invert: (a) => ({ type: "multicam/remove", params: { id: a.params.id } }),
  fold: () => [],
});

define(makePropHandler({
  type: "multicam/setActiveAngle",
  kinds: ["multicam"],
  write: (p) => ({ activeAngle: p.angle }),
  validate: (a, state) =>
    rawNode(state, a.params.angle)?.parent === a.params.id
      ? ok
      : invalid({ code: "ELEMENT_NOT_FOUND", message: `angle "${a.params.angle}" is not in this multicam` }),
}));

define({
  type: "multicam/addCut",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    if (state.tree.byId.has(a.params.cutId))
      return invalid({ code: "DUPLICATE_ID", message: `"${a.params.cutId}" exists` });
    if (rawNode(state, a.params.angle)?.parent !== a.params.id)
      return invalid({ code: "ELEMENT_NOT_FOUND", message: `angle "${a.params.angle}" is not in this multicam` });
    return a.params.at >= 0 ? ok : invalid({ code: "INVALID_TIME_RANGE", message: "cuts sit at or after 0" });
  },
  apply: (a, log, ctx) => {
    const node = rawNode(ctx.before, a.params.id)!;
    const cuts = node.children.filter((c) => c.kind === "cut");
    const after =
      cuts.filter((c) => Number(c.props.at) <= a.params.at).pop()?.id ??
      node.children.filter((c) => c.kind === "angle").pop()?.id ??
      null;
    log.append({
      op: "insert",
      id: a.params.cutId,
      parent: a.params.id,
      after,
      node: nodeOfSpec(
        { id: a.params.cutId, kind: "cut", props: { id: a.params.cutId, at: a.params.at, angle: a.params.angle } },
        a.params.id,
      ),
    });
  },
  invert: (a) => ({ type: "multicam/removeCut", params: { cutId: a.params.cutId } }),
  fold: () => [],
});

define(makePropHandler({
  type: "multicam/moveCut",
  target: (p) => p.cutId,
  kinds: ["cut"],
  write: (p) => ({ at: p.at }),
}));

define({
  type: "multicam/removeCut",
  validate: (a, state) =>
    rawNode(state, a.params.cutId)?.kind === "cut"
      ? ok
      : invalid({ code: "ELEMENT_NOT_FOUND", message: `cut "${a.params.cutId}" does not exist` }),
  apply: (a, log) => log.append({ op: "remove", id: a.params.cutId }),
  invert: (a, before) => {
    const node = rawNode(before, a.params.cutId)!;
    return {
      type: "multicam/restoreCut",
      params: { id: node.parent as string, node: nodeSpecOf(node), after: siblingAfter(before, a.params.cutId) },
    };
  },
  fold: () => [],
});

define({
  type: "multicam/restoreCut",
  validate: (a, state) =>
    state.tree.byId.has(a.params.node.id)
      ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.node.id}" exists` })
      : validateTarget(state, a.params.id, []),
  apply: (a, log) =>
    log.append({
      op: "insert",
      id: a.params.node.id,
      parent: a.params.id,
      after: a.params.after,
      node: nodeOfSpec({ ...a.params.node, kind: "cut" }, a.params.id),
    }),
  invert: (a) => ({ type: "multicam/removeCut", params: { cutId: a.params.node.id } }),
  fold: () => [],
});

/** Replace the multicam by one literal <Clip> per cut, each at the time and source range the cut resolved to. */
define({
  type: "multicam/flatten",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    const item = state.items.get(a.params.id) as Placement;
    if (item.kind !== "multicam")
      return invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is not a <Multicam>` });
    if (requireLayout(state, item, "free"))
      return invalid({
        code: "UNSUPPORTED_ON_LAYOUT",
        message: "flatten needs a free track: a sequence ignores a multicam's cut times, so convert the track first",
      });
    const clips = cutClips(state, a.params.id);
    if (clips.length === 0) return invalid({ code: "INVALID_PARAMS", message: "no cuts to flatten" });
    const children = (rawNode(state, a.params.id)?.children ?? [])
      .map((c) => state.items.get(c.id))
      .filter((p): p is Placement => Boolean(p));
    const broken = [...clips, ...children].find((p) => p.errors.length > 0);
    if (broken)
      return invalid({
        code: "INVALID_PARAMS",
        message: `"${broken.id}" has ${(broken.errors[0] as { code: string }).code}; fix it before flattening`,
      });
    const past = clips.find((p) => sourceLeft(state, p) <= 0);
    if (past) return invalid({ code: "INVALID_TIME_RANGE", message: `"${past.id}" starts past the end of its source` });
    return ok;
  },
  apply: (a, log, ctx) => {
    const state = ctx.before;
    const trackId = rawNode(state, a.params.id)?.parent as string;
    let after = siblingAfter(state, a.params.id);
    for (const spec of flattenedClips(state, a.params.id)) {
      insertNode(log, trackId, after, spec);
      after = spec.id;
    }
    log.append({ op: "remove", id: a.params.id });
  },
  invert: (a, before) => {
    const node = rawNode(before, a.params.id)!;
    return [
      ...flattenedClips(before, a.params.id).map(
        (spec): ActionInput => ({ type: "clip/remove", params: { id: spec.id } }),
      ),
      {
        type: "multicam/restore",
        params: {
          id: a.params.id,
          node: nodeSpecOf(node),
          trackId: node.parent as string,
          place: placementOf(before, a.params.id),
        },
      },
    ];
  },
  fold: () => [],
});

/** The clips the resolver generated for the multicam's cuts, in time order. */
function cutClips(state: ResolvedState, id: string): Placement[] {
  return [...state.items.values()]
    .filter((p) => p.parent === id && p.kind === "clip" && p.editable === "generated")
    .sort((x, y) => x.start - y.start);
}

function flattenedClips(state: ResolvedState, id: string): NodeSpec[] {
  const taken = new Set<string>();
  return cutClips(state, id).map((p) => {
    const cutId = p.id.startsWith(`${id}.`) ? p.id.slice(id.length + 1) : p.id;
    const clipId = uniqueId(state, `${id}-${cutId}`, taken);
    taken.add(clipId);
    // A cut runs to the next cut or the end of the composition; the literal clip cannot run past its source.
    const duration = Math.min(p.duration, sourceLeft(state, p));
    return {
      id: clipId,
      kind: "clip",
      props: { id: clipId, src: p.props.src as Json, in: p.source?.in ?? 0, duration, start: p.start },
      children: [],
    };
  });
}

function sourceLeft(state: ResolvedState, p: Placement): number {
  const asset = lookupAsset(state.manifest, String(p.props.src));
  return asset && asset.kind !== "image" ? asset.duration - (p.source?.in ?? 0) : Number.POSITIVE_INFINITY;
}
