import { define, isError, makePropHandler, placeNode, placementOf, rawNode, requireElement, requireUnlocked, siblingAfter, stub, validateTarget } from "../handler-kit";
import { invalid, nodeOfSpec, nodeSpecOf, ok, type ActionInput } from "../types";
import type { Json } from "../../patches/types";

define({
  type: "multicam/create",
  validate: (a, state) => {
    if (state.tree.byId.has(a.params.id)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` });
    const track = state.tracks.find((t) => t.id === a.params.trackId);
    if (!track) return invalid({ code: "ELEMENT_NOT_FOUND", message: `track "${a.params.trackId}" does not exist`, path: "trackId" });
    return a.params.angles.length > 0 ? ok : invalid({ code: "INVALID_PARAMS", message: "a multicam needs at least one angle" });
  },
  apply: (a, log, ctx) => {
    const props: Record<string, Json> = { id: a.params.id };
    if (a.params.sync !== undefined) props.sync = a.params.sync;
    placeNode(log, ctx.before, a.params.trackId, a.params.place, { id: a.params.id, kind: "multicam", props, children: a.params.angles.map((an) => ({ ...an, kind: "angle" })) });
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
    return { type: "multicam/restore", params: { id: a.params.id, node: nodeSpecOf(node), trackId: node.parent as string, place: placementOf(before, a.params.id) } };
  },
  fold: () => [],
});

define({
  type: "multicam/restore",
  validate: (a, state) => (state.tree.byId.has(a.params.id) ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` }) : ok),
  apply: (a, log, ctx) => placeNode(log, ctx.before, a.params.trackId, a.params.place, a.params.node),
  invert: (a) => ({ type: "multicam/remove", params: { id: a.params.id } }),
  fold: () => [],
});

define(makePropHandler({
  type: "multicam/setActiveAngle",
  kinds: ["multicam"],
  write: (p) => ({ activeAngle: p.angle }),
  validate: (a, state) => (rawNode(state, a.params.angle)?.parent === a.params.id ? ok : invalid({ code: "ELEMENT_NOT_FOUND", message: `angle "${a.params.angle}" is not in this multicam` })),
}));

define({
  type: "multicam/addCut",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    if (state.tree.byId.has(a.params.cutId)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.cutId}" exists` });
    if (rawNode(state, a.params.angle)?.parent !== a.params.id) return invalid({ code: "ELEMENT_NOT_FOUND", message: `angle "${a.params.angle}" is not in this multicam` });
    return a.params.at >= 0 ? ok : invalid({ code: "INVALID_TIME_RANGE", message: "cuts sit at or after 0" });
  },
  apply: (a, log, ctx) => {
    const node = rawNode(ctx.before, a.params.id)!;
    const cuts = node.children.filter((c) => c.kind === "cut");
    const after = cuts.filter((c) => Number(c.props.at) <= a.params.at).pop()?.id ?? node.children.filter((c) => c.kind === "angle").pop()?.id ?? null;
    log.append({ op: "insert", id: a.params.cutId, parent: a.params.id, after, node: nodeOfSpec({ id: a.params.cutId, kind: "cut", props: { id: a.params.cutId, at: a.params.at, angle: a.params.angle } }, a.params.id) });
  },
  invert: (a) => ({ type: "multicam/removeCut", params: { cutId: a.params.cutId } }),
  fold: () => [],
});

define(makePropHandler({ type: "multicam/moveCut", target: (p) => p.cutId, kinds: ["cut"], write: (p) => ({ at: p.at }) }));

define({
  type: "multicam/removeCut",
  validate: (a, state) => (rawNode(state, a.params.cutId)?.kind === "cut" ? ok : invalid({ code: "ELEMENT_NOT_FOUND", message: `cut "${a.params.cutId}" does not exist` })),
  apply: (a, log) => log.append({ op: "remove", id: a.params.cutId }),
  invert: (a, before) => {
    const node = rawNode(before, a.params.cutId)!;
    return { type: "multicam/restoreCut", params: { id: node.parent as string, node: nodeSpecOf(node), after: siblingAfter(before, a.params.cutId) } };
  },
  fold: () => [],
});

define({
  type: "multicam/restoreCut",
  validate: (a, state) => (state.tree.byId.has(a.params.node.id) ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.node.id}" exists` }) : validateTarget(state, a.params.id, [])),
  apply: (a, log) => log.append({ op: "insert", id: a.params.node.id, parent: a.params.id, after: a.params.after, node: nodeOfSpec({ ...a.params.node, kind: "cut" }, a.params.id) }),
  invert: (a) => ({ type: "multicam/removeCut", params: { cutId: a.params.node.id } }),
  fold: () => [],
});

/** Bake generated cut clips into literal <Clip>s. Needs the source tools; stubbed in the skeleton. */
stub("multicam/flatten",
  (a, state) => validateTarget(state, a.params.id, []),
  (a): ActionInput => ({ type: "source/setProps", params: { id: a.params.id, props: {} } }),
);
